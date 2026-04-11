-- ============================================================
-- ART-CORE — Seed Data (local development only)
-- Appliqué automatiquement par : supabase db reset
-- NE PAS exécuter en production
-- ============================================================

-- ── Utilisateurs de test ──────────────────────────────────────
-- Les UUIDs sont fixes pour la reproductibilité des tests
-- Mot de passe pour tous : Test1234!

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role
) VALUES
  -- Super Admin (Art-core LTD)
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@art-core.app',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Art-core Admin","username":"artcore_admin"}',
    FALSE, 'authenticated'
  ),
  -- Artiste
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'artist@test.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sophie Durand","username":"sophie_art"}',
    FALSE, 'authenticated'
  ),
  -- Collector
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'collector@test.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Marc Leblanc","username":"marc_collector"}',
    FALSE, 'authenticated'
  ),
  -- Scout
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'scout@test.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Lucas Martin","username":"lucas_scout"}',
    FALSE, 'authenticated'
  ),
  -- Galerie
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'gallery@test.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Galerie Lumière","username":"galerie_lumiere"}',
    FALSE, 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Profils (créés normalement par le trigger handle_new_user) ──
INSERT INTO public.users (id, email, username, full_name, verified, onboarded)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@art-core.app',     'artcore_admin',   'Art-core Admin',  TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000002', 'artist@test.com',        'sophie_art',      'Sophie Durand',   TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000003', 'collector@test.com',     'marc_collector',  'Marc Leblanc',    TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000004', 'scout@test.com',         'lucas_scout',     'Lucas Martin',    TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000005', 'gallery@test.com',       'galerie_lumiere', 'Galerie Lumière', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Rôles ─────────────────────────────────────────────────────
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'super_admin', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'admin',       '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'artist',      '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'collector',   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', 'scout',       '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', 'gallery',     '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role) DO NOTHING;

-- ── Abonnements ───────────────────────────────────────────────
INSERT INTO public.subscriptions (user_id, plan, status, max_artworks, max_certifications, featured_listings)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'elite',   'active', -1,  -1, -1),
  ('00000000-0000-0000-0000-000000000002', 'pro',     'active', 100, 25,  5),
  ('00000000-0000-0000-0000-000000000003', 'starter', 'active',  25,  5,  1),
  ('00000000-0000-0000-0000-000000000004', 'pro',     'active', 100, 25,  5),
  ('00000000-0000-0000-0000-000000000005', 'elite',   'active', -1,  -1, -1)
ON CONFLICT (user_id) DO NOTHING;

-- ── Scout ─────────────────────────────────────────────────────
INSERT INTO public.scouts (id, user_id, commission_rate, affiliate_code, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000004',
  0.05,
  'LUCAS-SCOUT-001',
  TRUE
) ON CONFLICT DO NOTHING;

-- ── Artworks de démo ──────────────────────────────────────────
INSERT INTO public.artworks (
  id, title, description, artist_id, status,
  image_url, image_preview_url, image_public_id,
  year, medium, dimensions, edition, category, tags, style,
  price, currency, rental_price_per_day,
  current_owner_id, is_public, is_for_sale, is_for_rent
) VALUES
  (
    '00000000-0000-0000-0000-000000001001',
    'Lumière d''Automne',
    'Une peinture abstraite évoquant la douceur des journées d''octobre.',
    '00000000-0000-0000-0000-000000000002',
    'listed',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'art_core/artworks/sample_001',
    2023, 'Huile sur toile', '80 × 60 cm', '1/1',
    'painting', ARRAY['abstrait','automne','lumière'], ARRAY['abstrait','contemporain'],
    350000, 'eur', 5000,
    '00000000-0000-0000-0000-000000000002',
    TRUE, TRUE, TRUE
  ),
  (
    '00000000-0000-0000-0000-000000001002',
    'Série Urbaine #3',
    'Photographie argentique de la vie nocturne parisienne.',
    '00000000-0000-0000-0000-000000000002',
    'certified',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'art_core/artworks/sample_002',
    2024, 'Photographie argentique', '50 × 70 cm', '3/10',
    'photography', ARRAY['paris','nuit','urbain'], ARRAY['documentaire','noir et blanc'],
    120000, 'eur', NULL,
    '00000000-0000-0000-0000-000000000002',
    TRUE, TRUE, FALSE
  ),
  (
    '00000000-0000-0000-0000-000000001003',
    'Fragment Digital #7',
    'Œuvre numérique générative, édition unique.',
    '00000000-0000-0000-0000-000000000002',
    'draft',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    'art_core/artworks/sample_003',
    2024, 'Art numérique', '4K — impression disponible', '1/1',
    'digital', ARRAY['génératif','NFT','digital'], ARRAY['générative','abstrait'],
    80000, 'eur', NULL,
    '00000000-0000-0000-0000-000000000002',
    FALSE, FALSE, FALSE
  )
ON CONFLICT (id) DO NOTHING;

-- ── Pass-Core pour l''œuvre certifiée ─────────────────────────
INSERT INTO public.pass_core (
  id, artwork_id, hash, tx_hash, block_number, network,
  current_owner_id, issued_by, status, verification_url
) VALUES (
  '00000000-0000-0000-0000-000000002001',
  '00000000-0000-0000-0000-000000001002',
  'a3f8d2c1e4b7a9f0d2e5c8b1a4f7d0e3c6b9a2f5d8e1b4a7f0d3e6c9b2a5f8',
  '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
  18450123,
  'simulation',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'active',
  'http://localhost:3000/pass-core/verify/00000000-0000-0000-0000-000000002001'
) ON CONFLICT DO NOTHING;

-- Mise à jour de l'artwork avec son pass_core_id
UPDATE public.artworks
SET pass_core_id = '00000000-0000-0000-0000-000000002001',
    pass_core_status = 'active'
WHERE id = '00000000-0000-0000-0000-000000001002';

-- ── Listing actif ─────────────────────────────────────────────
INSERT INTO public.listings (
  id, artwork_id, seller_id, type, price, currency, status, featured
) VALUES (
  '00000000-0000-0000-0000-000000003001',
  '00000000-0000-0000-0000-000000001001',
  '00000000-0000-0000-0000-000000000002',
  'fixed', 350000, 'eur', 'active', FALSE
) ON CONFLICT DO NOTHING;

-- ── Lien affilié scout ────────────────────────────────────────
INSERT INTO public.affiliate_links (scout_id, code, artwork_id)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  'LUCAS-ART-001',
  '00000000-0000-0000-0000-000000001001'
) ON CONFLICT DO NOTHING;

-- ── Notification de bienvenue ─────────────────────────────────
INSERT INTO public.notifications (user_id, type, title, body, action_url)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'welcome', 'Bienvenue sur ART-CORE', 'Votre compte artiste est actif. Commencez par publier votre première œuvre.', '/art-core/artworks/new'),
  ('00000000-0000-0000-0000-000000000003', 'welcome', 'Bienvenue sur ART-CORE', 'Découvrez des œuvres uniques certifiées par PASS-CORE.', '/art-core'),
  ('00000000-0000-0000-0000-000000000004', 'welcome', 'Bienvenue sur PRIME-CORE', 'Votre espace scout est prêt. Partagez votre lien affilié LUCAS-SCOUT-001.', '/prime-core/dashboard');
