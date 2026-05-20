-- =============================================================================
-- Migration : RLS hardening — remplace les policies "always true" par des
--             policies restrictives sur 8 tables non-fc_*
-- Date : 2026-05-20
-- =============================================================================
-- Contexte :
--   L'advisor sécurité Supabase signalait 16 policies "always true" qui
--   bypassent effectivement RLS pour le rôle anon. Sur les 8 tables non-fc_
--   listées ci-dessous, le code applicatif (art-core, pass-core) accède
--   toujours via getDb() (service_role qui bypasse RLS). Donc retirer les
--   policies permissives n'impacte pas le fonctionnement.
--
--   Les 8 tables fc_* (Fresh Core / HACCP) sont volontairement laissées
--   intactes : fresh-core est une app Expo/RN qui utilise la clé anon en
--   direct depuis mobile (cf. fresh-core/src/services/supabase.ts).
--   Modifier ces RLS sans test mobile risquerait de casser la sync offline.
--
-- Stratégie par table :
--   * `certificates`        — SELECT public conservé (vérification publique),
--                             writes en service_role uniquement
--   * `ownership_transfers` — SELECT public conservé (provenance publique),
--                             writes en service_role uniquement
--   * Les 6 autres          — full lock anon (lecture comme écriture en
--                             service_role uniquement)
-- =============================================================================

-- 1) certificates : public read, no anon write -------------------------------
DROP POLICY IF EXISTS anon_all_certificates ON public.certificates;
CREATE POLICY "certificates_anon_select"
  ON public.certificates FOR SELECT TO anon, authenticated
  USING (true);
-- Pas de policy INSERT/UPDATE/DELETE pour anon/authenticated. Service_role bypasse.

-- 2) ownership_transfers : public read, no anon write ------------------------
DROP POLICY IF EXISTS anon_all_ownership_transfers ON public.ownership_transfers;
CREATE POLICY "ownership_transfers_public_select"
  ON public.ownership_transfers FOR SELECT TO anon, authenticated
  USING (true);

-- 3-8) Full lock : commission_ledger, pass_core_transactions, passport_requests,
--      police_register_audit_log, police_register_entries, register_subscriptions
DROP POLICY IF EXISTS anon_all_commission_ledger ON public.commission_ledger;

DROP POLICY IF EXISTS "Service insert transactions" ON public.pass_core_transactions;

DROP POLICY IF EXISTS anon_all_passport_requests ON public.passport_requests;

DROP POLICY IF EXISTS anon_all_audit_log ON public.police_register_audit_log;

DROP POLICY IF EXISTS anon_all_register ON public.police_register_entries;

DROP POLICY IF EXISTS anon_all_subscriptions ON public.register_subscriptions;

-- Toutes ces tables conservent RLS activé (déjà le cas) mais sans aucune
-- policy pour anon/authenticated → accès via service_role uniquement.

-- 9) SECURITY DEFINER : durcir les fonctions exposées via /rest/v1/rpc/ ------
-- handle_new_user est un trigger sur auth.users, jamais appelé via RPC.
-- On révoque l'execute pour anon/authenticated qui n'ont rien à faire avec.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- increment_oeuvres_count est utilisé côté app (rpc depuis art-core), garder anon
-- mais durcir avec un search_path explicite (advisor 0011).
CREATE OR REPLACE FUNCTION public.increment_oeuvres_count(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles SET oeuvres_count = oeuvres_count + 1 WHERE id = p_id;
$$;

-- send_message_admin_notification : trigger interne, jamais appelé par anon.
REVOKE EXECUTE ON FUNCTION public.send_message_admin_notification() FROM anon, authenticated;

-- 10) Search_path mutable : durcir les autres fonctions advisor 0011 -------
-- Sans connaître le corps exact des autres fonctions, on évite de les redéfinir
-- ici (risque de casser un trigger). Le user appliquera manuellement via
-- `ALTER FUNCTION ... SET search_path = public;` si nécessaire au prochain sprint.
