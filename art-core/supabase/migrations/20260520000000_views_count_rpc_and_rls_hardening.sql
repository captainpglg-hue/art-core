-- =============================================================================
-- Migration : RPC increment_artwork_views + RLS hardening
-- Date : 2026-05-20
-- =============================================================================
-- Contexte :
--   1) Bug observé en prod (postgres logs, 17 occurrences en 24h) :
--      `invalid input syntax for type integer: "views_count + 1"`
--      Cause : art-core/app/(art-core)/art-core/oeuvre/[id]/page.tsx passe la
--      requête `UPDATE artworks SET views_count = views_count + 1 WHERE id = ?`
--      via le translator REST PostgREST de lib/db.ts. Ce translator ne
--      supporte pas les expressions SQL côté valeur — il envoie la chaîne
--      littérale "views_count + 1" comme valeur, d'où le 400.
--      Fix : on expose une RPC dédiée et le code l'appelle via getDb().rpc().
--   2) Advisor sécurité Supabase a détecté que `public.magic_links` et
--      `public.seller_profiles` sont publiques (RLS désactivé). Or
--      magic_links contient token_hash + email + signup_data en clair, et
--      seller_profiles contient SIRET + adresse + téléphone pro. Ces tables
--      ne sont accédées qu'en service_role (cf. lib/db.ts:getDb()), donc
--      activer RLS sans policies n'impacte pas le code (service_role bypasse
--      toujours RLS).
-- =============================================================================

-- 1) RPC increment_artwork_views ------------------------------------------------
-- Note : on ne réutilise pas `increment_oeuvres_count` car malgré son nom, elle
-- incrémente `profiles.oeuvres_count`, pas `artworks.views_count`.
CREATE OR REPLACE FUNCTION public.increment_artwork_views(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE artworks
     SET views_count = COALESCE(views_count, 0) + 1
   WHERE id = p_id;
$$;

-- On laisse anon/authenticated l'exécuter : la fonction est idempotente côté
-- sécurité (incrémente un compteur, ne révèle rien, ne crée pas de ligne).
GRANT EXECUTE ON FUNCTION public.increment_artwork_views(uuid) TO anon, authenticated;

-- 2) magic_links : RLS hardening -------------------------------------------------
-- Cette table contient les hash de tokens de magic-link + l'email + le
-- signup_data (jsonb) en attente. AUCUN client (anon ni authenticated) n'a
-- besoin d'y toucher : tout passe par les routes /api/auth/magic-link/{request,verify}
-- côté serveur, qui utilisent le service_role (lequel bypasse RLS).
ALTER TABLE public.magic_links ENABLE ROW LEVEL SECURITY;
-- Pas de policy : tout est verrouillé pour anon/authenticated. Service_role bypasse.

-- 3) seller_profiles : RLS hardening --------------------------------------------
-- Contient SIRET, adresse, téléphone pro, raison sociale → données identifiantes.
-- Accédé uniquement via /api/seller-profile et /api/artworks/create côté serveur,
-- en service_role. On verrouille les rôles publics et on ajoute une policy
-- owner-only en defense-in-depth (si un jour le code utilise le client Supabase
-- avec un JWT utilisateur, l'utilisateur ne verra que sa propre ligne).
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_profiles_owner_select"
  ON public.seller_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "seller_profiles_owner_insert"
  ON public.seller_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "seller_profiles_owner_update"
  ON public.seller_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Pas de DELETE : la suppression d'un seller_profile est administrative,
-- elle reste service_role only.
