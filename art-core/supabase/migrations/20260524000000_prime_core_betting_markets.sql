-- ============================================================================
-- 20260524000000_prime_core_betting_markets.sql
-- ----------------------------------------------------------------------------
-- Crée la table betting_markets (paris prédictifs prime-core) absente de
-- Supabase. La table existait en SQLite (core-db/schema.sql) mais n'a jamais
-- été portée en Postgres. Conséquence : prime-core dashboard restait toujours
-- vide en prod malgré que getMarkets() retournait [] sans erreur visible.
--
-- Étend également la table `bets` existante (utilisée pour les enchères, vide
-- en pratique) avec les colonnes nécessaires aux paris de marché prédictif :
-- market_id, user_id, position, odds_at_bet, potential_payout, result, payout,
-- placed_at. Les colonnes auction-specific deviennent nullable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.betting_markets (
  id                  TEXT          PRIMARY KEY,
  artwork_id          UUID          NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  market_type         TEXT          NOT NULL CHECK (market_type IN ('time', 'value')),
  question            TEXT          NOT NULL,
  threshold_value     NUMERIC(12,2),
  threshold_days      INTEGER,
  total_yes_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_no_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  odds_yes            NUMERIC(6,3)  NOT NULL DEFAULT 2.0,
  odds_no             NUMERIC(6,3)  NOT NULL DEFAULT 2.0,
  status              TEXT          NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved_yes', 'resolved_no')),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_betting_markets_artwork ON public.betting_markets(artwork_id);
CREATE INDEX IF NOT EXISTS idx_betting_markets_status  ON public.betting_markets(status);

-- Extension de bets (les colonnes auction restent pour rétro-compat)
ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS market_id        TEXT          REFERENCES public.betting_markets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id          UUID          REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS position         TEXT          CHECK (position IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS odds_at_bet      NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS potential_payout NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS result           TEXT          CHECK (result IN ('won', 'lost', 'pending')),
  ADD COLUMN IF NOT EXISTS payout           NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placed_at        TIMESTAMPTZ   DEFAULT NOW();

-- Auction-specific deviennent nullable (les paris prédictifs n'en ont pas besoin)
ALTER TABLE public.bets ALTER COLUMN auction_id DROP NOT NULL;
ALTER TABLE public.bets ALTER COLUMN bidder_id  DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bets_market   ON public.bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_user     ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_result   ON public.bets(result);

-- RLS — lecture publique pour les marchés (page dashboard, leaderboard).
-- Écriture réservée au service_role via les routes API.
ALTER TABLE public.betting_markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "betting_markets_public_read" ON public.betting_markets;
CREATE POLICY "betting_markets_public_read"
  ON public.betting_markets
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- Seed : 2 marchés de démo sur l'œuvre la plus récente, si elle existe.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_artwork_id  UUID;
BEGIN
  SELECT id INTO v_artwork_id
  FROM public.artworks
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_artwork_id IS NOT NULL THEN
    INSERT INTO public.betting_markets
      (id, artwork_id, market_type, question, threshold_days, status,
       total_yes_amount, total_no_amount, odds_yes, odds_no)
    VALUES (
      'mkt_seed_time_' || encode(gen_random_bytes(4), 'hex'),
      v_artwork_id,
      'time',
      'Vendue dans 90 jours ?',
      90,
      'open',
      150, 75, 1.5, 3.0
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.betting_markets
      (id, artwork_id, market_type, question, threshold_value, status,
       total_yes_amount, total_no_amount, odds_yes, odds_no)
    VALUES (
      'mkt_seed_value_' || encode(gen_random_bytes(4), 'hex'),
      v_artwork_id,
      'value',
      'Vendue à plus de 1200€ ?',
      1200.00,
      'open',
      80, 120, 2.5, 1.66
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
