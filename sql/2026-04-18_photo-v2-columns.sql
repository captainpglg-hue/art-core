-- ============================================================
-- Photo-v2 : colonnes minimales pour faire marcher
--            la detection de doublons perceptuelle (pHash)
-- A coller dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj/sql/new
-- ============================================================

-- Ajout des colonnes pour stocker le pHash (aHash + dHash) sur artworks
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS macro_fingerprint TEXT;

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS p_hash TEXT;

-- Index de recherche rapide sur p_hash (utile quand la table grossira)
CREATE INDEX IF NOT EXISTS idx_artworks_p_hash
  ON public.artworks (p_hash)
  WHERE p_hash IS NOT NULL;

-- Note : la table certification_attempts (utile pour logger les tentatives)
-- n'est pas cree ici car elle depend des types d'ID (UUID vs TEXT).
-- Le endpoint /api/fingerprint la cherche dans un try/catch, donc si elle
-- manque, c'est juste qu'on ne log pas. Pas bloquant pour les jauges
-- ni pour la detection de doublons.

-- ── Verification ─────────────────────────────────────────
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'artworks'
  AND column_name IN ('macro_fingerprint', 'p_hash')
ORDER BY column_name;
