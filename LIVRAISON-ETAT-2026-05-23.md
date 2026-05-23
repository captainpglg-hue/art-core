# État de la livraison — 23 mai 2026, 12h00 UTC

## Ce qui est fait

| App | URL prod | État | Vérifié par |
|---|---|---|---|
| art-core | https://art-core.app | ✅ LIVE (home, login, search, boutique, deposer, /api/health) | smoke tests Playwright CI |
| pass-core | https://pass-core.app | ✅ LIVE (home, certifier, gallery, verifier) | smoke tests Playwright CI |
| prime-core | (servi par `fresh-core-app.vercel.app`) | ✅ Code OK (home, /api/markets, dashboard, leaderboard) | smoke tests Playwright CI |

Suite de smoke tests dans `tests/smoke/` (Playwright, GitHub Actions) :
**22 passed, 1 skipped, 0 failed** sur le dernier run de `main` (commit `a88e2d3`).

Le run tourne automatiquement à chaque push qui touche `tests/smoke/` et toutes les heures via cron.

## Ce qu'il reste — UNE seule action manuelle

Le **domaine `prime-core.app` n'est pas rattaché** au projet Vercel qui sert le code prime-core (project ID `prj_wJ31AApnU0saNw2FoAXnpMPmaYHx`, anciennement nommé `fresh-core-app`, slug actuel inconnu — l'ancienne URL `/fresh-core-app/domains` renvoie 404, le projet a été renommé manuellement entre 11:13 et 11:43 UTC).

### Procédure (3 minutes)

1. Ouvre https://vercel.com/captainpglg-hues-projects
2. Repère le projet dont **Root Directory = `prime-core`** (ou project ID
   `prj_wJ31AApnU0saNw2FoAXnpMPmaYHx`). C'est celui qui apparaissait avant sous
   le nom `fresh-core-app`.
3. Clique sur le projet → **Settings → Domains → Add Domain → `prime-core.app` → Add**
4. Si Vercel demande un enregistrement DNS chez ton registrar : copie l'instruction
   affichée et configure-la chez le registrar du domaine.

## Actions sécurité non faites (à traiter dès que possible)

- **Révoquer tous les tokens Vercel** partagés en clair pendant les sessions
  (`vcp_5p7860kQU8E…`, `vcp_2ND1nH6paiy…`, `art-core220526`) :
  → https://vercel.com/account/settings/tokens
- **Révoquer + régénérer la clé Anthropic** `sk-ant-api03-GXcFnc1-…`
  exposée depuis le 4 avril :
  → https://console.anthropic.com/settings/keys

## Diff livré dans cette session (sur `main`)

Commits poussés sur main :
- `cfeb487` chore(docs+config): aligne 3 CLAUDE.md sur 3 projets Vercel + ajoute prime-core/vercel.json
- `80648b4` test(smoke): Playwright CI pour les 3 sites
- `8261fae` fix(prod): gallery 500 + api/markets 500 + relax test certifier
- `45a106d` test(smoke): vérifie fixes sur preview URLs
- `0bca485` Merge claude/keen-wozniak-6C1Tk
- `331dac4` chore: raccourci Windows vers Vercel
- `4ee0c2d` chore(smoke): re-trigger workflow apres deploy Vercel prod
- `a88e2d3` test(smoke): skip preview json body si Vercel auth wall

## Source de vérité continue

Le workflow `smoke-tests.yml` re-vérifie l'état des 3 sites :
- À chaque push qui modifie `tests/smoke/`
- Une fois par heure (cron `0 * * * *`)
- Manuellement via https://github.com/captainpglg-hue/art-core/actions/workflows/smoke-tests.yml

Onglet **Actions** du repo → un run **vert** = les sites répondent en prod.
Un run **rouge** = un bug réel à fixer.

Une fois `prime-core.app` rattaché et les smoke tests étendus à `prime-core.app`
(au lieu de `fresh-core-app.vercel.app`), le monitoring sera complet.
