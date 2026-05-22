-- DRAFT - Fix CRITICAL : restreindre la lecture publique de la table users
-- L'ancienne policy "Public profiles are viewable by everyone" exposait
-- password_hash, email, phone, stripe_account_id, business_siret a tout anonyme.

BEGIN;

-- 1. Drop l'ancienne policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;

-- 2. Nouvelle policy SELECT publique limitee aux champs vraiment publics
-- Strategie : creer une view "users_public" et y rediriger les lectures anon
CREATE OR REPLACE VIEW public.users_public AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  role,
  created_at
FROM public.users;

GRANT SELECT ON public.users_public TO anon, authenticated;

-- 3. Policy SELECT users : authenticated peut lire son propre profil complet
CREATE POLICY "users_self_read" ON public.users
FOR SELECT TO authenticated
USING (auth.uid()::text = id::text);

-- 4. Service role garde l'acces complet (admin)
-- (deja en place via bypass RLS pour service_role)

COMMIT;

-- ATTENTION : a appliquer apres avoir verifie que le frontend lit bien via users_public
-- (ou que les requetes filtrant par id du user connecte fonctionnent toujours).
