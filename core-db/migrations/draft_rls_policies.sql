-- ══════════════════════════════════════════════════════════════════════════════
-- DRAFT — À REVIEWER AVANT APPLY
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration : ajout de RLS policies par défaut pour les tables où RLS est activé
-- mais aucune policy n'existe (audit Supabase advisor 2026-05-22).
--
-- Tables traitées (15) :
--   1.  admin_codes
--   2.  anonymous_messages
--   3.  commission_ledger
--   4.  magic_links
--   5.  pass_core
--   6.  pass_core_transactions
--   7.  platform_secrets
--   8.  police_register_audit_log
--   9.  police_register_entries
--   10. register_subscriptions
--   11. royalties
--   12. settings
--   13. shipping_rates
--   14. subscriptions
--   15. user_roles
--
-- Stratégie par catégorie :
--   * SECRETS PURS (admin_codes, platform_secrets, magic_links) :
--       → aucune lecture/écriture client. service_role uniquement.
--   * AUDIT LOGS (police_register_audit_log, commission_ledger) :
--       → lecture admin, écriture service_role only.
--   * USER-OWNED (subscriptions, register_subscriptions, royalties, pass_core,
--                 pass_core_transactions, user_roles) :
--       → SELECT/UPDATE par owner, INSERT par owner ou service_role.
--   * PUBLIC READ (settings, shipping_rates) : lecture anon ok, écriture admin.
--   * INPUT ANONYME (anonymous_messages, police_register_entries) :
--       → INSERT public, SELECT admin uniquement.
--
-- ⚠️ Avant apply :
--   - Confirmer l'existence de la fonction is_admin() ou équivalent.
--   - Vérifier le nom exact des colonnes user_id (parfois owner_id, buyer_id, etc.).
--   - Tester en staging avant prod.
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper attendu (à créer si absent) :
-- CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
-- LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
--   SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin');
-- $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. SECRETS PURS — service_role only, deny everyone else
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_codes_no_client_access" ON public.admin_codes
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE POLICY "platform_secrets_no_client_access" ON public.platform_secrets
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE POLICY "magic_links_no_client_access" ON public.magic_links
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. AUDIT LOGS — admin read, service_role write
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "police_audit_admin_read" ON public.police_register_audit_log
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "commission_ledger_admin_read" ON public.commission_ledger
  FOR SELECT TO authenticated USING (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. USER-OWNED ROWS — owner SELECT/UPDATE, service_role manages inserts
-- ──────────────────────────────────────────────────────────────────────────────

-- subscriptions (assumed user_id column)
CREATE POLICY "subscriptions_owner_select" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "subscriptions_owner_update" ON public.subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- register_subscriptions (police register)
CREATE POLICY "register_subs_owner_select" ON public.register_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- royalties (artist payouts — read by artist, admin)
CREATE POLICY "royalties_owner_select" ON public.royalties
  FOR SELECT TO authenticated
  USING (artist_id = auth.uid() OR public.is_admin());

-- pass_core (passports/certificats — read by owner, public certified ones)
CREATE POLICY "pass_core_owner_select" ON public.pass_core
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.is_admin());
CREATE POLICY "pass_core_public_certified_read" ON public.pass_core
  FOR SELECT TO anon USING (status = 'certified' AND is_public = true);

-- pass_core_transactions (transfer history)
CREATE POLICY "pass_core_tx_party_select" ON public.pass_core_transactions
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.is_admin());

-- user_roles — user reads own role, admin can manage
CREATE POLICY "user_roles_own_select" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "user_roles_admin_write" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. PUBLIC READ — settings, shipping_rates
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "settings_public_read" ON public.settings
  FOR SELECT TO anon, authenticated USING (is_public = true OR public.is_admin());
CREATE POLICY "settings_admin_write" ON public.settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "shipping_rates_public_read" ON public.shipping_rates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "shipping_rates_admin_write" ON public.shipping_rates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. ANONYMOUS INPUT — anonymous_messages, police_register_entries
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "anonymous_messages_public_insert" ON public.anonymous_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anonymous_messages_admin_read" ON public.anonymous_messages
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "police_entries_admin_only" ON public.police_register_entries
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- TODO avant apply :
--   [ ] Adapter les noms de colonnes (user_id vs owner_id vs artist_id) au schéma réel
--   [ ] Créer ou confirmer la fonction is_admin()
--   [ ] Vérifier que les colonnes is_public / status existent où on les référence
--   [ ] Tester chaque policy en staging avec un compte authenticated et un compte anon
--   [ ] Reviewer policy par policy : trop restrictif = features cassées, trop laxiste = leak
-- ══════════════════════════════════════════════════════════════════════════════
