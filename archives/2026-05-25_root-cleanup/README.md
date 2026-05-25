# Root cleanup — 25 mai 2026

7 fichiers one-shot déplacés depuis la racine du repo vers ce dossier :

## Setup et prompts (déjà appliqués)
- `COPIER-RESEND-VERCEL-CONSOLE.js` — script DevTools console pour copier RESEND_API_KEY de pass-core-final vers art-core-final (avril 2026)
- `PROMPT-GOOGLE-LOGIN.md` — prompt de spec pour implémenter le login Google sur art-core/pass-core (déjà réalisé)
- `SETUP-GOOGLE-LOGIN.html` — page HTML interactive (checklist setup OAuth Google côté humain) du 4 mai 2026

## Rapports d'état historiques
- `RAPPORT-CLAUDE-CODE.md` — rapport sessions 2026-04-30 + 2026-05-01 (typecheck propre, 19 bugs corrigés)
- `LIVRAISON-ETAT-2026-05-23.md` — état livraison 23 mai (81 tests smoke verts, fixes data-flow prime-core)
- `MIGRATION-APPLIQUER-2026-05-24.md` — procédure migration `betting_markets` (appliquée le 25 mai via PRs #12-#16)
- `LIVRAISON-BOUTON-PRIME-CORE.url` — raccourci Windows vers Vercel

Les outils encore utiles restent à la racine : `loadtest.mjs`, `seed-demo-accounts.py`, `test-deposit-flow.py`.
