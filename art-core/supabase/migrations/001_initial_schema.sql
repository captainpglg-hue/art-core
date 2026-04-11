-- ============================================================
-- ART-CORE — Initial Schema
-- Migration 001: Full database schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Enums ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'collector', 'artist', 'gallery', 'scout', 'admin', 'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE artwork_status AS ENUM (
    'draft', 'pending_cert', 'certified', 'listed', 'auction',
    'available', 'sold', 'rented', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE artwork_category AS ENUM (
    'painting', 'sculpture', 'photography', 'digital', 'drawing',
    'printmaking', 'mixed_media', 'installation', 'video',
    'textile', 'ceramics', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pass_core_status AS ENUM (
    'active', 'certified', 'pending', 'locked', 'transferred', 'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'purchase', 'auction_win', 'rental', 'royalty',
    'scout_commission', 'platform_fee', 'refund', 'subscription'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'pro', 'elite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bet_status AS ENUM ('active', 'winning', 'outbid', 'won', 'lost', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auction_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recipient_type AS ENUM ('artist', 'scout', 'platform');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('fixed', 'auction', 'rental');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('active', 'sold', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rental_status AS ENUM ('active', 'overdue', 'returned', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── USERS (profiles synced from auth.users) ──────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  username          TEXT        UNIQUE NOT NULL,
  full_name         TEXT        NOT NULL DEFAULT '',
  role              TEXT        NOT NULL DEFAULT 'collector',
  avatar_url        TEXT,
  bio               TEXT,
  website           TEXT,
  phone             TEXT,
  stripe_account_id TEXT,
  stripe_customer_id TEXT,
  stripe_onboarded  BOOLEAN     NOT NULL DEFAULT FALSE,
  verified          BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  onboarded         BOOLEAN     NOT NULL DEFAULT FALSE,
  scout_points      INTEGER     NOT NULL DEFAULT 0,
  total_artworks    INTEGER     NOT NULL DEFAULT 0,
  total_sales       INTEGER     NOT NULL DEFAULT 0,
  total_purchases   INTEGER     NOT NULL DEFAULT 0,
  total_earned      NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USER ROLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        user_role_enum  NOT NULL,
  granted_by  UUID            REFERENCES public.users(id),
  granted_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, role)
);

-- ── ARTWORKS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artworks (
  id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT            NOT NULL,
  description           TEXT,
  artist_id             UUID            NOT NULL REFERENCES public.users(id),
  current_owner_id      UUID            NOT NULL REFERENCES public.users(id),
  status                artwork_status  NOT NULL DEFAULT 'draft',
  image_url             TEXT            NOT NULL DEFAULT '',
  image_preview_url     TEXT            NOT NULL DEFAULT '',
  image_public_id       TEXT            NOT NULL DEFAULT '',
  additional_images     TEXT[]          NOT NULL DEFAULT '{}',
  images                TEXT[]          NOT NULL DEFAULT '{}',
  year                  INTEGER,
  medium                TEXT,
  dimensions            TEXT,
  edition               TEXT,
  category              artwork_category,
  tags                  TEXT[]          NOT NULL DEFAULT '{}',
  style                 TEXT[]          NOT NULL DEFAULT '{}',
  price                 NUMERIC(12,2),
  currency              TEXT            NOT NULL DEFAULT 'EUR',
  rental_price_per_day  NUMERIC(12,2),
  reserve_price         NUMERIC(12,2),
  pass_core_id          UUID,
  pass_core_status      pass_core_status,
  previous_owners       TEXT[]          NOT NULL DEFAULT '{}',
  is_public             BOOLEAN         NOT NULL DEFAULT FALSE,
  is_for_sale           BOOLEAN         NOT NULL DEFAULT FALSE,
  is_for_rent           BOOLEAN         NOT NULL DEFAULT FALSE,
  is_for_auction        BOOLEAN         NOT NULL DEFAULT FALSE,
  demand_score          INTEGER,
  scout_id              UUID            REFERENCES public.users(id),
  views                 INTEGER         NOT NULL DEFAULT 0,
  favorites             INTEGER         NOT NULL DEFAULT 0,
  search_vector         TSVECTOR,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);

-- ── PASS_CORE (certificates) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pass_core (
  id                UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id        UUID            NOT NULL REFERENCES public.artworks(id),
  hash              TEXT            NOT NULL UNIQUE,
  tx_hash           TEXT,
  block_number      BIGINT,
  network           TEXT,
  contract_address  TEXT,
  token_id          TEXT,
  current_owner_id  UUID            NOT NULL REFERENCES public.users(id),
  previous_owner_id UUID            REFERENCES public.users(id),
  issued_by         UUID            NOT NULL REFERENCES public.users(id),
  status            pass_core_status NOT NULL DEFAULT 'pending',
  locked_at         TIMESTAMPTZ,
  transferred_at    TIMESTAMPTZ,
  qr_code_url       TEXT,
  verification_url  TEXT,
  transfer_history  JSONB           NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── PASS_CORE_CERTIFICATIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pass_core_certifications (
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
);

-- ── PASS_CORE_MESSAGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pass_core_messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_core_id UUID        NOT NULL REFERENCES public.pass_core(id) ON DELETE CASCADE,
  sender_id    UUID        REFERENCES public.users(id),
  sender_tag   TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── OWNERSHIP_HISTORY ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ownership_history (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id     UUID        NOT NULL REFERENCES public.artworks(id),
  from_user      UUID        REFERENCES public.users(id),
  to_user        UUID        NOT NULL REFERENCES public.users(id),
  transaction_id UUID,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID                NOT NULL REFERENCES public.users(id),
  plan                    subscription_plan   NOT NULL DEFAULT 'free',
  status                  subscription_status NOT NULL DEFAULT 'active',
  stripe_subscription_id  TEXT,
  stripe_price_id         TEXT,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at               TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  trial_end               TIMESTAMPTZ,
  max_artworks            INTEGER             NOT NULL DEFAULT 5,
  max_certifications      INTEGER             NOT NULL DEFAULT 1,
  featured_listings       INTEGER             NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ── TRANSACTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id                       UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                     transaction_type   NOT NULL,
  status                   transaction_status NOT NULL DEFAULT 'pending',
  artwork_id               UUID               REFERENCES public.artworks(id),
  buyer_id                 UUID               REFERENCES public.users(id),
  seller_id                UUID               REFERENCES public.users(id),
  amount                   NUMERIC(12,2)      NOT NULL,
  platform_fee             NUMERIC(12,2)      NOT NULL DEFAULT 0,
  artist_royalty           NUMERIC(12,2)      NOT NULL DEFAULT 0,
  scout_commission         NUMERIC(12,2)      NOT NULL DEFAULT 0,
  seller_net               NUMERIC(12,2)      NOT NULL DEFAULT 0,
  currency                 TEXT               NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  stripe_transfer_id       TEXT,
  metadata                 JSONB              NOT NULL DEFAULT '{}',
  notes                    TEXT,
  created_at               TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  completed_at             TIMESTAMPTZ
);

-- ── ROYALTIES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.royalties (
  id                 UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id     UUID           REFERENCES public.transactions(id),
  artwork_id         UUID           REFERENCES public.artworks(id),
  recipient_id       UUID           NOT NULL REFERENCES public.users(id),
  recipient_type     recipient_type NOT NULL,
  type               TEXT,
  amount             NUMERIC(12,2)  NOT NULL,
  currency           TEXT           NOT NULL DEFAULT 'EUR',
  rate               NUMERIC(5,4)   NOT NULL,
  stripe_transfer_id TEXT,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── AUCTIONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auctions (
  id                 UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id         UUID           NOT NULL REFERENCES public.artworks(id),
  seller_id          UUID           NOT NULL REFERENCES public.users(id),
  status             auction_status NOT NULL DEFAULT 'scheduled',
  start_price        NUMERIC(12,2)  NOT NULL,
  reserve_price      NUMERIC(12,2),
  current_bid        NUMERIC(12,2),
  current_bidder_id  UUID           REFERENCES public.users(id),
  bid_count          INTEGER        NOT NULL DEFAULT 0,
  currency           TEXT           NOT NULL DEFAULT 'EUR',
  starts_at          TIMESTAMPTZ    NOT NULL,
  ends_at            TIMESTAMPTZ    NOT NULL,
  extended_end       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── BETS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bets (
  id                       UUID       PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id               UUID       NOT NULL REFERENCES public.auctions(id),
  bidder_id                UUID       NOT NULL REFERENCES public.users(id),
  amount                   NUMERIC(12,2) NOT NULL,
  currency                 TEXT       NOT NULL DEFAULT 'EUR',
  status                   bet_status NOT NULL DEFAULT 'active',
  stripe_payment_method_id TEXT,
  stripe_setup_intent_id   TEXT,
  ip_address               INET,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LISTINGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listings (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id      UUID           NOT NULL REFERENCES public.artworks(id),
  seller_id       UUID           NOT NULL REFERENCES public.users(id),
  auction_id      UUID           REFERENCES public.auctions(id),
  type            listing_type   NOT NULL DEFAULT 'fixed',
  price           NUMERIC(12,2)  NOT NULL,
  currency        TEXT           NOT NULL DEFAULT 'EUR',
  status          listing_status NOT NULL DEFAULT 'active',
  featured        BOOLEAN        NOT NULL DEFAULT FALSE,
  featured_until  TIMESTAMPTZ,
  affiliate_code  TEXT,
  views           INTEGER        NOT NULL DEFAULT 0,
  favorites       INTEGER        NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

-- ── SCOUTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scouts (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES public.users(id),
  commission_rate       NUMERIC(5,4) NOT NULL DEFAULT 0.02,
  total_artists_scouted INTEGER     NOT NULL DEFAULT 0,
  total_earnings        NUMERIC(12,2) NOT NULL DEFAULT 0,
  affiliate_code        TEXT        NOT NULL UNIQUE,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SCOUTED_ARTISTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scouted_artists (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  scout_id                UUID        NOT NULL REFERENCES public.scouts(id),
  artist_id               UUID        NOT NULL REFERENCES public.users(id),
  commission_rate         NUMERIC(5,4) NOT NULL DEFAULT 0.02,
  total_sales_generated   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_commission_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  contract_signed_at      TIMESTAMPTZ,
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scout_id, artist_id)
);

-- ── RENTALS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rentals (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id     UUID          NOT NULL REFERENCES public.artworks(id),
  renter_id      UUID          NOT NULL REFERENCES public.users(id),
  owner_id       UUID          NOT NULL REFERENCES public.users(id),
  listing_id     UUID          REFERENCES public.listings(id),
  status         rental_status NOT NULL DEFAULT 'active',
  daily_rate     NUMERIC(12,2) NOT NULL,
  total_amount   NUMERIC(12,2) NOT NULL,
  currency       TEXT          NOT NULL DEFAULT 'EUR',
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_paid   BOOLEAN       NOT NULL DEFAULT FALSE,
  start_date     DATE          NOT NULL,
  end_date       DATE          NOT NULL,
  returned_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── AFFILIATE_LINKS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  scout_id    UUID        NOT NULL REFERENCES public.users(id),
  code        TEXT        NOT NULL UNIQUE,
  artwork_id  UUID        REFERENCES public.artworks(id),
  clicks      INTEGER     NOT NULL DEFAULT 0,
  conversions INTEGER     NOT NULL DEFAULT 0,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  utm_source  TEXT,
  utm_medium  TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── FAVORITES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artwork_id UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, artwork_id)
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  data       JSONB       NOT NULL DEFAULT '{}',
  action_url TEXT,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ANONYMOUS_MESSAGES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.anonymous_messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID        REFERENCES public.users(id),
  recipient_id UUID        NOT NULL REFERENCES public.users(id),
  artwork_id   UUID        REFERENCES public.artworks(id),
  subject      TEXT,
  body         TEXT        NOT NULL,
  is_anonymous BOOLEAN     NOT NULL DEFAULT TRUE,
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_flagged   BOOLEAN     NOT NULL DEFAULT FALSE,
  flagged_at   TIMESTAMPTZ,
  flagged_by   UUID        REFERENCES public.users(id),
  parent_id    UUID        REFERENCES public.anonymous_messages(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SETTINGS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT        NOT NULL UNIQUE,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES public.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_artworks_artist_id    ON public.artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status       ON public.artworks(status);
CREATE INDEX IF NOT EXISTS idx_artworks_category     ON public.artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_is_public    ON public.artworks(is_public);
CREATE INDEX IF NOT EXISTS idx_artworks_owner        ON public.artworks(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_artworks_created_at   ON public.artworks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_views        ON public.artworks(views DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_search       ON public.artworks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_artworks_title_trgm   ON public.artworks USING gin(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pass_core_artwork     ON public.pass_core(artwork_id);
CREATE INDEX IF NOT EXISTS idx_pass_core_hash        ON public.pass_core(hash);
CREATE INDEX IF NOT EXISTS idx_pass_core_cert_aw     ON public.pass_core_certifications(artwork_id);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer    ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller   ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_artwork  ON public.transactions(artwork_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status   ON public.transactions(status);

CREATE INDEX IF NOT EXISTS idx_favorites_user        ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_artwork     ON public.favorites(artwork_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_bets_auction          ON public.bets(auction_id);

-- ── FULL TEXT SEARCH TRIGGER ──────────────────────────────────
CREATE OR REPLACE FUNCTION artworks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.medium, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS artworks_search_vector_update ON public.artworks;
CREATE TRIGGER artworks_search_vector_update
  BEFORE INSERT OR UPDATE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION artworks_search_vector_update();

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS artworks_updated_at ON public.artworks;
CREATE TRIGGER artworks_updated_at
  BEFORE UPDATE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS pass_core_updated_at ON public.pass_core;
CREATE TRIGGER pass_core_updated_at
  BEFORE UPDATE ON public.pass_core
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── USER CREATION TRIGGER (sync auth.users → public.users) ───
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── HELPER FUNCTIONS ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_primary_role(p_user_id UUID) RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_core           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_core_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_core_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;

-- Users: public read, own write
CREATE POLICY IF NOT EXISTS "users_public_read"
  ON public.users FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "users_own_write"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- Artworks: public read if is_public, owner full access
CREATE POLICY IF NOT EXISTS "artworks_public_read"
  ON public.artworks FOR SELECT USING (is_public = TRUE OR artist_id = auth.uid() OR current_owner_id = auth.uid());
CREATE POLICY IF NOT EXISTS "artworks_artist_insert"
  ON public.artworks FOR INSERT WITH CHECK (artist_id = auth.uid());
CREATE POLICY IF NOT EXISTS "artworks_owner_update"
  ON public.artworks FOR UPDATE USING (artist_id = auth.uid() OR current_owner_id = auth.uid());

-- Pass-Core: public read, owner/admin write
CREATE POLICY IF NOT EXISTS "pass_core_public_read"
  ON public.pass_core FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "pass_core_cert_public_read"
  ON public.pass_core_certifications FOR SELECT USING (TRUE);

-- Pass-Core messages: insert if authenticated
CREATE POLICY IF NOT EXISTS "pass_core_messages_read"
  ON public.pass_core_messages FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "pass_core_messages_insert"
  ON public.pass_core_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Transactions: own read only
CREATE POLICY IF NOT EXISTS "transactions_own_read"
  ON public.transactions FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Favorites: own only
CREATE POLICY IF NOT EXISTS "favorites_own"
  ON public.favorites FOR ALL USING (user_id = auth.uid());

-- Notifications: own only
CREATE POLICY IF NOT EXISTS "notifications_own"
  ON public.notifications FOR ALL USING (user_id = auth.uid());

-- Subscriptions: own read
CREATE POLICY IF NOT EXISTS "subscriptions_own"
  ON public.subscriptions FOR SELECT USING (user_id = auth.uid());

-- ── INITIAL SETTINGS ──────────────────────────────────────────
INSERT INTO public.settings (key, value, description) VALUES
  ('platform_commission_rate', '0.10', 'Platform commission rate (10%)'),
  ('seller_net_rate',          '0.90', 'Seller net rate (90%)'),
  ('artist_royalty_rate',      '0.05', 'Artist royalty on resale (5%)'),
  ('scout_commission_rate',    '0.02', 'Scout commission rate (2%)'),
  ('min_artwork_price',        '50',   'Minimum artwork price in EUR'),
  ('max_certification_quality','100',  'Max quality score'),
  ('min_certification_quality','60',   'Minimum quality score for certification')
ON CONFLICT (key) DO NOTHING;
