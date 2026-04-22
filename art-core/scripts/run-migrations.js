#!/usr/bin/env node
/**
 * run-migrations.js v3
 * Envoie le schéma en blocs logiques ordonnés via Supabase Management API
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const PAT = 'sbp_85360682b077f687cb720a83ae40aff699010a0c';
const REF = 'kmmlwuwsahtzgzztcdaj';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 120000
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const parsed = (() => { try { return JSON.parse(d); } catch { return d; } })();
        resolve({ status: res.statusCode, data: parsed, raw: d });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    req.write(body);
    req.end();
  });
}

async function exec(sql, label, ignoreErrors = false) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(attempt === 0 ? 200 : 3000 * attempt);
    const { status, data, raw } = await runSQL(sql);
    if (status === 201 || status === 200) {
      console.log(`  ✅ ${label}`);
      return true;
    }
    if (status === 429) {
      console.log(`  ⏳ Rate limit, attente ${3 * (attempt+1)}s...`);
      continue;
    }
    const msg = typeof data === 'object' ? (data.message || raw) : raw;
    if (ignoreErrors || msg.includes('already exists') || msg.includes('duplicate') || msg.includes('42710') || msg.includes('42P07')) {
      console.log(`  ℹ️  ${label} — déjà existant`);
      return true;
    }
    console.error(`  ❌ ${label}`);
    console.error(`     ${msg.slice(0, 200)}`);
    return false;
  }
  return false;
}

async function main() {
  console.log('🚀 ART-CORE — Migration Runner v3');
  console.log('===================================\n');

  const { status } = await runSQL('SELECT 1');
  if (status !== 201) { console.error('❌ API inaccessible'); process.exit(1); }
  console.log('✅ API connectée\n');

  // ── BLOC 1 : Extensions ─────────────────────────────────────────────────
  console.log('📦 Extensions...');
  await exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, 'uuid-ossp');
  await exec(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`, 'pg_trgm');

  // ── BLOC 2 : Enums (tous en une fois) ───────────────────────────────────
  console.log('\n📦 Enums...');
  await exec(`
    DO $$ BEGIN CREATE TYPE user_role_enum AS ENUM ('collector','artist','gallery','scout','admin','super_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE artwork_status AS ENUM ('draft','pending_cert','certified','listed','auction','sold','rented','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE artwork_category AS ENUM ('painting','sculpture','photography','digital','drawing','printmaking','mixed_media','installation','video','textile','ceramics','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE pass_core_status AS ENUM ('active','locked','transferred','revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('purchase','auction_win','rental','royalty','scout_commission','platform_fee','refund','subscription'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE transaction_status AS ENUM ('pending','processing','completed','failed','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE subscription_plan AS ENUM ('free','starter','pro','elite'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE subscription_status AS ENUM ('active','past_due','cancelled','trialing'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE bet_status AS ENUM ('active','winning','outbid','won','lost','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE TYPE auction_status AS ENUM ('scheduled','live','ended','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `, 'Tous les enums', true);

  // ── BLOC 3 : Tables de base (sans FK entre elles) ───────────────────────
  console.log('\n📦 Table: users...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.users (
      id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email               TEXT        NOT NULL UNIQUE,
      username            TEXT        NOT NULL UNIQUE,
      full_name           TEXT        NOT NULL DEFAULT '',
      avatar_url          TEXT,
      bio                 TEXT,
      website             TEXT,
      phone               TEXT,
      stripe_account_id   TEXT,
      stripe_customer_id  TEXT,
      verified            BOOLEAN     NOT NULL DEFAULT FALSE,
      onboarding_done     BOOLEAN     NOT NULL DEFAULT FALSE,
      total_earned        BIGINT      NOT NULL DEFAULT 0,
      total_spent         BIGINT      NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'users');

  console.log('\n📦 Table: user_roles...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.user_roles (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      role        user_role_enum NOT NULL DEFAULT 'collector',
      granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      granted_by  UUID        REFERENCES public.users(id),
      UNIQUE(user_id, role)
    )
  `, 'user_roles');

  console.log('\n📦 Table: subscriptions...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.subscriptions (
      id                    UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id               UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      plan                  subscription_plan NOT NULL DEFAULT 'free',
      status                subscription_status NOT NULL DEFAULT 'active',
      stripe_subscription_id TEXT,
      current_period_start  TIMESTAMPTZ,
      current_period_end    TIMESTAMPTZ,
      cancel_at_period_end  BOOLEAN           NOT NULL DEFAULT FALSE,
      created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
    )
  `, 'subscriptions');

  console.log('\n📦 Table: artworks...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.artworks (
      id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
      owner_id              UUID            NOT NULL REFERENCES public.users(id),
      artist_id             UUID            NOT NULL REFERENCES public.users(id),
      title                 TEXT            NOT NULL,
      slug                  TEXT            UNIQUE,
      description           TEXT,
      medium                TEXT,
      year                  INTEGER,
      width_cm              NUMERIC(8,2),
      height_cm             NUMERIC(8,2),
      depth_cm              NUMERIC(8,2),
      weight_kg             NUMERIC(8,3),
      edition               TEXT,
      tags                  TEXT[]          DEFAULT '{}',
      category              artwork_category NOT NULL DEFAULT 'painting',
      status                artwork_status  NOT NULL DEFAULT 'draft',
      is_public             BOOLEAN         NOT NULL DEFAULT FALSE,
      is_for_sale           BOOLEAN         NOT NULL DEFAULT FALSE,
      is_for_rent           BOOLEAN         NOT NULL DEFAULT FALSE,
      price                 BIGINT,
      rental_price_per_day  BIGINT,
      image_url             TEXT,
      watermarked_url       TEXT,
      additional_images     TEXT[]          DEFAULT '{}',
      pass_core_id          UUID,
      views_count           INTEGER         NOT NULL DEFAULT 0,
      favorites_count       INTEGER         NOT NULL DEFAULT 0,
      search_vector         TSVECTOR,
      created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      published_at          TIMESTAMPTZ
    )
  `, 'artworks');

  console.log('\n📦 Table: pass_core...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.pass_core (
      id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
      artwork_id            UUID            NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
      current_owner_id      UUID            NOT NULL REFERENCES public.users(id),
      issuer_id             UUID            NOT NULL REFERENCES public.users(id),
      certificate_hash      TEXT            NOT NULL UNIQUE,
      blockchain_tx_hash    TEXT,
      blockchain_network    TEXT            NOT NULL DEFAULT 'simulation',
      metadata_uri          TEXT,
      status                pass_core_status NOT NULL DEFAULT 'active',
      locked_at             TIMESTAMPTZ,
      transferred_at        TIMESTAMPTZ,
      issued_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    )
  `, 'pass_core');

  console.log('\n📦 Table: transactions...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.transactions (
      id                      UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
      artwork_id              UUID                REFERENCES public.artworks(id),
      seller_id               UUID                REFERENCES public.users(id),
      buyer_id                UUID                REFERENCES public.users(id),
      type                    transaction_type    NOT NULL,
      status                  transaction_status  NOT NULL DEFAULT 'pending',
      amount                  BIGINT              NOT NULL,
      platform_fee            BIGINT              NOT NULL DEFAULT 0,
      seller_payout           BIGINT              NOT NULL DEFAULT 0,
      artist_royalty          BIGINT              NOT NULL DEFAULT 0,
      scout_commission        BIGINT              NOT NULL DEFAULT 0,
      stripe_payment_intent_id TEXT,
      stripe_transfer_id      TEXT,
      metadata                JSONB               DEFAULT '{}',
      created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
    )
  `, 'transactions (update)');

  console.log('\n📦 Table: royalties...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.royalties (
      id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      transaction_id  UUID        NOT NULL REFERENCES public.transactions(id),
      artist_id       UUID        NOT NULL REFERENCES public.users(id),
      artwork_id      UUID        NOT NULL REFERENCES public.artworks(id),
      amount          BIGINT      NOT NULL,
      rate            NUMERIC(5,4) NOT NULL DEFAULT 0.05,
      paid_at         TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'royalties');

  console.log('\n📦 Table: auctions...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.auctions (
      id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
      artwork_id      UUID            NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
      seller_id       UUID            NOT NULL REFERENCES public.users(id),
      status          auction_status  NOT NULL DEFAULT 'scheduled',
      reserve_price   BIGINT          NOT NULL DEFAULT 0,
      current_price   BIGINT          NOT NULL DEFAULT 0,
      winning_bid_id  UUID,
      starts_at       TIMESTAMPTZ     NOT NULL,
      ends_at         TIMESTAMPTZ     NOT NULL,
      created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    )
  `, 'auctions');

  console.log('\n📦 Table: bets...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.bets (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      auction_id  UUID        NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
      bidder_id   UUID        NOT NULL REFERENCES public.users(id),
      amount      BIGINT      NOT NULL,
      status      bet_status  NOT NULL DEFAULT 'active',
      placed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'bets');

  console.log('\n📦 Table: scouts...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.scouts (
      id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id             UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
      subscription_plan   subscription_plan NOT NULL DEFAULT 'free',
      total_scouted       INTEGER     NOT NULL DEFAULT 0,
      total_earned        BIGINT      NOT NULL DEFAULT 0,
      active_bets         INTEGER     NOT NULL DEFAULT 0,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'scouts');

  console.log('\n📦 Table: scouted_artists...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.scouted_artists (
      id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      scout_id                UUID        NOT NULL REFERENCES public.scouts(id) ON DELETE CASCADE,
      artist_id               UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      commission_rate         NUMERIC(6,4) NOT NULL DEFAULT 0.05,
      total_sales_generated   BIGINT      NOT NULL DEFAULT 0,
      total_commission_earned BIGINT      NOT NULL DEFAULT 0,
      contract_signed_at      TIMESTAMPTZ,
      is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(scout_id, artist_id)
    )
  `, 'scouted_artists');

  console.log('\n📦 Table: affiliate_links...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.affiliate_links (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      scout_id    UUID        NOT NULL REFERENCES public.scouts(id) ON DELETE CASCADE,
      artwork_id  UUID        REFERENCES public.artworks(id) ON DELETE SET NULL,
      code        TEXT        NOT NULL UNIQUE,
      clicks      INTEGER     NOT NULL DEFAULT 0,
      conversions INTEGER     NOT NULL DEFAULT 0,
      earnings    BIGINT      NOT NULL DEFAULT 0,
      expires_at  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'affiliate_links');

  console.log('\n📦 Table: listings...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.listings (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      artwork_id  UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
      seller_id   UUID        NOT NULL REFERENCES public.users(id),
      price       BIGINT      NOT NULL,
      is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'listings');

  console.log('\n📦 Table: rentals...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.rentals (
      id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      artwork_id      UUID        NOT NULL REFERENCES public.artworks(id),
      renter_id       UUID        NOT NULL REFERENCES public.users(id),
      owner_id        UUID        NOT NULL REFERENCES public.users(id),
      daily_rate      BIGINT      NOT NULL,
      starts_at       TIMESTAMPTZ NOT NULL,
      ends_at         TIMESTAMPTZ NOT NULL,
      total_amount    BIGINT      NOT NULL,
      status          TEXT        NOT NULL DEFAULT 'pending',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'rentals');

  console.log('\n📦 Table: favorites...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.favorites (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      artwork_id  UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, artwork_id)
    )
  `, 'favorites');

  console.log('\n📦 Table: notifications...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.notifications (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      type        TEXT        NOT NULL,
      title       TEXT        NOT NULL,
      body        TEXT,
      data        JSONB       DEFAULT '{}',
      read        BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'notifications');

  console.log('\n📦 Table: settings...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.settings (
      key         TEXT        PRIMARY KEY,
      value       JSONB       NOT NULL DEFAULT '{}',
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'settings');

  console.log('\n📦 Table: anonymous_messages...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.anonymous_messages (
      id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      artwork_id  UUID        REFERENCES public.artworks(id) ON DELETE SET NULL,
      sender_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
      recipient_id UUID       REFERENCES public.users(id) ON DELETE SET NULL,
      content     TEXT        NOT NULL,
      read        BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'anonymous_messages');

  console.log('\n📦 Table: certification_attempts...');
  await exec(`
    CREATE TABLE IF NOT EXISTS public.certification_attempts (
      id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      artwork_id      UUID        REFERENCES public.artworks(id) ON DELETE SET NULL,
      image_url       TEXT,
      phash           TEXT,
      duplicate_of    UUID        REFERENCES public.certification_attempts(id),
      status          TEXT        NOT NULL DEFAULT 'pending',
      metadata        JSONB       DEFAULT '{}',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, 'certification_attempts');

  // ── BLOC 4 : FK manquante sur artworks.pass_core_id ────────────────────
  console.log('\n📦 FK artworks → pass_core...');
  await exec(`
    DO $$ BEGIN
      ALTER TABLE public.artworks ADD CONSTRAINT fk_artworks_pass_core
        FOREIGN KEY (pass_core_id) REFERENCES public.pass_core(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `, 'FK artworks.pass_core_id', true);

  // ── BLOC 5 : Indexes ────────────────────────────────────────────────────
  console.log('\n📦 Indexes...');
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username)`,
    `CREATE INDEX IF NOT EXISTS idx_artworks_owner ON public.artworks(owner_id)`,
    `CREATE INDEX IF NOT EXISTS idx_artworks_artist ON public.artworks(artist_id)`,
    `CREATE INDEX IF NOT EXISTS idx_artworks_status ON public.artworks(status) WHERE is_public = TRUE`,
    `CREATE INDEX IF NOT EXISTS idx_artworks_category ON public.artworks(category)`,
    `CREATE INDEX IF NOT EXISTS idx_artworks_tags ON public.artworks USING GIN(tags)`,
    `CREATE INDEX IF NOT EXISTS idx_artworks_fts ON public.artworks USING GIN(search_vector)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_created ON public.transactions(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read)`,
  ];
  for (const idx of indexes) {
    await exec(idx, idx.match(/idx_\w+/)?.[0] || 'index', true);
    await sleep(300);
  }

  // ── BLOC 6 : Trigger search_vector ─────────────────────────────────────
  console.log('\n📦 Trigger search_vector...');
  await exec(`
    CREATE OR REPLACE FUNCTION public.artworks_search_vector_update()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.description, '') || ' ' ||
        coalesce(NEW.medium, '') || ' ' ||
        coalesce(array_to_string(NEW.tags, ' '), '')
      );
      RETURN NEW;
    END;
    $$
  `, 'function artworks_search_vector_update');
  await exec(`
    DROP TRIGGER IF EXISTS artworks_search_vector_trigger ON public.artworks;
    CREATE TRIGGER artworks_search_vector_trigger
      BEFORE INSERT OR UPDATE ON public.artworks
      FOR EACH ROW EXECUTE FUNCTION public.artworks_search_vector_update()
  `, 'trigger artworks_search_vector');

  // ── BLOC 7 : Trigger updated_at ────────────────────────────────────────
  console.log('\n📦 Trigger updated_at...');
  await exec(`
    CREATE OR REPLACE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$
  `, 'function handle_updated_at');

  const updatedAtTables = ['users','artworks','pass_core','transactions','scouts','listings','subscriptions','rentals'];
  for (const t of updatedAtTables) {
    await exec(`
      DROP TRIGGER IF EXISTS set_updated_at ON public.${t};
      CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.${t}
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()
    `, `trigger updated_at → ${t}`, true);
    await sleep(300);
  }

  // ── BLOC 8 : Trigger new user → users ──────────────────────────────────
  console.log('\n📦 Trigger auth → users...');
  await exec(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      INSERT INTO public.users (id, email, username, full_name, avatar_url)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'avatar_url'
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$
  `, 'function handle_new_user');
  await exec(`
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()
  `, 'trigger on_auth_user_created');

  // ── BLOC 9 : RLS ────────────────────────────────────────────────────────
  console.log('\n📦 RLS...');
  const rlsTables = ['users','artworks','pass_core','transactions','royalties','auctions','bets',
    'scouts','scouted_artists','affiliate_links','subscriptions','favorites','notifications',
    'rentals','listings','settings','anonymous_messages','certification_attempts'];
  for (const t of rlsTables) {
    await exec(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`, `RLS ${t}`, true);
    await sleep(200);
  }

  // Politiques de base
  console.log('\n📦 Politiques RLS...');
  await exec(`
    DROP POLICY IF EXISTS "users: read own" ON public.users;
    CREATE POLICY "users: read own" ON public.users FOR SELECT USING (auth.uid() = id)
  `, 'policy users:read', true);
  await exec(`
    DROP POLICY IF EXISTS "users: update own" ON public.users;
    CREATE POLICY "users: update own" ON public.users FOR UPDATE USING (auth.uid() = id)
  `, 'policy users:update', true);
  await exec(`
    DROP POLICY IF EXISTS "artworks: read public" ON public.artworks;
    CREATE POLICY "artworks: read public" ON public.artworks FOR SELECT USING (is_public = TRUE OR owner_id = auth.uid())
  `, 'policy artworks:read', true);
  await exec(`
    DROP POLICY IF EXISTS "artworks: insert owner" ON public.artworks;
    CREATE POLICY "artworks: insert owner" ON public.artworks FOR INSERT WITH CHECK (owner_id = auth.uid())
  `, 'policy artworks:insert', true);
  await exec(`
    DROP POLICY IF EXISTS "artworks: update owner" ON public.artworks;
    CREATE POLICY "artworks: update owner" ON public.artworks FOR UPDATE USING (owner_id = auth.uid())
  `, 'policy artworks:update', true);
  await exec(`
    DROP POLICY IF EXISTS "favorites: all own" ON public.favorites;
    CREATE POLICY "favorites: all own" ON public.favorites USING (user_id = auth.uid())
  `, 'policy favorites', true);
  await exec(`
    DROP POLICY IF EXISTS "notifications: read own" ON public.notifications;
    CREATE POLICY "notifications: read own" ON public.notifications FOR SELECT USING (user_id = auth.uid())
  `, 'policy notifications', true);
  await exec(`
    DROP POLICY IF EXISTS "certification_attempts: read own" ON public.certification_attempts;
    CREATE POLICY "certification_attempts: read own" ON public.certification_attempts FOR SELECT USING (user_id = auth.uid())
  `, 'policy certification_attempts:read', true);
  await exec(`
    DROP POLICY IF EXISTS "certification_attempts: insert own" ON public.certification_attempts;
    CREATE POLICY "certification_attempts: insert own" ON public.certification_attempts FOR INSERT WITH CHECK (user_id = auth.uid())
  `, 'policy certification_attempts:insert', true);

  // ── Vérification finale ─────────────────────────────────────────────────
  console.log('\n📊 Vérification...');
  const { data } = await runSQL(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tables = Array.isArray(data) ? data.map(r => r.table_name) : [];
  console.log(`\n✅ ${tables.length} tables créées :`);
  console.log(`   ${tables.join(', ')}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
