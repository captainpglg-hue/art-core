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
