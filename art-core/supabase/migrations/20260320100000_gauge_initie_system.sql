-- ============================================================
-- MIGRATION: Gauge + Initié + Prediction Markets System
-- Shared DB for ART-CORE / PASS-CORE / PRIME-CORE
-- ============================================================

-- ── New Enums ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE gauge_status AS ENUM ('open', 'locked', 'emptied', 'sold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prediction_type AS ENUM ('sale_delay', 'final_price');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prediction_status AS ENUM ('open', 'closed', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prediction_bet_outcome AS ENUM ('yes', 'no');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prediction_bet_status AS ENUM ('active', 'won', 'lost', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE promo_tool_type AS ENUM ('boost_search', 'featured_listing', 'badge_highlight', 'newsletter_spot', 'homepage_banner');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Add 'initie' and 'client' to user_role_enum ────────────
DO $$ BEGIN
  ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'initie';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'client';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Extend users table ─────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS points_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_initie BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initie_since TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_partner_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_points_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_commissions_earned BIGINT NOT NULL DEFAULT 0;

-- ── Extend artworks table ──────────────────────────────────
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS gauge_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS gauge_status gauge_status NOT NULL DEFAULT 'open';
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS gauge_locked_at TIMESTAMPTZ;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS sale_price BIGINT;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS days_to_sell INTEGER;
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS macro_photo_url TEXT;

-- ============================================================
-- TABLE: gauge_entries
-- Tracks each initié's point deposit on an artwork's gauge
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gauge_entries (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id  UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points      INTEGER     NOT NULL CHECK (points > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate entries per user per artwork? No — allow multiple deposits
  CONSTRAINT gauge_entries_valid CHECK (points > 0 AND points <= 100)
);

CREATE INDEX IF NOT EXISTS idx_gauge_entries_artwork ON public.gauge_entries(artwork_id);
CREATE INDEX IF NOT EXISTS idx_gauge_entries_user ON public.gauge_entries(user_id);

-- ============================================================
-- TABLE: gauge_history
-- Audit log: every gauge change (deposit, empty, lock, sale)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gauge_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id  UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL CHECK (action IN ('deposit', 'empty', 'lock', 'sale', 'commission_paid')),
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  points      INTEGER     NOT NULL DEFAULT 0,
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gauge_history_artwork ON public.gauge_history(artwork_id);

-- ============================================================
-- TABLE: point_transactions
-- Tracks all point movements (earn, spend, convert)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount      INTEGER     NOT NULL, -- positive = earn, negative = spend
  balance_after INTEGER   NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN (
    'welcome_bonus',      -- 15pts on bank signup
    'gauge_deposit',      -- spending points on gauge
    'gauge_refund',       -- if artwork removed before sale
    'sale_commission',    -- commission converted to points
    'commission_payout',  -- cash out commission (negative)
    'promo_purchase',     -- buying promo tools
    'bonus_conversion'    -- commission → points with bonus coefficient
  )),
  reference_id UUID,      -- artwork_id, promo_purchase_id, etc.
  details     JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON public.point_transactions(user_id);

-- ============================================================
-- TABLE: promo_tools
-- Available promotional tools in the shop
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_tools (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT            NOT NULL,
  description TEXT            NOT NULL,
  type        promo_tool_type NOT NULL,
  cost_points INTEGER         NOT NULL CHECK (cost_points > 0),
  duration_days INTEGER       NOT NULL DEFAULT 7,
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  icon        TEXT            NOT NULL DEFAULT 'zap',
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: promo_purchases
-- Promo tools purchased by users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_purchases (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  promo_tool_id UUID        NOT NULL REFERENCES public.promo_tools(id) ON DELETE RESTRICT,
  artwork_id    UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  points_spent  INTEGER     NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_purchases_artwork ON public.promo_purchases(artwork_id);

-- ============================================================
-- TABLE: predictions
-- PRIME-CORE prediction markets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.predictions (
  id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id      UUID              NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  type            prediction_type   NOT NULL,
  status          prediction_status NOT NULL DEFAULT 'open',

  -- Question
  question        TEXT              NOT NULL,
  -- e.g. "Vendue en moins de 30 jours ?" or "Vendue à plus de 5000 EUR ?"
  threshold_value BIGINT            NOT NULL, -- days for sale_delay, cents for final_price

  -- Odds (dynamically calculated)
  yes_pool        BIGINT            NOT NULL DEFAULT 0, -- total points bet on YES
  no_pool         BIGINT            NOT NULL DEFAULT 0, -- total points bet on NO
  total_bettors   INTEGER           NOT NULL DEFAULT 0,

  -- Resolution
  resolved_at     TIMESTAMPTZ,
  outcome         prediction_bet_outcome, -- null until resolved
  resolution_data JSONB             NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  closes_at       TIMESTAMPTZ       NOT NULL -- betting deadline
);

CREATE INDEX IF NOT EXISTS idx_predictions_artwork ON public.predictions(artwork_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON public.predictions(status);

-- ============================================================
-- TABLE: prediction_bets
-- Individual bets on prediction markets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prediction_bets (
  id            UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID                   NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  user_id       UUID                   NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  outcome       prediction_bet_outcome NOT NULL,
  points_bet    INTEGER                NOT NULL CHECK (points_bet > 0),
  status        prediction_bet_status  NOT NULL DEFAULT 'active',

  -- Payout
  points_won    INTEGER,
  payout_at     TIMESTAMPTZ,

  created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  UNIQUE(prediction_id, user_id) -- one bet per user per prediction
);

CREATE INDEX IF NOT EXISTS idx_prediction_bets_prediction ON public.prediction_bets(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_bets_user ON public.prediction_bets(user_id);

-- ============================================================
-- TABLE: messages
-- Buyer/seller messaging on ART-CORE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artwork_id   UUID        REFERENCES public.artworks(id) ON DELETE SET NULL,
  body         TEXT        NOT NULL,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_artwork ON public.messages(artwork_id);

-- ============================================================
-- TABLE: certification_attempts
-- PASS-CORE macro photo analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certification_attempts (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id       UUID        REFERENCES public.artworks(id) ON DELETE SET NULL,
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  macro_photo_url  TEXT        NOT NULL,
  analysis_result  JSONB       NOT NULL DEFAULT '{}',
  quality_score    INTEGER     NOT NULL DEFAULT 0,
  is_certified     BOOLEAN     NOT NULL DEFAULT FALSE,
  hash             TEXT,
  tx_hash          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed promo tools
-- ============================================================
INSERT INTO public.promo_tools (name, description, type, cost_points, duration_days, icon) VALUES
  ('Boost Recherche', 'Votre oeuvre apparait en priorite dans les recherches', 'boost_search', 10, 7, 'search'),
  ('Mise en Avant', 'Votre oeuvre est affichee en page d''accueil', 'featured_listing', 25, 3, 'star'),
  ('Badge Or', 'Un badge dore attire l''attention sur votre fiche', 'badge_highlight', 5, 14, 'award'),
  ('Newsletter', 'Votre oeuvre dans la newsletter hebdomadaire', 'newsletter_spot', 30, 1, 'mail'),
  ('Banniere Accueil', 'Grande banniere en haut de la marketplace', 'homepage_banner', 50, 1, 'layout')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Functions
-- ============================================================

-- Function: deposit points on gauge
CREATE OR REPLACE FUNCTION deposit_gauge_points(
  p_artwork_id UUID,
  p_user_id UUID,
  p_points INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_current_gauge INTEGER;
  v_new_gauge INTEGER;
  v_user_balance INTEGER;
  v_gauge_status gauge_status;
BEGIN
  -- Check user balance
  SELECT points_balance INTO v_user_balance FROM public.users WHERE id = p_user_id;
  IF v_user_balance < p_points THEN
    RETURN jsonb_build_object('error', 'insufficient_points', 'balance', v_user_balance);
  END IF;

  -- Check artwork gauge status
  SELECT gauge_points, gauge_status INTO v_current_gauge, v_gauge_status
  FROM public.artworks WHERE id = p_artwork_id;

  IF v_gauge_status != 'open' THEN
    RETURN jsonb_build_object('error', 'gauge_not_open', 'status', v_gauge_status::text);
  END IF;

  -- Calculate new gauge (cap at 100)
  v_new_gauge := LEAST(v_current_gauge + p_points, 100);
  IF v_new_gauge = v_current_gauge THEN
    RETURN jsonb_build_object('error', 'gauge_full');
  END IF;

  -- Actual points to deposit (might be less if gauge would overflow)
  p_points := v_new_gauge - v_current_gauge;

  -- Deduct user balance
  UPDATE public.users SET points_balance = points_balance - p_points WHERE id = p_user_id;

  -- Record entry
  INSERT INTO public.gauge_entries (artwork_id, user_id, points) VALUES (p_artwork_id, p_user_id, p_points);

  -- Update artwork gauge
  UPDATE public.artworks SET gauge_points = v_new_gauge,
    gauge_status = CASE WHEN v_new_gauge >= 100 THEN 'locked'::gauge_status ELSE 'open'::gauge_status END,
    gauge_locked_at = CASE WHEN v_new_gauge >= 100 THEN NOW() ELSE NULL END
  WHERE id = p_artwork_id;

  -- Record history
  INSERT INTO public.gauge_history (artwork_id, action, user_id, points, details)
  VALUES (p_artwork_id, 'deposit', p_user_id, p_points, jsonb_build_object('new_total', v_new_gauge));

  -- Record point transaction
  INSERT INTO public.point_transactions (user_id, amount, balance_after, type, reference_id)
  VALUES (p_user_id, -p_points, v_user_balance - p_points, 'gauge_deposit', p_artwork_id);

  RETURN jsonb_build_object(
    'success', true,
    'points_deposited', p_points,
    'new_gauge', v_new_gauge,
    'is_locked', v_new_gauge >= 100
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: artist empties gauge
CREATE OR REPLACE FUNCTION empty_gauge(
  p_artwork_id UUID,
  p_artist_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_current_gauge INTEGER;
  v_artist_id UUID;
BEGIN
  SELECT gauge_points, artist_id INTO v_current_gauge, v_artist_id
  FROM public.artworks WHERE id = p_artwork_id;

  IF v_artist_id != p_artist_id THEN
    RETURN jsonb_build_object('error', 'not_owner');
  END IF;

  IF v_current_gauge = 0 THEN
    RETURN jsonb_build_object('error', 'gauge_empty');
  END IF;

  -- Give points to artist
  UPDATE public.users SET points_balance = points_balance + v_current_gauge WHERE id = p_artist_id;

  -- Record point transaction for artist
  INSERT INTO public.point_transactions (user_id, amount, balance_after, type, reference_id)
  VALUES (p_artist_id, v_current_gauge,
    (SELECT points_balance FROM public.users WHERE id = p_artist_id),
    'gauge_refund', p_artwork_id);

  -- Reset gauge
  UPDATE public.artworks SET gauge_points = 0, gauge_status = 'emptied'::gauge_status WHERE id = p_artwork_id;

  -- History
  INSERT INTO public.gauge_history (artwork_id, action, user_id, points, details)
  VALUES (p_artwork_id, 'empty', p_artist_id, v_current_gauge,
    jsonb_build_object('points_recovered', v_current_gauge));

  RETURN jsonb_build_object('success', true, 'points_recovered', v_current_gauge);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: resolve sale — distribute commissions to initiés
CREATE OR REPLACE FUNCTION resolve_sale(
  p_artwork_id UUID,
  p_sale_price BIGINT,
  p_buyer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_entry RECORD;
  v_total_gauge INTEGER;
  v_commission_pool BIGINT;
  v_user_commission BIGINT;
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- Get total gauge
  SELECT gauge_points INTO v_total_gauge FROM public.artworks WHERE id = p_artwork_id;

  -- Commission pool = 5% of sale price (in cents)
  v_commission_pool := (p_sale_price * 5) / 100;

  -- Update artwork
  UPDATE public.artworks SET
    status = 'sold'::artwork_status,
    gauge_status = 'sold'::gauge_status,
    sale_price = p_sale_price,
    sold_at = NOW(),
    days_to_sell = EXTRACT(EPOCH FROM (NOW() - COALESCE(listed_at, created_at))) / 86400,
    current_owner_id = p_buyer_id
  WHERE id = p_artwork_id;

  -- Distribute commissions proportionally
  IF v_total_gauge > 0 THEN
    FOR v_entry IN
      SELECT user_id, SUM(points) as total_points
      FROM public.gauge_entries
      WHERE artwork_id = p_artwork_id
      GROUP BY user_id
    LOOP
      v_user_commission := (v_commission_pool * v_entry.total_points) / v_total_gauge;

      -- Credit user (in cents → converted to points with 1.5x bonus)
      UPDATE public.users SET
        total_commissions_earned = total_commissions_earned + v_user_commission,
        points_balance = points_balance + (v_user_commission / 100 * 15 / 10) -- 1.5x bonus
      WHERE id = v_entry.user_id;

      -- Record
      INSERT INTO public.point_transactions (user_id, amount, balance_after, type, reference_id, details)
      VALUES (v_entry.user_id, (v_user_commission / 100 * 15 / 10),
        (SELECT points_balance FROM public.users WHERE id = v_entry.user_id),
        'sale_commission', p_artwork_id,
        jsonb_build_object('commission_cents', v_user_commission, 'points_ratio', v_entry.total_points, 'total_gauge', v_total_gauge));

      v_results := v_results || jsonb_build_object(
        'user_id', v_entry.user_id,
        'points_invested', v_entry.total_points,
        'commission_cents', v_user_commission
      );
    END LOOP;
  END IF;

  -- History
  INSERT INTO public.gauge_history (artwork_id, action, points, details)
  VALUES (p_artwork_id, 'sale', v_total_gauge, jsonb_build_object(
    'sale_price', p_sale_price, 'buyer_id', p_buyer_id, 'commissions', v_results
  ));

  -- Resolve predictions
  UPDATE public.predictions SET
    status = 'resolved'::prediction_status,
    resolved_at = NOW(),
    resolution_data = jsonb_build_object('sale_price', p_sale_price, 'sold_at', NOW())
  WHERE artwork_id = p_artwork_id AND status = 'open';

  RETURN jsonb_build_object(
    'success', true,
    'commission_pool', v_commission_pool,
    'distributions', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
