-- ============================================================
-- ART-CORE ECOSYSTEM — SQL Schema (PROMPT 1)
-- Supabase PostgreSQL — Paste in SQL Editor and Run
-- Apps: PASS-CORE · ART-CORE · PRIME-CORE
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Enums ─────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_role_enum AS ENUM (
    'collector',
    'artist',
    'gallery',
    'scout',
    'admin',
    'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE artwork_status AS ENUM (
    'draft',
    'pending_cert',
    'certified',
    'listed',
    'auction',
    'sold',
    'rented',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE artwork_category AS ENUM (
    'painting', 'sculpture', 'photography', 'digital',
    'drawing', 'printmaking', 'mixed_media', 'installation',
    'video', 'textile', 'ceramics', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pass_core_status AS ENUM (
    'active',
    'locked',
    'transferred',
    'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'purchase',
    'auction_win',
    'rental',
    'royalty',
    'scout_commission',
    'platform_fee',
    'refund',
    'subscription'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM (
    'free',
    'starter',
    'pro',
    'elite'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active',
    'past_due',
    'cancelled',
    'trialing'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bet_status AS ENUM (
    'active',
    'winning',
    'outbid',
    'won',
    'lost',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE auction_status AS ENUM (
    'scheduled',
    'live',
    'ended',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE 1 — users
-- Extends auth.users — one row per authenticated user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL UNIQUE,
  username            TEXT        NOT NULL UNIQUE,
  full_name           TEXT        NOT NULL DEFAULT '',
  avatar_url          TEXT,
  bio                 TEXT,
  website             TEXT,
  phone               TEXT,

  -- Stripe
  stripe_account_id   TEXT,                          -- Connect express (sellers)
  stripe_customer_id  TEXT,                          -- Customer (buyers)

  -- KYC / onboarding
  verified            BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  onboarded           BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Stats (denormalized for fast reads)
  total_artworks      INTEGER     NOT NULL DEFAULT 0,
  total_sales         INTEGER     NOT NULL DEFAULT 0,
  total_purchases     INTEGER     NOT NULL DEFAULT 0,
  total_earned        BIGINT      NOT NULL DEFAULT 0, -- cents lifetime

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 2 — user_roles
-- Many-to-many: one user can hold multiple roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       user_role_enum NOT NULL,
  granted_by UUID          REFERENCES public.users(id) ON DELETE SET NULL, -- admin who granted
  granted_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, role)
);

-- ============================================================
-- TABLE 3 — artworks
-- Core asset — shared across all 3 apps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artworks (
  id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT           NOT NULL,
  description           TEXT,
  artist_id             UUID           NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status                artwork_status NOT NULL DEFAULT 'draft',

  -- Media (Cloudinary)
  image_url             TEXT           NOT NULL DEFAULT '',
  image_preview_url     TEXT           NOT NULL DEFAULT '', -- watermarked
  image_public_id       TEXT           NOT NULL DEFAULT '',
  additional_images     TEXT[]         NOT NULL DEFAULT '{}',

  -- Details
  year                  INTEGER,
  medium                TEXT,
  dimensions            TEXT,                       -- e.g. "80 × 60 cm"
  edition               TEXT,                       -- e.g. "1/1" or "3/10"
  category              artwork_category NOT NULL DEFAULT 'other',
  tags                  TEXT[]         NOT NULL DEFAULT '{}',
  style                 TEXT[]         NOT NULL DEFAULT '{}',

  -- Pricing (all amounts in cents EUR)
  price                 BIGINT,
  currency              TEXT           NOT NULL DEFAULT 'eur',
  rental_price_per_day  BIGINT,
  reserve_price         BIGINT,

  -- Pass-Core (set after certification)
  pass_core_id          UUID,                       -- FK added below
  pass_core_status      pass_core_status,

  -- Ownership
  current_owner_id      UUID           NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  previous_owners       UUID[]         NOT NULL DEFAULT '{}',

  -- Marketplace flags
  is_public             BOOLEAN        NOT NULL DEFAULT FALSE,
  is_for_sale           BOOLEAN        NOT NULL DEFAULT FALSE,
  is_for_rent           BOOLEAN        NOT NULL DEFAULT FALSE,
  is_for_auction        BOOLEAN        NOT NULL DEFAULT FALSE,

  -- Scout attribution
  scout_id              UUID           REFERENCES public.users(id) ON DELETE SET NULL,

  views                 INTEGER        NOT NULL DEFAULT 0,
  favorites             INTEGER        NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  published_at          TIMESTAMPTZ,

  -- Full-text search vector (GENERATED STORED — évite 42P17 sur l'index GIN)
  search_vector         TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig,
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(medium, '') || ' ' ||
      coalesce(array_to_string(tags, ' '), '')
    )
  ) STORED
);

-- ============================================================
-- TABLE 4 — pass_core
-- Blockchain certification — owned by Art-core LTD
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pass_core (
  id                UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id        UUID             NOT NULL UNIQUE REFERENCES public.artworks(id) ON DELETE RESTRICT,

  -- Blockchain data
  hash              TEXT             NOT NULL,        -- SHA-256 of metadata
  tx_hash           TEXT             NOT NULL,        -- on-chain tx
  block_number      BIGINT           NOT NULL DEFAULT 0,
  network           TEXT             NOT NULL DEFAULT 'simulation', -- polygon|base|simulation
  contract_address  TEXT,
  token_id          TEXT,

  -- Ownership
  current_owner_id  UUID             NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  previous_owner_id UUID             REFERENCES public.users(id) ON DELETE SET NULL,
  issued_by         UUID             NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT, -- Art-core LTD admin

  -- Status
  status            pass_core_status NOT NULL DEFAULT 'active',
  locked_at         TIMESTAMPTZ,
  transferred_at    TIMESTAMPTZ,

  -- Verification
  qr_code_url       TEXT,
  verification_url  TEXT             NOT NULL DEFAULT '',

  -- Transfer history (append-only JSONB log)
  transfer_history  JSONB            NOT NULL DEFAULT '[]',

  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- Forward FK: artworks.pass_core_id → pass_core.id
ALTER TABLE public.artworks
  ADD CONSTRAINT fk_artworks_pass_core
  FOREIGN KEY (pass_core_id) REFERENCES public.pass_core(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE 5 — subscriptions
-- Premium plans for artists, collectors, scouts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID                NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan                    subscription_plan   NOT NULL DEFAULT 'free',
  status                  subscription_status NOT NULL DEFAULT 'active',

  -- Stripe
  stripe_subscription_id  TEXT                UNIQUE,
  stripe_price_id         TEXT,

  -- Billing cycle
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at               TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  trial_end               TIMESTAMPTZ,

  -- Plan limits
  max_artworks            INTEGER             NOT NULL DEFAULT 5,   -- free=5, starter=25, pro=100, elite=-1
  max_certifications      INTEGER             NOT NULL DEFAULT 0,   -- free=0, starter=5, pro=25, elite=-1
  featured_listings       INTEGER             NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

  UNIQUE (user_id) -- one active subscription per user
);

-- ============================================================
-- TABLE 6 — transactions
-- All financial movements: purchases, royalties, fees
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id                        UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                      transaction_type   NOT NULL,
  status                    transaction_status NOT NULL DEFAULT 'pending',

  artwork_id                UUID               REFERENCES public.artworks(id) ON DELETE SET NULL,
  buyer_id                  UUID               REFERENCES public.users(id) ON DELETE SET NULL,
  seller_id                 UUID               REFERENCES public.users(id) ON DELETE SET NULL,

  -- Amounts in cents
  amount                    BIGINT             NOT NULL,    -- total charged to buyer
  platform_fee              BIGINT             NOT NULL DEFAULT 0,
  artist_royalty            BIGINT             NOT NULL DEFAULT 0,
  scout_commission          BIGINT             NOT NULL DEFAULT 0,
  seller_net                BIGINT             NOT NULL DEFAULT 0,
  currency                  TEXT               NOT NULL DEFAULT 'eur',

  -- Stripe
  stripe_payment_intent_id  TEXT               UNIQUE,
  stripe_transfer_id        TEXT,

  -- Context
  metadata                  JSONB              NOT NULL DEFAULT '{}',
  notes                     TEXT,

  created_at                TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  completed_at              TIMESTAMPTZ
);

-- ============================================================
-- TABLE 7 — royalties
-- Individual royalty / commission payout records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.royalties (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id     UUID        NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  recipient_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  recipient_type     TEXT        NOT NULL CHECK (recipient_type IN ('artist', 'scout', 'platform')),

  amount             BIGINT      NOT NULL,   -- cents
  currency           TEXT        NOT NULL DEFAULT 'eur',
  rate               NUMERIC(6,4) NOT NULL,  -- e.g. 0.0500 = 5%

  stripe_transfer_id TEXT,
  paid_at            TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 8 — bets (auction bids)
-- Placed on active auctions — auto-extended on last-minute bids
-- ============================================================

-- Auctions (required parent of bets)
CREATE TABLE IF NOT EXISTS public.auctions (
  id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id        UUID           NOT NULL REFERENCES public.artworks(id) ON DELETE RESTRICT,
  seller_id         UUID           NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

  status            auction_status NOT NULL DEFAULT 'scheduled',
  start_price       BIGINT         NOT NULL,   -- cents
  reserve_price     BIGINT,
  current_bid       BIGINT,
  current_bidder_id UUID           REFERENCES public.users(id) ON DELETE SET NULL,
  bid_count         INTEGER        NOT NULL DEFAULT 0,
  currency          TEXT           NOT NULL DEFAULT 'eur',

  starts_at         TIMESTAMPTZ    NOT NULL,
  ends_at           TIMESTAMPTZ    NOT NULL,
  extended_end      TIMESTAMPTZ,              -- shill-bid protection

  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bets (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id  UUID        NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

  amount      BIGINT      NOT NULL,           -- cents
  currency    TEXT        NOT NULL DEFAULT 'eur',
  status      bet_status  NOT NULL DEFAULT 'active',

  -- Stripe pre-auth (hold funds during auction)
  stripe_payment_method_id  TEXT,
  stripe_setup_intent_id    TEXT,

  ip_address  INET,                           -- fraud detection
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 9 — affiliate_links
-- Scout referral links (global or per-artwork)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  scout_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code        TEXT        NOT NULL UNIQUE,    -- URL slug e.g. "scout-abc-123"
  artwork_id  UUID        REFERENCES public.artworks(id) ON DELETE SET NULL, -- null = global

  clicks      INTEGER     NOT NULL DEFAULT 0,
  conversions INTEGER     NOT NULL DEFAULT 0,
  total_earned BIGINT     NOT NULL DEFAULT 0, -- cents lifetime

  utm_source  TEXT        DEFAULT 'prime-core',
  utm_medium  TEXT        DEFAULT 'affiliate',

  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 10 — anonymous_messages
-- Private / anonymous contact between users (collector ↔ artist)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.anonymous_messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,   -- null = truly anonymous
  recipient_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artwork_id   UUID        REFERENCES public.artworks(id) ON DELETE SET NULL, -- context artwork

  subject      TEXT,
  body         TEXT        NOT NULL,
  is_anonymous BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Moderation
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_flagged   BOOLEAN     NOT NULL DEFAULT FALSE,
  flagged_at   TIMESTAMPTZ,
  flagged_by   UUID        REFERENCES public.users(id) ON DELETE SET NULL,

  -- Reply thread
  parent_id    UUID        REFERENCES public.anonymous_messages(id) ON DELETE CASCADE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 11 — settings
-- Platform-wide configurable parameters
-- Seeded with default values below
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT        NOT NULL UNIQUE,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Default Settings ─────────────────────────────────────────
INSERT INTO public.settings (key, value, description) VALUES
  -- Commission rates
  ('take_rate',               '0.25',         'Platform take rate on sales (25%)'),
  ('artist_royalty_rate',     '0.05',         'Artist resale royalty rate (5%)'),
  ('scout_commission_rate',   '0.05',         'Scout commission on sales (5%)'),
  ('gallery_commission_rate', '0.10',         'Gallery commission rate (10%)'),
  -- Auction settings
  ('auction_extension_minutes', '5',          'Minutes to extend auction on last-minute bid'),
  ('auction_min_bid_increment', '0.05',       'Minimum bid increment as % of current bid (5%)'),
  -- Rental settings
  ('rental_deposit_rate',     '0.20',         'Rental deposit as % of artwork price (20%)'),
  ('rental_max_days',         '90',           'Maximum rental duration in days'),
  -- Subscription plan limits (JSON objects)
  ('plan_free',    '{"max_artworks":5,"max_certifications":0,"featured_listings":0,"monthly_price_eur":0}',          'Free plan limits'),
  ('plan_starter', '{"max_artworks":25,"max_certifications":5,"featured_listings":1,"monthly_price_eur":2900}',      'Starter plan limits (€29/mo)'),
  ('plan_pro',     '{"max_artworks":100,"max_certifications":25,"featured_listings":5,"monthly_price_eur":7900}',    'Pro plan limits (€79/mo)'),
  ('plan_elite',   '{"max_artworks":-1,"max_certifications":-1,"featured_listings":-1,"monthly_price_eur":19900}',   'Elite plan limits (€199/mo)'),
  -- Blockchain
  ('blockchain_network',      '"simulation"', 'Active blockchain network: simulation|polygon|base'),
  -- Pass-Core
  ('pass_core_enabled',       'true',         'Toggle Pass-Core certification feature'),
  ('pass_core_auto_lock',     'true',         'Auto-lock Pass-Core on ownership transfer'),
  -- Marketplace
  ('marketplace_currency',    '"eur"',        'Default marketplace currency'),
  ('min_listing_price',       '10000',        'Minimum listing price in cents (€100)'),
  ('featured_listing_price',  '5000',         'Cost to feature a listing in cents (€50)');

-- ============================================================
-- ADDITIONAL TABLES (required for platform functionality)
-- ============================================================

-- listings (ART-CORE marketplace)
CREATE TABLE IF NOT EXISTS public.listings (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id     UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE RESTRICT,
  seller_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  auction_id     UUID        REFERENCES public.auctions(id) ON DELETE SET NULL,

  type           TEXT        NOT NULL CHECK (type IN ('fixed', 'auction', 'rental')),
  price          BIGINT      NOT NULL,
  currency       TEXT        NOT NULL DEFAULT 'eur',
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),

  featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  featured_until TIMESTAMPTZ,
  affiliate_code TEXT,                               -- if created via affiliate link

  views          INTEGER     NOT NULL DEFAULT 0,
  favorites      INTEGER     NOT NULL DEFAULT 0,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ
);

-- scouts (PRIME-CORE)
CREATE TABLE IF NOT EXISTS public.scouts (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  commission_rate       NUMERIC(6,4) NOT NULL DEFAULT 0.05,
  total_artists_scouted INTEGER     NOT NULL DEFAULT 0,
  total_earnings        BIGINT      NOT NULL DEFAULT 0,
  affiliate_code        TEXT        NOT NULL UNIQUE,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- scouted_artists (PRIME-CORE)
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
  UNIQUE (scout_id, artist_id)
);

-- rentals
CREATE TABLE IF NOT EXISTS public.rentals (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id     UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE RESTRICT,
  renter_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  owner_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  listing_id     UUID        REFERENCES public.listings(id) ON DELETE SET NULL,

  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'overdue', 'returned', 'disputed')),

  daily_rate     BIGINT      NOT NULL,
  total_amount   BIGINT      NOT NULL,
  currency       TEXT        NOT NULL DEFAULT 'eur',
  deposit_amount BIGINT      NOT NULL DEFAULT 0,
  deposit_paid   BOOLEAN     NOT NULL DEFAULT FALSE,

  start_date     DATE        NOT NULL,
  end_date       DATE        NOT NULL,
  returned_at    TIMESTAMPTZ,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  artwork_id UUID        NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, artwork_id)
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,   -- e.g. 'bid_outbid', 'sale_complete', 'cert_ready'
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  data       JSONB       NOT NULL DEFAULT '{}',
  action_url TEXT,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES — Performance
-- ============================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_role ON public.user_roles(role) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- artworks
CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON public.artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_owner_id ON public.artworks(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON public.artworks(status);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON public.artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_published ON public.artworks(published_at DESC NULLS LAST) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_artworks_for_sale ON public.artworks(price ASC) WHERE is_for_sale = TRUE AND is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_artworks_for_rent ON public.artworks(rental_price_per_day ASC) WHERE is_for_rent = TRUE AND is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_artworks_pass_core ON public.artworks(pass_core_id) WHERE pass_core_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artworks_tags ON public.artworks USING GIN(tags);
-- FTS index sur colonne GENERATED STORED (pas d'expression → pas de 42P17)
CREATE INDEX IF NOT EXISTS idx_artworks_fts ON public.artworks USING GIN(search_vector);

-- pass_core
CREATE INDEX IF NOT EXISTS idx_pass_core_artwork ON public.pass_core(artwork_id);
CREATE INDEX IF NOT EXISTS idx_pass_core_owner ON public.pass_core(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_pass_core_hash ON public.pass_core(hash);
CREATE INDEX IF NOT EXISTS idx_pass_core_tx_hash ON public.pass_core(tx_hash);
CREATE INDEX IF NOT EXISTS idx_pass_core_status ON public.pass_core(status);

-- listings
CREATE INDEX IF NOT EXISTS idx_listings_artwork ON public.listings(artwork_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON public.listings(featured_until) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_listings_created ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_expires ON public.listings(expires_at) WHERE expires_at IS NOT NULL;

-- auctions
CREATE INDEX IF NOT EXISTS idx_auctions_artwork ON public.auctions(artwork_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON public.auctions(ends_at) WHERE status = 'live';

-- bets
CREATE INDEX IF NOT EXISTS idx_bets_auction ON public.bets(auction_id);
CREATE INDEX IF NOT EXISTS idx_bets_bidder ON public.bets(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON public.bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_amount ON public.bets(auction_id, amount DESC);

-- transactions
CREATE INDEX IF NOT EXISTS idx_tx_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tx_seller ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_tx_artwork ON public.transactions(artwork_id);
CREATE INDEX IF NOT EXISTS idx_tx_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_stripe_pi ON public.transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_created ON public.transactions(created_at DESC);

-- royalties
CREATE INDEX IF NOT EXISTS idx_royalties_tx ON public.royalties(transaction_id);
CREATE INDEX IF NOT EXISTS idx_royalties_recipient ON public.royalties(recipient_id);
CREATE INDEX IF NOT EXISTS idx_royalties_unpaid ON public.royalties(created_at) WHERE paid_at IS NULL;

-- scouts
CREATE INDEX IF NOT EXISTS idx_scouts_user ON public.scouts(user_id);
CREATE INDEX IF NOT EXISTS idx_scouts_code ON public.scouts(affiliate_code);

-- affiliate_links
CREATE INDEX IF NOT EXISTS idx_affiliate_code ON public.affiliate_links(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_scout ON public.affiliate_links(scout_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_artwork ON public.affiliate_links(artwork_id) WHERE artwork_id IS NOT NULL;

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_sub_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_stripe ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- anonymous_messages
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.anonymous_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.anonymous_messages(sender_id) WHERE sender_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.anonymous_messages(recipient_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_artwork ON public.anonymous_messages(artwork_id) WHERE artwork_id IS NOT NULL;

-- rentals
CREATE INDEX IF NOT EXISTS idx_rentals_artwork ON public.rentals(artwork_id);
CREATE INDEX IF NOT EXISTS idx_rentals_renter ON public.rentals(renter_id);
CREATE INDEX IF NOT EXISTS idx_rentals_owner ON public.rentals(owner_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.notifications(user_id) WHERE is_read = FALSE;

-- settings
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- ── updated_at auto-trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Auto-create user row on auth.users insert ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1) || '_' || substr(gen_random_uuid()::text, 1, 4)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Grant default 'collector' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'collector');

  -- Create free subscription
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Auto-lock Pass-Core on ownership transfer ─────────────────
-- Called when artworks.current_owner_id changes (Stripe webhook triggers this)
CREATE OR REPLACE FUNCTION public.handle_artwork_owner_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_owner_id IS DISTINCT FROM NEW.current_owner_id THEN
    -- Lock the active Pass-Core
    UPDATE public.pass_core
    SET
      status    = 'locked',
      locked_at = NOW(),
      updated_at = NOW()
    WHERE artwork_id = NEW.id
      AND status = 'active';

    -- Append old owner to history
    NEW.previous_owners = array_append(OLD.previous_owners, OLD.current_owner_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Shill-bid protection + auction state update ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_bet()
RETURNS TRIGGER AS $$
DECLARE
  v_auction    RECORD;
  v_min_bid    BIGINT;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = NEW.auction_id FOR UPDATE;

  -- Validate auction is live
  IF v_auction.status != 'live' THEN
    RAISE EXCEPTION 'Auction is not live';
  END IF;

  -- Validate minimum bid
  v_min_bid := GREATEST(
    v_auction.start_price,
    COALESCE(v_auction.current_bid, 0) + CEIL(COALESCE(v_auction.current_bid, v_auction.start_price) * 0.05)
  );
  IF NEW.amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid % is below minimum %', NEW.amount, v_min_bid;
  END IF;

  -- Mark previous winning bets as outbid
  UPDATE public.bets
  SET status = 'outbid'
  WHERE auction_id = NEW.auction_id AND status IN ('active', 'winning');

  NEW.status = 'winning';

  -- Update auction
  UPDATE public.auctions
  SET
    current_bid       = NEW.amount,
    current_bidder_id = NEW.bidder_id,
    bid_count         = bid_count + 1,
    -- Extend by 5 min if bid placed in last 5 minutes
    extended_end      = CASE
      WHEN (COALESCE(extended_end, ends_at) - NOW()) < INTERVAL '5 minutes'
      THEN COALESCE(extended_end, ends_at) + INTERVAL '5 minutes'
      ELSE extended_end
    END
  WHERE id = NEW.auction_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Update favorites count on artwork ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_favorite_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.artworks SET favorites = favorites + 1 WHERE id = NEW.artwork_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.artworks SET favorites = GREATEST(favorites - 1, 0) WHERE id = OLD.artwork_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ── Update artist/scout stats on completed transaction ────────
CREATE OR REPLACE FUNCTION public.handle_transaction_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update seller stats
    IF NEW.seller_id IS NOT NULL THEN
      UPDATE public.users
      SET
        total_sales  = total_sales + 1,
        total_earned = total_earned + NEW.seller_net,
        updated_at   = NOW()
      WHERE id = NEW.seller_id;
    END IF;

    -- Update buyer stats
    IF NEW.buyer_id IS NOT NULL THEN
      UPDATE public.users
      SET total_purchases = total_purchases + 1, updated_at = NOW()
      WHERE id = NEW.buyer_id;
    END IF;

    -- Update scouted_artist aggregates
    IF NEW.seller_id IS NOT NULL AND NEW.scout_commission > 0 THEN
      UPDATE public.scouted_artists
      SET
        total_sales_generated   = total_sales_generated + NEW.amount,
        total_commission_earned = total_commission_earned + NEW.scout_commission
      WHERE artist_id = NEW.seller_id AND is_active = TRUE;

      -- Update scout lifetime earnings
      UPDATE public.scouts s
      SET total_earnings = total_earnings + NEW.scout_commission
      FROM public.scouted_artists sa
      WHERE sa.artist_id = NEW.seller_id
        AND sa.scout_id = s.id
        AND sa.is_active = TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Helper: is current user admin? ───────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper: get user primary role ────────────────────────────
CREATE OR REPLACE FUNCTION public.user_primary_role(p_user_id UUID)
RETURNS user_role_enum AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = p_user_id AND is_active = TRUE
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin'       THEN 2
    WHEN 'gallery'     THEN 3
    WHEN 'scout'       THEN 4
    WHEN 'artist'      THEN 5
    ELSE 6
  END
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_artworks_updated_at
  BEFORE UPDATE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_pass_core_updated_at
  BEFORE UPDATE ON public.pass_core
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-lock Pass-Core on ownership transfer
CREATE TRIGGER trg_artwork_owner_change
  BEFORE UPDATE OF current_owner_id ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION public.handle_artwork_owner_change();

-- Shill-bid protection
CREATE TRIGGER trg_new_bet
  BEFORE INSERT ON public.bets
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_bet();

-- Favorites count
CREATE TRIGGER trg_favorite_insert
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.handle_favorite_change();

CREATE TRIGGER trg_favorite_delete
  AFTER DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.handle_favorite_change();

-- Transaction complete
CREATE TRIGGER trg_transaction_complete
  AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_complete();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_core            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.royalties            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouted_artists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;

-- ── users ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users: public read" ON public.users;
CREATE POLICY "users: public read"
  ON public.users FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "users: insert own (via trigger)" ON public.users;
CREATE POLICY "users: insert own (via trigger)"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users: update own or admin" ON public.users;
CREATE POLICY "users: update own or admin"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "users: delete admin only" ON public.users;
CREATE POLICY "users: delete admin only"
  ON public.users FOR DELETE
  USING (public.is_admin());

-- ── user_roles ────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_roles: read own or admin" ON public.user_roles;
CREATE POLICY "user_roles: read own or admin"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "user_roles: insert admin only" ON public.user_roles;
CREATE POLICY "user_roles: insert admin only"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "user_roles: update admin only" ON public.user_roles;
CREATE POLICY "user_roles: update admin only"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "user_roles: delete admin only" ON public.user_roles;
CREATE POLICY "user_roles: delete admin only"
  ON public.user_roles FOR DELETE
  USING (public.is_admin());

-- ── artworks ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "artworks: public read published" ON public.artworks;
CREATE POLICY "artworks: public read published"
  ON public.artworks FOR SELECT
  USING (
    is_public = TRUE
    OR artist_id = auth.uid()
    OR current_owner_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "artworks: insert artist/gallery" ON public.artworks;
CREATE POLICY "artworks: insert artist/gallery"
  ON public.artworks FOR INSERT
  WITH CHECK (
    artist_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('artist', 'gallery', 'admin', 'super_admin')
        AND is_active = TRUE
    )
  );

DROP POLICY IF EXISTS "artworks: update owner or admin" ON public.artworks;
CREATE POLICY "artworks: update owner or admin"
  ON public.artworks FOR UPDATE
  USING (
    artist_id = auth.uid()
    OR current_owner_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "artworks: delete admin only" ON public.artworks;
CREATE POLICY "artworks: delete admin only"
  ON public.artworks FOR DELETE
  USING (public.is_admin());

-- ── pass_core ─────────────────────────────────────────────────
-- Anyone can verify a certificate; only platform can issue/modify
DROP POLICY IF EXISTS "pass_core: public read" ON public.pass_core;
CREATE POLICY "pass_core: public read"
  ON public.pass_core FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "pass_core: insert admin only" ON public.pass_core;
CREATE POLICY "pass_core: insert admin only"
  ON public.pass_core FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pass_core: update admin only" ON public.pass_core;
CREATE POLICY "pass_core: update admin only"
  ON public.pass_core FOR UPDATE
  USING (public.is_admin());

-- ── subscriptions ─────────────────────────────────────────────
DROP POLICY IF EXISTS "subscriptions: read own or admin" ON public.subscriptions;
CREATE POLICY "subscriptions: read own or admin"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "subscriptions: insert admin/webhook" ON public.subscriptions;
CREATE POLICY "subscriptions: insert admin/webhook"
  ON public.subscriptions FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subscriptions: update admin/webhook" ON public.subscriptions;
CREATE POLICY "subscriptions: update admin/webhook"
  ON public.subscriptions FOR UPDATE
  USING (public.is_admin());

-- ── transactions ──────────────────────────────────────────────
DROP POLICY IF EXISTS "transactions: read own parties or admin" ON public.transactions;
CREATE POLICY "transactions: read own parties or admin"
  ON public.transactions FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "transactions: insert admin/webhook" ON public.transactions;
CREATE POLICY "transactions: insert admin/webhook"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "transactions: update admin/webhook" ON public.transactions;
CREATE POLICY "transactions: update admin/webhook"
  ON public.transactions FOR UPDATE
  USING (public.is_admin());

-- ── royalties ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "royalties: read own recipient or admin" ON public.royalties;
CREATE POLICY "royalties: read own recipient or admin"
  ON public.royalties FOR SELECT
  USING (recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "royalties: insert admin only" ON public.royalties;
CREATE POLICY "royalties: insert admin only"
  ON public.royalties FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "royalties: update admin only" ON public.royalties;
CREATE POLICY "royalties: update admin only"
  ON public.royalties FOR UPDATE
  USING (public.is_admin());

-- ── auctions ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auctions: public read" ON public.auctions;
CREATE POLICY "auctions: public read"
  ON public.auctions FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "auctions: insert seller" ON public.auctions;
CREATE POLICY "auctions: insert seller"
  ON public.auctions FOR INSERT
  WITH CHECK (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "auctions: update seller or admin" ON public.auctions;
CREATE POLICY "auctions: update seller or admin"
  ON public.auctions FOR UPDATE
  USING (seller_id = auth.uid() OR public.is_admin());

-- ── bets ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bets: public read" ON public.bets;
CREATE POLICY "bets: public read"
  ON public.bets FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "bets: insert authenticated" ON public.bets;
CREATE POLICY "bets: insert authenticated"
  ON public.bets FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bidder_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.auctions
      WHERE id = auction_id AND status = 'live'
    )
  );

-- ── affiliate_links ───────────────────────────────────────────
DROP POLICY IF EXISTS "affiliate_links: public read active" ON public.affiliate_links;
CREATE POLICY "affiliate_links: public read active"
  ON public.affiliate_links FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "affiliate_links: insert own scout" ON public.affiliate_links;
CREATE POLICY "affiliate_links: insert own scout"
  ON public.affiliate_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scouts
      WHERE id IS NOT NULL AND user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "affiliate_links: update own scout or admin" ON public.affiliate_links;
CREATE POLICY "affiliate_links: update own scout or admin"
  ON public.affiliate_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.scouts
      WHERE user_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ── anonymous_messages ────────────────────────────────────────
DROP POLICY IF EXISTS "messages: read own (sent or received)" ON public.anonymous_messages;
CREATE POLICY "messages: read own (sent or received)"
  ON public.anonymous_messages FOR SELECT
  USING (
    recipient_id = auth.uid()
    OR (sender_id = auth.uid() AND is_anonymous = FALSE)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "messages: insert authenticated" ON public.anonymous_messages;
CREATE POLICY "messages: insert authenticated"
  ON public.anonymous_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "messages: update own received (mark read)" ON public.anonymous_messages;
CREATE POLICY "messages: update own received (mark read)"
  ON public.anonymous_messages FOR UPDATE
  USING (recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "messages: delete admin only" ON public.anonymous_messages;
CREATE POLICY "messages: delete admin only"
  ON public.anonymous_messages FOR DELETE
  USING (public.is_admin());

-- ── settings ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "settings: public read" ON public.settings;
CREATE POLICY "settings: public read"
  ON public.settings FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "settings: write admin only" ON public.settings;
CREATE POLICY "settings: write admin only"
  ON public.settings FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings: update admin only" ON public.settings;
CREATE POLICY "settings: update admin only"
  ON public.settings FOR UPDATE
  USING (public.is_admin());

-- ── listings ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "listings: public read active" ON public.listings;
CREATE POLICY "listings: public read active"
  ON public.listings FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "listings: insert seller" ON public.listings;
CREATE POLICY "listings: insert seller"
  ON public.listings FOR INSERT
  WITH CHECK (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "listings: update seller or admin" ON public.listings;
CREATE POLICY "listings: update seller or admin"
  ON public.listings FOR UPDATE
  USING (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "listings: delete seller or admin" ON public.listings;
CREATE POLICY "listings: delete seller or admin"
  ON public.listings FOR DELETE
  USING (seller_id = auth.uid() OR public.is_admin());

-- ── scouts ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "scouts: public read active" ON public.scouts;
CREATE POLICY "scouts: public read active"
  ON public.scouts FOR SELECT
  USING (is_active = TRUE OR user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "scouts: insert admin" ON public.scouts;
CREATE POLICY "scouts: insert admin"
  ON public.scouts FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "scouts: update own or admin" ON public.scouts;
CREATE POLICY "scouts: update own or admin"
  ON public.scouts FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- ── scouted_artists ───────────────────────────────────────────
DROP POLICY IF EXISTS "scouted_artists: read scout or artist or admin" ON public.scouted_artists;
CREATE POLICY "scouted_artists: read scout or artist or admin"
  ON public.scouted_artists FOR SELECT
  USING (
    artist_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.scouts WHERE id = scout_id AND user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "scouted_artists: write admin only" ON public.scouted_artists;
CREATE POLICY "scouted_artists: write admin only"
  ON public.scouted_artists FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "scouted_artists: update admin only" ON public.scouted_artists;
CREATE POLICY "scouted_artists: update admin only"
  ON public.scouted_artists FOR UPDATE
  USING (public.is_admin());

-- ── rentals ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "rentals: read parties or admin" ON public.rentals;
CREATE POLICY "rentals: read parties or admin"
  ON public.rentals FOR SELECT
  USING (renter_id = auth.uid() OR owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "rentals: insert renter" ON public.rentals;
CREATE POLICY "rentals: insert renter"
  ON public.rentals FOR INSERT
  WITH CHECK (renter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "rentals: update parties or admin" ON public.rentals;
CREATE POLICY "rentals: update parties or admin"
  ON public.rentals FOR UPDATE
  USING (renter_id = auth.uid() OR owner_id = auth.uid() OR public.is_admin());

-- ── favorites ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "favorites: read own" ON public.favorites;
CREATE POLICY "favorites: read own"
  ON public.favorites FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites: insert own" ON public.favorites;
CREATE POLICY "favorites: insert own"
  ON public.favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites: delete own" ON public.favorites;
CREATE POLICY "favorites: delete own"
  ON public.favorites FOR DELETE
  USING (user_id = auth.uid());

-- ── notifications ─────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications: read own or admin" ON public.notifications;
CREATE POLICY "notifications: read own or admin"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "notifications: insert admin" ON public.notifications;
CREATE POLICY "notifications: insert admin"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "notifications: update own (mark read)" ON public.notifications;
CREATE POLICY "notifications: update own (mark read)"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications: delete own" ON public.notifications;
CREATE POLICY "notifications: delete own"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('artworks',   'artworks',   FALSE, 52428800,  ARRAY['image/jpeg','image/png','image/webp']),  -- 50MB, private HD
  ('previews',   'previews',   TRUE,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),  -- 5MB, public watermarked
  ('avatars',    'avatars',    TRUE,  2097152,   ARRAY['image/jpeg','image/png','image/webp']),  -- 2MB, public
  ('pass-core',  'pass-core',  FALSE, 1048576,   ARRAY['image/png','image/svg+xml'])             -- QR codes, private
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "artworks bucket: read owner or admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'artworks'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

CREATE POLICY "artworks bucket: upload owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artworks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "previews bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'previews');

CREATE POLICY "avatars bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars bucket: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- END OF MIGRATION
-- ============================================================
-- ============================================================
-- Migration: pHash column + certification_attempts table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Add p_hash column to artworks ────────────────────────
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS p_hash TEXT;

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_artworks_p_hash
  ON public.artworks (p_hash)
  WHERE p_hash IS NOT NULL;

-- ── 2. certification_attempts table ─────────────────────────
CREATE TABLE IF NOT EXISTS public.certification_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id      UUID REFERENCES public.artworks(id) ON DELETE CASCADE,
  owner_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'success', 'failed', 'duplicate')),
  p_hash          TEXT,
  image_sha256    TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for looking up attempts by artwork or owner
CREATE INDEX IF NOT EXISTS idx_cert_attempts_artwork
  ON public.certification_attempts (artwork_id);

CREATE INDEX IF NOT EXISTS idx_cert_attempts_owner
  ON public.certification_attempts (owner_id);

-- RLS: users can only see their own attempts; admins see all
ALTER TABLE public.certification_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own certification attempts"
  ON public.certification_attempts FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins see all certification attempts"
  ON public.certification_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Service role inserts certification attempts"
  ON public.certification_attempts FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- exec_sql RPC (allows API-based SQL execution for migrations)
-- Only accessible by service role
-- ============================================================
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql_query;
  RETURN '{"success": true}'::JSONB;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Revoke from public, grant only to service_role
REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;

-- ============================================================
-- END OF 003_initial_schema_fixed.sql
-- ============================================================
