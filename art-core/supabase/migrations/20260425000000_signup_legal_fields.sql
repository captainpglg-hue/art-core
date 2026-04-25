-- 20260425 — Champs légaux pour signup déposant pass-core
-- Ajout : merchants.numero_rom, merchants.regime_tva, users.technique_artistique
-- Tous nullable : les 117 users existants ne sont pas backfillés.

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS numero_rom text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS regime_tva text;

ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_regime_tva_check;
ALTER TABLE merchants ADD CONSTRAINT merchants_regime_tva_check
  CHECK (regime_tva IS NULL OR regime_tva IN ('marge','reel','franchise'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS technique_artistique text;
