# CHANGELOG — PRIME-CORE

> Journal des évolutions de l'app **prime-core** (paris / wallet / Pass Magnat).
> Format : date (AAAA-MM-JJ) → [commit] → résumé.
> Reconstruit à partir de l'historique Git le 2026-04-23.

---

## [Non publié / à faire]

- **Migration DB** : prime-core utilise encore `better-sqlite3` dans `package.json`. Les deux autres apps (art-core + pass-core) ont migré vers Supabase Postgres le 14 avril — **prime-core est le retardataire de la migration**.
- **Typecheck + build** : statut déclaré « à vérifier » dans `CLAUDE.md`. Audit pending.
- **État prod** : `prime-core.app` non vérifié depuis le 11 avril.

---

## 2026-04-22

- `d67e358` chore : normalisation globale des fins de ligne (application rétroactive de `.gitattributes`).

## 2026-04-11

- `7928d33` fix : normalisation de l'encodage + mise à jour de l'app prime-core.
- `929d71a` fix : ignorer les erreurs TypeScript / ESLint pendant les builds Vercel.

## 2026-04-10

- `7aff6f5` fix : corrections accents FR, nouveaux rôles vendeurs, liens env vars.

## 2026-04-08

- `e7e31ad` reorganize : unification de toutes les apps depuis les sources `*-final`, fix `ArtworkCard use client`.

## 2026-03-22

- `694c976` full backup — art-core, pass-core, prime-core, core-db.

---

## ⚠️ Observations

1. **Peu d'activité récente** — 6 commits sur 1 mois. La plupart sont des corrections transverses qui ont touché prime-core « en passant » lors de réorgs globales.
2. **Aucun feat spécifique prime-core** depuis le backup du 22 mars. Le module paris / wallet / Pass Magnat n'a probablement pas évolué depuis la réorg du 8 avril.
3. **Action recommandée** : avant d'aller plus loin, lancer `npm run typecheck` + `npm run build` depuis `prime-core/` pour confirmer que l'app compile encore, puis décider si on migre à Supabase Postgres (cohérence écosystème) ou si on laisse SQLite temporairement.
