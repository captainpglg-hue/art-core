-- Migration: Add is_winning column to bids table
-- The place-bet API references is_winning on the bids table but the column
-- may not exist in the initial schema. This migration adds it safely.

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS is_winning BOOLEAN NOT NULL DEFAULT false;

-- Index to quickly find the winning bid for an auction
CREATE INDEX IF NOT EXISTS idx_bets_auction_winning
  ON bets (auction_id, is_winning)
  WHERE is_winning = true;

-- Backfill: mark the highest bid per auction as is_winning = true
UPDATE bets b
SET is_winning = true
FROM (
  SELECT DISTINCT ON (auction_id) id
  FROM bets
  ORDER BY auction_id, amount DESC
) winning
WHERE b.id = winning.id;
