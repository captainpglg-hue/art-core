# 2026-04-23 — Fix base64 prime-core

## Ce qui était cassé

Deux fichiers TypeScript de prime-core étaient stockés **en base64 brut** au lieu de leur contenu source :

- `app/prime-core/market/[id]/page.tsx` (7545 octets de base64, 0 saut de ligne)
- `components/prime-core/PrimeNavbar.tsx` (2920 octets de base64, 0 saut de ligne)

Conséquence : `tsc --noEmit` plantait dès la première ligne avec `error TS1005: ';' expected.`
Le build Vercel ne pouvait pas passer non plus (contournement actuel : `.next.config` ignore les erreurs TS, ce qui ne règle pas le bug — ça le masque).

## Origine probable

Introduit par le commit `7aff6f5` (2026-04-10) « fix: corrections accents FR, nouveaux roles vendeurs, liens env vars ». Le script de correction d'accents a très vraisemblablement passé les fichiers à base64 sans les redécoder.

Avant ce commit, dans le backup `694c976` (2026-03-22), les deux fichiers étaient propres et lisibles (120 lignes et 38 lignes respectivement).

## Ce qui a été fait

1. Sauvegarde des fichiers base64 dans ce dossier (`.base64.bak`).
2. Restauration des versions saines depuis le commit `694c976` :
   ```
   git show 694c976:prime-core/app/prime-core/market/[id]/page.tsx > app/prime-core/market/[id]/page.tsx
   git show 694c976:prime-core/components/prime-core/PrimeNavbar.tsx > components/prime-core/PrimeNavbar.tsx
   ```
3. Pas encore commité — à faire manuellement après vérification.

## Suivi recommandé

- Relancer `npm run typecheck` après avoir réinstallé proprement les node_modules.
- Vérifier qu'aucun autre fichier n'est base64 dans pass-core et art-core (grep sur `wc -l = 0` avec `wc -c > 100`).
- Committer :
  ```
  git add prime-core/app/prime-core/market/\[id\]/page.tsx prime-core/components/prime-core/PrimeNavbar.tsx
  git commit -m "fix(prime-core): restore base64-corrupted files from backup 694c976"
  ```
