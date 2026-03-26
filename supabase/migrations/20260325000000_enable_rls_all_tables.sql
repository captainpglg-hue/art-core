-- ============================================================
-- MIGRATION: Enable RLS on ALL unprotected tables
-- Date: 2026-03-25
-- Purpose: Fix Supabase security advisory — rls_disabled_in_public
--
-- Strategy:
--   The app uses a custom auth system (core_session cookie) and
--   the SERVICE ROLE KEY for all server-side operations (bypasses RLS).
--   RLS policies here protect against direct access via the ANON KEY
--   from the browser or external clients.
--
--   - Public data (artworks, gauge): SELECT allowed for anon
--   - Private data (messages, points, sessions): no anon access
--   - All writes: service role only (no anon INSERT/UPDATE/DELETE)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. GAUGE SYSTEM TABLES
-- ────────────────────────────────────────────────────────────

-- gauge_entries: initiés' point deposits on artworks
ALTER TABLE IF EXISTS public.gauge_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gauge_entries: public read" ON public.gauge_entries;
CREATE POLICY "gauge_entries: public read"
  ON public.gauge_entries FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "gauge_entries: service role write" ON public.gauge_entries;
CREATE POLICY "gauge_entries: service role write"
  ON public.gauge_entries FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "gauge_entries: service role update" ON public.gauge_entries;
CREATE POLICY "gauge_entries: service role update"
  ON public.gauge_entries FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "gauge_entries: service role delete" ON public.gauge_entries;
CREATE POLICY "gauge_entries: service role delete"
  ON public.gauge_entries FOR DELETE
  USING (FALSE);

-- gauge_history: audit trail for gauge actions
ALTER TABLE IF EXISTS public.gauge_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gauge_history: public read" ON public.gauge_history;
CREATE POLICY "gauge_history: public read"
  ON public.gauge_history FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "gauge_history: no anon write" ON public.gauge_history;
CREATE POLICY "gauge_history: no anon write"
  ON public.gauge_history FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "gauge_history: no anon update" ON public.gauge_history;
CREATE POLICY "gauge_history: no anon update"
  ON public.gauge_history FOR UPDATE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 2. POINT SYSTEM (SENSITIVE — no anon access)
-- ────────────────────────────────────────────────────────────

-- point_transactions: all point movements (balances, earnings)
ALTER TABLE IF EXISTS public.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_transactions: no anon read" ON public.point_transactions;
CREATE POLICY "point_transactions: no anon read"
  ON public.point_transactions FOR SELECT
  USING (FALSE);

DROP POLICY IF EXISTS "point_transactions: no anon write" ON public.point_transactions;
CREATE POLICY "point_transactions: no anon write"
  ON public.point_transactions FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "point_transactions: no anon update" ON public.point_transactions;
CREATE POLICY "point_transactions: no anon update"
  ON public.point_transactions FOR UPDATE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 3. PROMO SYSTEM
-- ────────────────────────────────────────────────────────────

-- promo_tools: shop inventory (public read, no anon write)
ALTER TABLE IF EXISTS public.promo_tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_tools: public read" ON public.promo_tools;
CREATE POLICY "promo_tools: public read"
  ON public.promo_tools FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "promo_tools: no anon write" ON public.promo_tools;
CREATE POLICY "promo_tools: no anon write"
  ON public.promo_tools FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "promo_tools: no anon update" ON public.promo_tools;
CREATE POLICY "promo_tools: no anon update"
  ON public.promo_tools FOR UPDATE
  USING (FALSE);

-- promo_purchases: user purchases (sensitive)
ALTER TABLE IF EXISTS public.promo_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_purchases: no anon read" ON public.promo_purchases;
CREATE POLICY "promo_purchases: no anon read"
  ON public.promo_purchases FOR SELECT
  USING (FALSE);

DROP POLICY IF EXISTS "promo_purchases: no anon write" ON public.promo_purchases;
CREATE POLICY "promo_purchases: no anon write"
  ON public.promo_purchases FOR INSERT
  WITH CHECK (FALSE);

-- promo_items: promo catalog (public read)
ALTER TABLE IF EXISTS public.promo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_items: public read" ON public.promo_items;
CREATE POLICY "promo_items: public read"
  ON public.promo_items FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "promo_items: no anon write" ON public.promo_items;
CREATE POLICY "promo_items: no anon write"
  ON public.promo_items FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "promo_items: no anon update" ON public.promo_items;
CREATE POLICY "promo_items: no anon update"
  ON public.promo_items FOR UPDATE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 4. PREDICTION MARKETS (PRIME-CORE)
-- ────────────────────────────────────────────────────────────

-- predictions: market definitions (public read)
ALTER TABLE IF EXISTS public.predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions: public read" ON public.predictions;
CREATE POLICY "predictions: public read"
  ON public.predictions FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "predictions: no anon write" ON public.predictions;
CREATE POLICY "predictions: no anon write"
  ON public.predictions FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "predictions: no anon update" ON public.predictions;
CREATE POLICY "predictions: no anon update"
  ON public.predictions FOR UPDATE
  USING (FALSE);

-- prediction_bets: individual bets (sensitive — no anon access)
ALTER TABLE IF EXISTS public.prediction_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prediction_bets: no anon read" ON public.prediction_bets;
CREATE POLICY "prediction_bets: no anon read"
  ON public.prediction_bets FOR SELECT
  USING (FALSE);

DROP POLICY IF EXISTS "prediction_bets: no anon write" ON public.prediction_bets;
CREATE POLICY "prediction_bets: no anon write"
  ON public.prediction_bets FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "prediction_bets: no anon update" ON public.prediction_bets;
CREATE POLICY "prediction_bets: no anon update"
  ON public.prediction_bets FOR UPDATE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 5. MESSAGING (CRITICAL — private conversations)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages: no anon read" ON public.messages;
CREATE POLICY "messages: no anon read"
  ON public.messages FOR SELECT
  USING (FALSE);

DROP POLICY IF EXISTS "messages: no anon write" ON public.messages;
CREATE POLICY "messages: no anon write"
  ON public.messages FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "messages: no anon update" ON public.messages;
CREATE POLICY "messages: no anon update"
  ON public.messages FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "messages: no anon delete" ON public.messages;
CREATE POLICY "messages: no anon delete"
  ON public.messages FOR DELETE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 6. OWNERSHIP HISTORY (audit log — public read, no anon write)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.ownership_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ownership_history: public read" ON public.ownership_history;
CREATE POLICY "ownership_history: public read"
  ON public.ownership_history FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "ownership_history: no anon write" ON public.ownership_history;
CREATE POLICY "ownership_history: no anon write"
  ON public.ownership_history FOR INSERT
  WITH CHECK (FALSE);

-- ────────────────────────────────────────────────────────────
-- 7. SESSIONS (CRITICAL — auth tokens)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions: no anon access" ON public.sessions;
CREATE POLICY "sessions: no anon access"
  ON public.sessions FOR SELECT
  USING (FALSE);

DROP POLICY IF EXISTS "sessions: no anon write" ON public.sessions;
CREATE POLICY "sessions: no anon write"
  ON public.sessions FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "sessions: no anon update" ON public.sessions;
CREATE POLICY "sessions: no anon update"
  ON public.sessions FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "sessions: no anon delete" ON public.sessions;
CREATE POLICY "sessions: no anon delete"
  ON public.sessions FOR DELETE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 8. OFFERS (bids on artworks — no anon access)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "offers: no anon read" ON public.offers;
CREATE POLICY "offers: no anon read"
  ON public.offers FOR SELECT
  USING (FALSE);

DROP POLICY IF EXISTS "offers: no anon write" ON public.offers;
CREATE POLICY "offers: no anon write"
  ON public.offers FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "offers: no anon update" ON public.offers;
CREATE POLICY "offers: no anon update"
  ON public.offers FOR UPDATE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 9. BETTING MARKETS (public read, no anon write)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.betting_markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "betting_markets: public read" ON public.betting_markets;
CREATE POLICY "betting_markets: public read"
  ON public.betting_markets FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "betting_markets: no anon write" ON public.betting_markets;
CREATE POLICY "betting_markets: no anon write"
  ON public.betting_markets FOR INSERT
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS "betting_markets: no anon update" ON public.betting_markets;
CREATE POLICY "betting_markets: no anon update"
  ON public.betting_markets FOR UPDATE
  USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 10. SHIPPING & ORDERS (sensitive — no anon access)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.shipping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping: no anon access" ON public.shipping;
CREATE POLICY "shipping: no anon access"
  ON public.shipping FOR SELECT USING (FALSE);

DROP POLICY IF EXISTS "shipping: no anon write" ON public.shipping;
CREATE POLICY "shipping: no anon write"
  ON public.shipping FOR INSERT WITH CHECK (FALSE);

ALTER TABLE IF EXISTS public.shipping_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipping_orders: no anon access" ON public.shipping_orders;
CREATE POLICY "shipping_orders: no anon access"
  ON public.shipping_orders FOR SELECT USING (FALSE);

DROP POLICY IF EXISTS "shipping_orders: no anon write" ON public.shipping_orders;
CREATE POLICY "shipping_orders: no anon write"
  ON public.shipping_orders FOR INSERT WITH CHECK (FALSE);

ALTER TABLE IF EXISTS public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes: no anon access" ON public.disputes;
CREATE POLICY "disputes: no anon access"
  ON public.disputes FOR SELECT USING (FALSE);

DROP POLICY IF EXISTS "disputes: no anon write" ON public.disputes;
CREATE POLICY "disputes: no anon write"
  ON public.disputes FOR INSERT WITH CHECK (FALSE);

-- ────────────────────────────────────────────────────────────
-- 11. COMMISSIONS & REFERRALS (sensitive — no anon access)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.initiate_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "initiate_commissions: no anon access" ON public.initiate_commissions;
CREATE POLICY "initiate_commissions: no anon access"
  ON public.initiate_commissions FOR SELECT USING (FALSE);

DROP POLICY IF EXISTS "initiate_commissions: no anon write" ON public.initiate_commissions;
CREATE POLICY "initiate_commissions: no anon write"
  ON public.initiate_commissions FOR INSERT WITH CHECK (FALSE);

ALTER TABLE IF EXISTS public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_codes: public read" ON public.referral_codes;
CREATE POLICY "referral_codes: public read"
  ON public.referral_codes FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "referral_codes: no anon write" ON public.referral_codes;
CREATE POLICY "referral_codes: no anon write"
  ON public.referral_codes FOR INSERT WITH CHECK (FALSE);

-- ────────────────────────────────────────────────────────────
-- 12. OWNERSHIP TRANSFERS (audit — public read)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.ownership_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ownership_transfers: public read" ON public.ownership_transfers;
CREATE POLICY "ownership_transfers: public read"
  ON public.ownership_transfers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "ownership_transfers: no anon write" ON public.ownership_transfers;
CREATE POLICY "ownership_transfers: no anon write"
  ON public.ownership_transfers FOR INSERT WITH CHECK (FALSE);

-- ────────────────────────────────────────────────────────────
-- 13. PASS-CORE CERTIFICATIONS & MESSAGES (already have RLS
--     in 003 migration, ensure they're covered)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.pass_core_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pass_core_certifications: public read" ON public.pass_core_certifications;
CREATE POLICY "pass_core_certifications: public read"
  ON public.pass_core_certifications FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "pass_core_certifications: no anon write" ON public.pass_core_certifications;
CREATE POLICY "pass_core_certifications: no anon write"
  ON public.pass_core_certifications FOR INSERT
  WITH CHECK (FALSE);

ALTER TABLE IF EXISTS public.pass_core_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pass_core_messages: public read" ON public.pass_core_messages;
CREATE POLICY "pass_core_messages: public read"
  ON public.pass_core_messages FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "pass_core_messages: no anon write" ON public.pass_core_messages;
CREATE POLICY "pass_core_messages: no anon write"
  ON public.pass_core_messages FOR INSERT WITH CHECK (FALSE);

-- ────────────────────────────────────────────────────────────
-- 14. NOVA / PARTNERSHIPS (sensitive — no anon access)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.partnerships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partnerships: no anon access" ON public.partnerships;
CREATE POLICY "partnerships: no anon access"
  ON public.partnerships FOR SELECT USING (FALSE);

ALTER TABLE IF EXISTS public.nova_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nova_accounts: no anon access" ON public.nova_accounts;
CREATE POLICY "nova_accounts: no anon access"
  ON public.nova_accounts FOR SELECT USING (FALSE);

-- ────────────────────────────────────────────────────────────
-- 15. COMMUNITY BOOSTS (public read)
-- ────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.community_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_boosts: public read" ON public.community_boosts;
CREATE POLICY "community_boosts: public read"
  ON public.community_boosts FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "community_boosts: no anon write" ON public.community_boosts;
CREATE POLICY "community_boosts: no anon write"
  ON public.community_boosts FOR INSERT WITH CHECK (FALSE);

-- ============================================================
-- VERIFICATION: List all tables and their RLS status
-- Run manually: SELECT tablename, rowsecurity FROM pg_tables
--               WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
