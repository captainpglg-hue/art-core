-- ============================================================
-- ART-CORE — Fix enums + 3 tables manquantes
-- Coller dans : Supabase Dashboard → SQL Editor → Run
-- https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj/sql/new
-- ============================================================

-- 0. Fix pass_core_status enum: add missing values
DO $$ BEGIN
  ALTER TYPE pass_core_status ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE pass_core_status ADD VALUE IF NOT EXISTS 'certified';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE artwork_status ADD VALUE IF NOT EXISTS 'available';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. PASS_CORE_CERTIFICATIONS
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

-- 2. PASS_CORE_MESSAGES
CREATE TABLE IF NOT EXISTS public.pass_core_messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_core_id UUID        NOT NULL REFERENCES public.pass_core(id) ON DELETE CASCADE,
  sender_id    UUID        REFERENCES public.users(id),
  sender_tag   TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. OWNERSHIP_HISTORY
CREATE TABLE IF NOT EXISTS public.ownership_history (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artwork_id     UUID        NOT NULL REFERENCES public.artworks(id),
  from_user      UUID        REFERENCES public.users(id),
  to_user        UUID        NOT NULL REFERENCES public.users(id),
  transaction_id UUID,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.pass_core_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_core_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY IF NOT EXISTS "pass_core_cert_public_read"
  ON public.pass_core_certifications FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "pass_core_messages_read"
  ON public.pass_core_messages FOR SELECT USING (TRUE);
CREATE POLICY IF NOT EXISTS "pass_core_messages_insert"
  ON public.pass_core_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_core_cert_aw ON public.pass_core_certifications(artwork_id);
