-- ============================================================================
-- 20260525000000_betting_markets_moderation.sql
-- ----------------------------------------------------------------------------
-- Phase C : user-generated betting_markets.
--
-- Ajoute deux colonnes à betting_markets :
--   - moderation_status ('pending' | 'approved' | 'rejected')
--   - proposed_by (UUID du user qui a soumis le marché, NULL pour seed/admin)
--
-- Les marchés existants sont marqués 'approved' (default) pour ne pas être
-- masqués du dashboard public après migration.
-- ============================================================================

ALTER TABLE public.betting_markets
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_betting_markets_moderation
  ON public.betting_markets(moderation_status);

-- Note RLS : la policy `betting_markets_public_read` existante autorise
-- déjà SELECT public. Le filtre `moderation_status = 'approved'` est appliqué
-- côté code (getMarkets) pour le dashboard public ; le scope admin lit tout
-- via service_role.
