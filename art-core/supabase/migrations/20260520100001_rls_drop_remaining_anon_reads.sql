-- =============================================================================
-- Migration : nettoyage des policies SELECT anon résiduelles
-- Date : 2026-05-20
-- =============================================================================
-- Suite à `20260520100000_rls_lockdown_non_fc_tables.sql`, l'audit RLS a montré
-- que des policies legacy `anon_read_*` (SELECT TO anon USING true) traînaient
-- encore sur les mêmes tables — l'advisor sécurité ne les flaggait pas car les
-- policies SELECT-only "always true" sont autorisées pour la lecture publique,
-- mais sur ces tables ce n'est PAS souhaité (données sensibles légales/financières).
--
-- Stratégie :
--   * certificates / ownership_transfers : on garde une SEULE policy SELECT
--     (la nouvelle de la migration précédente) — la lecture publique est
--     intentionnelle pour la vérification provenance/authenticité.
--   * Les 6 autres : DROP complet, accès via service_role uniquement.
-- =============================================================================

DROP POLICY IF EXISTS anon_read_commission_ledger ON public.commission_ledger;
DROP POLICY IF EXISTS anon_read_passport_requests ON public.passport_requests;
DROP POLICY IF EXISTS anon_read_audit_log ON public.police_register_audit_log;
DROP POLICY IF EXISTS anon_read_register ON public.police_register_entries;
DROP POLICY IF EXISTS anon_read_subscriptions ON public.register_subscriptions;
DROP POLICY IF EXISTS "Public read transactions" ON public.pass_core_transactions;
DROP POLICY IF EXISTS anon_read_certificates ON public.certificates;
DROP POLICY IF EXISTS anon_read_ownership_transfers ON public.ownership_transfers;
