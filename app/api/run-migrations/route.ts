import { NextResponse } from "next/server";
import pg from "pg";

const MIGRATION_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().slice(-12) ?? "missing";
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const DATABASE_URL = (process.env.DATABASE_URL ?? "").trim();

const PROJECT_REF =
  SUPABASE_URL.match(/https?:\/\/([^.]+)\./)?.[1] ?? "";

/* ------------------------------------------------------------------ */
/* All migration SQL inlined — executed in order                      */
/* ------------------------------------------------------------------ */

const MIGRATION_BLOCKS: { name: string; statements: string[] }[] = [
  // ── 001 / 003 / initial — already applied (21 core tables exist) ──
  // We skip them — they are idempotent but very large.

  // ── phash + certification_attempts ─────────────────────────────
  {
    name: "20260319_phash_certification_attempts",
    statements: [
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS p_hash TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_artworks_p_hash ON public.artworks (p_hash) WHERE p_hash IS NOT NULL`,
      `CREATE TABLE IF NOT EXISTS public.certification_attempts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artwork_id      UUID REFERENCES public.artworks(id) ON DELETE CASCADE,
        owner_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
        status          TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'success', 'failed', 'duplicate')),
        p_hash          TEXT,
        image_sha256    TEXT,
        error_message   TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cert_attempts_artwork ON public.certification_attempts (artwork_id)`,
      `CREATE INDEX IF NOT EXISTS idx_cert_attempts_owner ON public.certification_attempts (owner_id)`,
      `ALTER TABLE public.certification_attempts ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN CREATE POLICY "Users see own certification attempts" ON public.certification_attempts FOR SELECT USING (auth.uid() = owner_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE POLICY "Admins see all certification attempts" ON public.certification_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE POLICY "Service role inserts certification attempts" ON public.certification_attempts FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ],
  },

  // ── add is_winning to bets ─────────────────────────────────────
  {
    name: "20260320_add_is_winning_to_bets",
    statements: [
      `ALTER TABLE bets ADD COLUMN IF NOT EXISTS is_winning BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX IF NOT EXISTS idx_bets_auction_winning ON bets (auction_id, is_winning) WHERE is_winning = true`,
      `UPDATE bets b SET is_winning = true FROM (SELECT DISTINCT ON (auction_id) id FROM bets ORDER BY auction_id, amount DESC) winning WHERE b.id = winning.id`,
    ],
  },

  // ── gauge + initie + prediction markets ────────────────────────
  {
    name: "20260320_gauge_initie_system",
    statements: [
      // Enums
      `DO $$ BEGIN CREATE TYPE gauge_status AS ENUM ('open', 'locked', 'emptied', 'sold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE prediction_type AS ENUM ('sale_delay', 'final_price'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE prediction_status AS ENUM ('open', 'closed', 'resolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE prediction_bet_outcome AS ENUM ('yes', 'no'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE prediction_bet_status AS ENUM ('active', 'won', 'lost', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE TYPE promo_tool_type AS ENUM ('boost_search', 'featured_listing', 'badge_highlight', 'newsletter_spot', 'homepage_banner'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'initie'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'client'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

      // Extend users
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS points_balance INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_initie BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initie_since TIMESTAMPTZ`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_partner_id TEXT`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_points_earned INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_commissions_earned BIGINT NOT NULL DEFAULT 0`,

      // Extend artworks
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS gauge_points INTEGER NOT NULL DEFAULT 0`,
      `DO $$ BEGIN ALTER TABLE public.artworks ADD COLUMN gauge_status gauge_status NOT NULL DEFAULT 'open'; EXCEPTION WHEN duplicate_column THEN NULL; END $$`,
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS gauge_locked_at TIMESTAMPTZ`,
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS sale_price BIGINT`,
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ`,
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ`,
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS days_to_sell INTEGER`,
      `ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS macro_photo_url TEXT`,

      // gauge_entries
      `CREATE TABLE IF NOT EXISTS public.gauge_entries (
        id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        artwork_id  UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
        user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        points      INTEGER     NOT NULL CHECK (points > 0),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT gauge_entries_valid CHECK (points > 0 AND points <= 100)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_gauge_entries_artwork ON public.gauge_entries(artwork_id)`,
      `CREATE INDEX IF NOT EXISTS idx_gauge_entries_user ON public.gauge_entries(user_id)`,

      // gauge_history
      `CREATE TABLE IF NOT EXISTS public.gauge_history (
        id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        artwork_id  UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
        action      TEXT        NOT NULL CHECK (action IN ('deposit', 'empty', 'lock', 'sale', 'commission_paid')),
        user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
        points      INTEGER     NOT NULL DEFAULT 0,
        details     JSONB       NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_gauge_history_artwork ON public.gauge_history(artwork_id)`,

      // point_transactions
      `CREATE TABLE IF NOT EXISTS public.point_transactions (
        id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        amount      INTEGER     NOT NULL,
        balance_after INTEGER   NOT NULL,
        type        TEXT        NOT NULL CHECK (type IN (
          'welcome_bonus', 'gauge_deposit', 'gauge_refund',
          'sale_commission', 'commission_payout', 'promo_purchase', 'bonus_conversion'
        )),
        reference_id UUID,
        details     JSONB       NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON public.point_transactions(user_id)`,

      // promo_tools
      `CREATE TABLE IF NOT EXISTS public.promo_tools (
        id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        TEXT            NOT NULL,
        description TEXT            NOT NULL,
        type        promo_tool_type NOT NULL,
        cost_points INTEGER         NOT NULL CHECK (cost_points > 0),
        duration_days INTEGER       NOT NULL DEFAULT 7,
        is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
        icon        TEXT            NOT NULL DEFAULT 'zap',
        created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
      )`,

      // promo_purchases
      `CREATE TABLE IF NOT EXISTS public.promo_purchases (
        id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        promo_tool_id UUID        NOT NULL REFERENCES public.promo_tools(id) ON DELETE RESTRICT,
        artwork_id    UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
        points_spent  INTEGER     NOT NULL,
        starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at    TIMESTAMPTZ NOT NULL,
        is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_promo_purchases_artwork ON public.promo_purchases(artwork_id)`,

      // predictions
      `CREATE TABLE IF NOT EXISTS public.predictions (
        id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
        artwork_id      UUID              NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
        type            prediction_type   NOT NULL,
        status          prediction_status NOT NULL DEFAULT 'open',
        question        TEXT              NOT NULL,
        threshold_value BIGINT            NOT NULL,
        yes_pool        BIGINT            NOT NULL DEFAULT 0,
        no_pool         BIGINT            NOT NULL DEFAULT 0,
        total_bettors   INTEGER           NOT NULL DEFAULT 0,
        resolved_at     TIMESTAMPTZ,
        outcome         prediction_bet_outcome,
        resolution_data JSONB             NOT NULL DEFAULT '{}',
        created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
        closes_at       TIMESTAMPTZ       NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_predictions_artwork ON public.predictions(artwork_id)`,
      `CREATE INDEX IF NOT EXISTS idx_predictions_status ON public.predictions(status)`,

      // prediction_bets
      `CREATE TABLE IF NOT EXISTS public.prediction_bets (
        id            UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
        prediction_id UUID                   NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
        user_id       UUID                   NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        outcome       prediction_bet_outcome NOT NULL,
        points_bet    INTEGER                NOT NULL CHECK (points_bet > 0),
        status        prediction_bet_status  NOT NULL DEFAULT 'active',
        points_won    INTEGER,
        payout_at     TIMESTAMPTZ,
        created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
        UNIQUE(prediction_id, user_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_prediction_bets_prediction ON public.prediction_bets(prediction_id)`,
      `CREATE INDEX IF NOT EXISTS idx_prediction_bets_user ON public.prediction_bets(user_id)`,

      // messages
      `CREATE TABLE IF NOT EXISTS public.messages (
        id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        recipient_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        artwork_id   UUID        REFERENCES public.artworks(id) ON DELETE SET NULL,
        body         TEXT        NOT NULL,
        is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, is_read)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_artwork ON public.messages(artwork_id)`,

      // Seed promo tools
      `INSERT INTO public.promo_tools (name, description, type, cost_points, duration_days, icon) VALUES
        ('Boost Recherche', 'Votre oeuvre apparait en priorite dans les recherches', 'boost_search', 10, 7, 'search'),
        ('Mise en Avant', 'Votre oeuvre est affichee en page d''accueil', 'featured_listing', 25, 3, 'star'),
        ('Badge Or', 'Un badge dore attire l''attention sur votre fiche', 'badge_highlight', 5, 14, 'award'),
        ('Newsletter', 'Votre oeuvre dans la newsletter hebdomadaire', 'newsletter_spot', 30, 1, 'mail'),
        ('Banniere Accueil', 'Grande banniere en haut de la marketplace', 'homepage_banner', 50, 1, 'layout')
      ON CONFLICT DO NOTHING`,

      // Functions
      `CREATE OR REPLACE FUNCTION deposit_gauge_points(
        p_artwork_id UUID, p_user_id UUID, p_points INTEGER
      ) RETURNS JSONB AS $fn$
      DECLARE
        v_current_gauge INTEGER; v_new_gauge INTEGER;
        v_user_balance INTEGER; v_gauge_status gauge_status;
      BEGIN
        SELECT points_balance INTO v_user_balance FROM public.users WHERE id = p_user_id;
        IF v_user_balance < p_points THEN RETURN jsonb_build_object('error', 'insufficient_points', 'balance', v_user_balance); END IF;
        SELECT gauge_points, gauge_status INTO v_current_gauge, v_gauge_status FROM public.artworks WHERE id = p_artwork_id;
        IF v_gauge_status != 'open' THEN RETURN jsonb_build_object('error', 'gauge_not_open', 'status', v_gauge_status::text); END IF;
        v_new_gauge := LEAST(v_current_gauge + p_points, 100);
        IF v_new_gauge = v_current_gauge THEN RETURN jsonb_build_object('error', 'gauge_full'); END IF;
        p_points := v_new_gauge - v_current_gauge;
        UPDATE public.users SET points_balance = points_balance - p_points WHERE id = p_user_id;
        INSERT INTO public.gauge_entries (artwork_id, user_id, points) VALUES (p_artwork_id, p_user_id, p_points);
        UPDATE public.artworks SET gauge_points = v_new_gauge,
          gauge_status = CASE WHEN v_new_gauge >= 100 THEN 'locked'::gauge_status ELSE 'open'::gauge_status END,
          gauge_locked_at = CASE WHEN v_new_gauge >= 100 THEN NOW() ELSE NULL END
        WHERE id = p_artwork_id;
        INSERT INTO public.gauge_history (artwork_id, action, user_id, points, details) VALUES (p_artwork_id, 'deposit', p_user_id, p_points, jsonb_build_object('new_total', v_new_gauge));
        INSERT INTO public.point_transactions (user_id, amount, balance_after, type, reference_id) VALUES (p_user_id, -p_points, v_user_balance - p_points, 'gauge_deposit', p_artwork_id);
        RETURN jsonb_build_object('success', true, 'points_deposited', p_points, 'new_gauge', v_new_gauge, 'is_locked', v_new_gauge >= 100);
      END;
      $fn$ LANGUAGE plpgsql SECURITY DEFINER`,

      `CREATE OR REPLACE FUNCTION empty_gauge(
        p_artwork_id UUID, p_artist_id UUID
      ) RETURNS JSONB AS $fn$
      DECLARE v_current_gauge INTEGER; v_artist_id UUID;
      BEGIN
        SELECT gauge_points, artist_id INTO v_current_gauge, v_artist_id FROM public.artworks WHERE id = p_artwork_id;
        IF v_artist_id != p_artist_id THEN RETURN jsonb_build_object('error', 'not_owner'); END IF;
        IF v_current_gauge = 0 THEN RETURN jsonb_build_object('error', 'gauge_empty'); END IF;
        UPDATE public.users SET points_balance = points_balance + v_current_gauge WHERE id = p_artist_id;
        INSERT INTO public.point_transactions (user_id, amount, balance_after, type, reference_id)
        VALUES (p_artist_id, v_current_gauge, (SELECT points_balance FROM public.users WHERE id = p_artist_id), 'gauge_refund', p_artwork_id);
        UPDATE public.artworks SET gauge_points = 0, gauge_status = 'emptied'::gauge_status WHERE id = p_artwork_id;
        INSERT INTO public.gauge_history (artwork_id, action, user_id, points, details)
        VALUES (p_artwork_id, 'empty', p_artist_id, v_current_gauge, jsonb_build_object('points_recovered', v_current_gauge));
        RETURN jsonb_build_object('success', true, 'points_recovered', v_current_gauge);
      END;
      $fn$ LANGUAGE plpgsql SECURITY DEFINER`,

      `CREATE OR REPLACE FUNCTION resolve_sale(
        p_artwork_id UUID, p_sale_price BIGINT, p_buyer_id UUID
      ) RETURNS JSONB AS $fn$
      DECLARE v_entry RECORD; v_total_gauge INTEGER; v_commission_pool BIGINT; v_user_commission BIGINT; v_results JSONB := '[]'::jsonb;
      BEGIN
        SELECT gauge_points INTO v_total_gauge FROM public.artworks WHERE id = p_artwork_id;
        v_commission_pool := (p_sale_price * 5) / 100;
        UPDATE public.artworks SET status = 'sold'::artwork_status, gauge_status = 'sold'::gauge_status, sale_price = p_sale_price, sold_at = NOW(),
          days_to_sell = EXTRACT(EPOCH FROM (NOW() - COALESCE(listed_at, created_at))) / 86400, current_owner_id = p_buyer_id WHERE id = p_artwork_id;
        IF v_total_gauge > 0 THEN
          FOR v_entry IN SELECT user_id, SUM(points) as total_points FROM public.gauge_entries WHERE artwork_id = p_artwork_id GROUP BY user_id LOOP
            v_user_commission := (v_commission_pool * v_entry.total_points) / v_total_gauge;
            UPDATE public.users SET total_commissions_earned = total_commissions_earned + v_user_commission,
              points_balance = points_balance + (v_user_commission / 100 * 15 / 10) WHERE id = v_entry.user_id;
            INSERT INTO public.point_transactions (user_id, amount, balance_after, type, reference_id, details)
            VALUES (v_entry.user_id, (v_user_commission / 100 * 15 / 10),
              (SELECT points_balance FROM public.users WHERE id = v_entry.user_id),
              'sale_commission', p_artwork_id,
              jsonb_build_object('commission_cents', v_user_commission, 'points_ratio', v_entry.total_points, 'total_gauge', v_total_gauge));
            v_results := v_results || jsonb_build_object('user_id', v_entry.user_id, 'points_invested', v_entry.total_points, 'commission_cents', v_user_commission);
          END LOOP;
        END IF;
        INSERT INTO public.gauge_history (artwork_id, action, points, details)
        VALUES (p_artwork_id, 'sale', v_total_gauge, jsonb_build_object('sale_price', p_sale_price, 'buyer_id', p_buyer_id, 'commissions', v_results));
        UPDATE public.predictions SET status = 'resolved'::prediction_status, resolved_at = NOW(),
          resolution_data = jsonb_build_object('sale_price', p_sale_price, 'sold_at', NOW())
        WHERE artwork_id = p_artwork_id AND status = 'open';
        RETURN jsonb_build_object('success', true, 'commission_pool', v_commission_pool, 'distributions', v_results);
      END;
      $fn$ LANGUAGE plpgsql SECURITY DEFINER`,
    ],
  },

  // ── missing tables (enum fixes + 3 tables) ────────────────────
  {
    name: "20260323_missing_tables",
    statements: [
      `DO $$ BEGIN ALTER TYPE pass_core_status ADD VALUE IF NOT EXISTS 'pending'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TYPE pass_core_status ADD VALUE IF NOT EXISTS 'certified'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN ALTER TYPE artwork_status ADD VALUE IF NOT EXISTS 'available'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `CREATE TABLE IF NOT EXISTS public.pass_core_certifications (
        id           UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
        artwork_id   UUID             NOT NULL REFERENCES public.artworks(id),
        hash         TEXT             NOT NULL,
        tx_hash      TEXT,
        block_number BIGINT,
        network      TEXT,
        status       pass_core_status NOT NULL DEFAULT 'pending',
        certified_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.pass_core_messages (
        id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        pass_core_id UUID        NOT NULL REFERENCES public.pass_core(id) ON DELETE CASCADE,
        sender_id    UUID        REFERENCES public.users(id),
        sender_tag   TEXT        NOT NULL,
        body         TEXT        NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS public.ownership_history (
        id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        artwork_id     UUID        NOT NULL REFERENCES public.artworks(id),
        from_user      UUID        REFERENCES public.users(id),
        to_user        UUID        NOT NULL REFERENCES public.users(id),
        transaction_id UUID,
        transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE public.pass_core_certifications ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE public.pass_core_messages ENABLE ROW LEVEL SECURITY`,
      `DO $$ BEGIN CREATE POLICY "pass_core_cert_public_read" ON public.pass_core_certifications FOR SELECT USING (TRUE); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE POLICY "pass_core_messages_read" ON public.pass_core_messages FOR SELECT USING (TRUE); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `DO $$ BEGIN CREATE POLICY "pass_core_messages_insert" ON public.pass_core_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `CREATE INDEX IF NOT EXISTS idx_pass_core_cert_aw ON public.pass_core_certifications(artwork_id)`,
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

async function checkTable(table: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: "count=exact",
      },
    },
  );
  return res.status >= 200 && res.status < 300;
}

/* ------------------------------------------------------------------ */
/* GET handler                                                        */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token !== MIGRATION_SECRET) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Add ?token=LAST_12_CHARS_OF_SERVICE_ROLE_KEY",
      },
      { status: 401 },
    );
  }

  const results: { step: string; status: string; error?: string }[] = [];

  // ── Connect to Postgres ──────────────────────────────────────
  let client: pg.Client | null = null;
  let connected = false;

  const dbPassword = DATABASE_URL.match(/:([^:@]+)@/)?.[1] ?? "";

  const connectionConfigs = [
    {
      label: "direct",
      config: {
        host: `db.${PROJECT_REF}.supabase.co`,
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      },
    },
    {
      label: "pooler-tx-eu-central-1",
      config: {
        host: `aws-0-eu-central-1.pooler.supabase.com`,
        port: 6543,
        database: "postgres",
        user: `postgres.${PROJECT_REF}`,
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      },
    },
    {
      label: "pooler-tx-eu-west-1",
      config: {
        host: `aws-0-eu-west-1.pooler.supabase.com`,
        port: 6543,
        database: "postgres",
        user: `postgres.${PROJECT_REF}`,
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      },
    },
    {
      label: "pooler-session-eu-central-1",
      config: {
        host: `aws-0-eu-central-1.pooler.supabase.com`,
        port: 5432,
        database: "postgres",
        user: `postgres.${PROJECT_REF}`,
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      },
    },
  ];

  for (const { label, config } of connectionConfigs) {
    try {
      client = new pg.Client(config);
      await client.connect();
      results.push({ step: `connect-${label}`, status: "success" });
      connected = true;
      break;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        step: `connect-${label}`,
        status: "failed",
        error: msg,
      });
      client = null;
    }
  }

  if (!connected || !client) {
    return NextResponse.json({
      message:
        "Could not connect to database. Check DATABASE_URL in env.",
      success: false,
      details: results,
      hint: `Paste SQL manually: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`,
    });
  }

  // ── Run all migration blocks ─────────────────────────────────
  let totalOk = 0;
  let totalErr = 0;

  for (const block of MIGRATION_BLOCKS) {
    for (let i = 0; i < block.statements.length; i++) {
      const stmt = block.statements[i];
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      try {
        await client.query(stmt);
        results.push({
          step: `${block.name}[${i + 1}/${block.statements.length}]`,
          status: "ok",
        });
        totalOk++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const lower = msg.toLowerCase();
        if (
          lower.includes("already exists") ||
          lower.includes("duplicate")
        ) {
          results.push({
            step: `${block.name}[${i + 1}/${block.statements.length}]`,
            status: "skipped (exists)",
          });
          totalOk++;
        } else {
          results.push({
            step: `${block.name}[${i + 1}/${block.statements.length}]`,
            status: "error",
            error: `${msg.split("\n")[0]} | SQL: ${preview}`,
          });
          totalErr++;
        }
      }
    }
  }

  await client.end();

  // ── Verify all tables via REST ───────────────────────────────
  const allTables = [
    "users", "artworks", "pass_core", "pass_core_certifications",
    "pass_core_messages", "ownership_history", "transactions",
    "royalties", "subscriptions", "bets", "auctions", "listings",
    "scouts", "scouted_artists", "rentals", "affiliate_links",
    "favorites", "notifications", "anonymous_messages", "settings",
    "user_roles", "gauge_entries", "gauge_history",
    "point_transactions", "promo_tools", "promo_purchases",
    "predictions", "prediction_bets", "messages",
    "certification_attempts",
  ];

  const tableStatus: { table: string; exists: boolean }[] = [];
  for (const t of allTables) {
    tableStatus.push({ table: t, exists: await checkTable(t) });
  }

  const existCount = tableStatus.filter((t) => t.exists).length;
  const missingTables = tableStatus
    .filter((t) => !t.exists)
    .map((t) => t.table);

  return NextResponse.json({
    message:
      missingTables.length === 0
        ? `All ${existCount} tables present. ${totalOk} statements OK, ${totalErr} errors.`
        : `${existCount}/${allTables.length} tables present. Missing: ${missingTables.join(", ")}`,
    success: totalErr === 0 && missingTables.length === 0,
    stats: { totalOk, totalErr, tablesPresent: existCount, tablesMissing: missingTables.length },
    missingTables,
    details: results,
  });
}
