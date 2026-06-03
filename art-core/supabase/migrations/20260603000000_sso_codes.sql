-- =============================================================================
-- Migration : sso_codes — SSO inter-domaines (art-core = fournisseur d'identité)
-- Date : 2026-06-03
-- Contexte : art-core.app / pass-core.app / prime-core.app sont 3 domaines
--   racines distincts → un cookie ne peut pas les traverser. Le SSO se fait
--   donc par handoff redirection + code à usage unique :
--     1. la partie (prime-core/pass-core) redirige vers art-core /auth/sso/authorize
--     2. art-core (déjà loggé) crée un code à usage unique (TTL 60s) ici
--     3. la partie échange le code (serveur→serveur) contre le token de session
--     4. la partie pose son propre cookie core_session = MÊME token partagé
--   La table sessions reste la source de vérité commune ; sso_codes n'est qu'un
--   sas d'échange éphémère.
-- Sécurité : accès service_role uniquement (aucune policy publique). code = PK
--   aléatoire, single-use (used_at), TTL court (expires_at), lié à client +
--   redirect_uri (validés en allowlist côté code).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sso_codes (
  code         TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL,
  client       TEXT        NOT NULL,
  redirect_uri TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_codes_expires ON public.sso_codes(expires_at);

-- Pas de policy SELECT/INSERT publique : les routes serveur utilisent le
-- service_role (REST) ou la connexion postgres directe, qui bypassent la RLS.
ALTER TABLE public.sso_codes ENABLE ROW LEVEL SECURITY;
