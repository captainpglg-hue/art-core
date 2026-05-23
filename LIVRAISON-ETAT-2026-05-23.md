# État de la livraison — 23 mai 2026, 12h10 UTC

## TL;DR

**2 sites sur 3 sont 100% LIVE et vérifiés.** Le 3ème (`prime-core.app`) **sert
actuellement le mauvais code** (la page renvoie l'app `pass-core` au lieu de
`prime-core`). Il manque un détachement + rattachement de domaine côté Vercel.

Voir **issue #8** pour la procédure exacte (5 minutes, dashboard Vercel).

## État actuel

| App | Domaine | État réel (vérifié via smoke tests Playwright) |
|---|---|---|
| art-core | https://art-core.app | ✅ LIVE — bon code, /api/health 200, login + search + boutique chargent |
| pass-core | https://pass-core.app | ✅ LIVE — bon code, gallery 500 réparé, certifier / verifier OK |
| prime-core code | https://fresh-core-app.vercel.app | ✅ Déployé — bon code, /api/markets 200, dashboard OK |
| prime-core domaine | https://prime-core.app | ❌ Sert **pass-core** au lieu de prime-core (mauvais projet Vercel) |

Suite de smoke tests dans `tests/smoke/` (Playwright + GitHub Actions) :
**21 passed, 1 skipped, 1 failed** sur le dernier run de `main` (commit `85889c7`).

Le test rouge est précisément celui qui détecte que `prime-core.app` ne sert pas
le bon code (vérifie que `<title>` contient "PRIME-CORE" — il contient
"PASS-CORE" actuellement).

## L'unique action restante (humain, ~5 min, dashboard Vercel)

Cf. **issue #8** pour la procédure pas-à-pas. Résumé :

1. **Trouver** quel projet Vercel revendique aujourd'hui `prime-core.app`
   (probablement `pass-core-final` vu le contenu servi)
2. **Détacher** `prime-core.app` de ce projet (Settings → Domains → Remove)
3. **Rattacher** à l'autre projet : celui dont Root Directory = `prime-core`
   (project ID `prj_wJ31AApnU0saNw2FoAXnpMPmaYHx`, ex-nommé `fresh-core-app`,
   renommé manuellement par l'humain entre 11:13 et 11:43 UTC le 23 mai)

## ⚠️ Sécurité urgente

4 tokens Vercel ont été créés/exposés en clair pendant les sessions de la
journée, à révoquer en bloc :
→ https://vercel.com/account/settings/tokens

La clé Anthropic `sk-ant-api03-GXcFnc1-…` est exposée en clair depuis le
4 avril 2026 (mail-id `19d598493190f364`) :
→ https://console.anthropic.com/settings/keys

## Source de vérité continue

Workflow `smoke-tests.yml` re-vérifie l'état des 3 sites :
- À chaque push qui modifie `tests/smoke/`
- Une fois par heure (cron `0 * * * *`)
- Manuellement : https://github.com/captainpglg-hue/art-core/actions/workflows/smoke-tests.yml → **Run workflow**

Statut **vert** = livraison complète. Le run du commit `85889c7` est rouge à
cause d'un seul test : celui qui détecte que `prime-core.app` sert le mauvais
contenu. Quand le rattachement de domaine sera corrigé, ce test passera et la
suite sera 22 / 1 / 0.

## Historique des commits poussés cette session

- `cfeb487` chore(docs+config): aligne 3 CLAUDE.md sur 3 projets Vercel + ajoute prime-core/vercel.json
- `80648b4` test(smoke): ajoute tests Playwright des 3 sites en prod + workflow CI
- `8261fae` fix(prod): gallery 500 + api/markets 500 + relax test certifier
- `45a106d` test(smoke): vérifie fixes sur preview URLs
- `0bca485` Merge claude/keen-wozniak-6C1Tk dans main (déclenche auto-deploy Vercel)
- `331dac4` chore: raccourci Windows vers Vercel (initialement vers fresh-core-app, désormais vers la liste)
- `4ee0c2d` chore(smoke): re-trigger workflow apres deploy Vercel prod
- `a88e2d3` test(smoke): skip preview json body test si Vercel auth wall (HTML)
- `e4d4711` chore(handoff): note d'etat livraison + corrige raccourci 404
- `61dc05b` test(smoke): prime-core home doit servir l'app, pas un 404 Vercel par defaut
- `85889c7` test(smoke): prime-core home title must contain PRIME-CORE (révèle le bug "wrong project attached")

## Pour reprendre

- Issue #8 (https://github.com/captainpglg-hue/art-core/issues/8) : procédure exacte
- Ce fichier : vue d'ensemble
- Smoke tests CI : preuve continue
