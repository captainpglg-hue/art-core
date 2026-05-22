-- DRAFT - Securiser artworks INSERT : un user ne peut creer une oeuvre QUE pour lui-meme
-- L'ancienne policy avait qual: null / with_check: null --> n'importe qui peut
-- creer une oeuvre au nom d'un autre artist_id.

BEGIN;

DROP POLICY IF EXISTS "Authenticated can insert artworks" ON public.artworks;
DROP POLICY IF EXISTS "artworks_authenticated_insert" ON public.artworks;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.artworks;
DROP POLICY IF EXISTS "artworks_insert" ON public.artworks;

CREATE POLICY "artworks_insert_own" ON public.artworks
FOR INSERT TO authenticated
WITH CHECK (
  artist_id::text = auth.uid()::text
  AND (owner_id IS NULL OR owner_id::text = auth.uid()::text)
);

-- Note : le code actuel passe par la service_role key (bypass RLS) via getDb()
-- donc cette policy concerne uniquement les eventuelles requetes directes anon/authenticated
-- via le client public Supabase.

COMMIT;
