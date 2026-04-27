-- =============================================================================
-- Migration : magic_links + seller_profiles + ajustements users
-- Date : 2026-04-27
-- Contexte : refonte du parcours d'authentification et de dépôt.
--   - Auth par magic link (pas de mot de passe à l'inscription)
--   - Champs minimum à l'inscription : nom, prénom, email, pseudo, téléphone
--   - Le rôle (artiste/galeriste/antiquaire/brocanteur/dépôt-vente) et les
--     informations professionnelles sont demandés UNIQUEMENT au premier dépôt,
--     et stockés dans seller_profiles. Au dépôt N+1 on saute ce formulaire.
-- =============================================================================

-- 1) magic_links : token de connexion à usage unique (15 min)
CREATE TABLE IF NOT EXISTS magic_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   text UNIQUE NOT NULL,         -- SHA-256(token) — jamais le token brut
  email        text NOT NULL,
  signup_data  jsonb,                         -- { first_name, last_name, pseudo, phone } pour signup
  intent       text NOT NULL DEFAULT 'login', -- 'login' | 'signup'
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  ip_address   text,
  user_agent   text
);

CREATE INDEX IF NOT EXISTS idx_magic_links_token_hash ON magic_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires_at ON magic_links(expires_at);

-- 2) seller_profiles : caractéristiques du vendeur (rôle + infos pro si applicable)
--    Renseigné au premier dépôt. Une ligne par user. Source unique de vérité.
CREATE TABLE IF NOT EXISTS seller_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            text NOT NULL,             -- 'artist' | 'galeriste' | 'antiquaire' | 'brocanteur' | 'depot_vente'
  -- Champs pro (NULL pour rôle 'artist')
  raison_sociale  text,
  siret           text,
  nom_gerant      text,
  adresse         text,
  code_postal     text,
  ville           text,
  telephone_pro   text,
  cahier_police   boolean NOT NULL DEFAULT false,
  -- Liaison merchants existante : si rôle pro et infos remplies, on duplique ou pointe vers merchants
  merchant_id     uuid REFERENCES merchants(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_role ON seller_profiles(role);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_siret ON seller_profiles(siret) WHERE siret IS NOT NULL;

-- 3) Ajustements users : ajouter colonnes prénom + téléphone si absentes
--    (on garde full_name pour rétrocompatibilité ; first_name/last_name sont
--    le format canonique du nouveau parcours)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
    ALTER TABLE users ADD COLUMN first_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
    ALTER TABLE users ADD COLUMN last_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
    ALTER TABLE users ADD COLUMN phone text;
  END IF;
END $$;

-- 4) artworks : un flag pour les œuvres en attente de seller_profile
--    (œuvre déposée mais formulaire 2 pas encore validé → invisible publiquement)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='artworks' AND column_name='pending_seller_profile') THEN
    ALTER TABLE artworks ADD COLUMN pending_seller_profile boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 5) Cleanup : tâche programmée pour purger les magic_links expirés (>24h).
--    On laisse à cron Supabase / Vercel ; pas géré ici.
