# Règles permanentes pour les agents IA

> Ce fichier vit à la racine du monorepo. **À lire en entier** avant toute modification.
> Pour le contexte applicatif, voir aussi `art-core/CLAUDE.md` et `pass-core/CLAUDE.md`.

## Architecture

Monorepo : `art-core/` (marketplace), `pass-core/` (certification),
`prime-core/` (paris), `core-db/` (SQL/migrations partagées).

Chaque app est une Next.js 14 indépendante avec son propre `package.json`,
son `.env.local`, ses `node_modules`. Pas de monorepo tool (Turborepo, etc.).

## Interdits absolus

- **`as any`**. Utilise un type précis (`as { foo: string }` au pire).
  Le bug du marketplace (filtres ignorés) est venu directement d'un
  `getArtworks(...) as any` qui a permis aux propriétés non supportées
  de passer en silence.
- **Service Worker qui cache `/_next/`, `/api/`, ou les pages HTML.**
  Voir le commentaire en tête de `art-core/public/sw.js` :
  cacher les chunks Next.js cause `ChunkLoadError` + React #423 dès
  qu'un nouveau deploy change les hash.
- **`useEffect` qui dépend d'un fetch sans timeout fallback.**
  Pattern correct : voir `art-core/hooks/use-auth-check.ts`.
- **`<Suspense fallback={<div>Chargement</div>}>` au-dessus de
  `useSearchParams()`.** Le fallback peut figer le rendu en prod.
  Préférer `window.location.search` lu en `useEffect`.
- **Force-push sur main.** Jamais.
- **Skip hooks** (`--no-verify`, `--no-gpg-sign`). Jamais.

## Patterns obligatoires

- Toute page client qui dépend de `/api/auth/me` doit utiliser le hook
  `useAuthCheck` (`art-core/hooks/use-auth-check.ts` ou
  `pass-core/hooks/use-auth-check.ts`) plutôt que ré-implémenter le
  fetch+timeout localement.
- Toute fonction qui prend des filtres optionnels doit déclarer
  son interface `Opts` typée — pas de `Record<string, any>` ni
  d'objet anonyme. Voir `GetArtworksOpts` dans `art-core/lib/db.ts`.
- Tout commit doit passer `npx tsc --noEmit` ET `npm run build` avant
  push (les apps sont déployées via auto-deploy Vercel sur push to main
  pendant le sprint en cours — toute régression est en prod en quelques
  minutes).

## Workflow

1. **Lire le code existant avant d'écrire du nouveau.** Beaucoup de
   fichiers à la racine (`PUSH-NOW.ps1`, `DO-EVERYTHING.ps1`, etc.) ont
   été supprimés parce qu'ils étaient des doublons écrits par d'anciens
   agents qui n'avaient pas regardé l'existant.
2. **Préférer modifier un fichier existant que créer un nouveau.**
3. **Ne jamais commit sans avoir tourné le typecheck + build.**
4. **Ne jamais push sans avoir lancé un curl rapide en local** sur les
   pages affectées par la modif.

## Hooks et utils partagés

- `art-core/hooks/use-auth-check.ts` (et son jumeau pass-core) :
  fetch `/api/auth/me` avec timeout 4s.
- `art-core/lib/db.ts` : `query` / `queryOne` / `queryAll` avec fallback
  postgres-js → Supabase REST. Le translator REST ne supporte PAS les
  JOINs ; si tu as besoin d'un JOIN dans le fallback, il faut soit
  récupérer les deux tables séparément soit forcer le chemin postgres-js.

## Choses qu'aucun agent ne peut faire et qui restent humaines

- Tester l'identification macro optique avec une vraie œuvre + téléphone
- Tester un achat Stripe E2E avec une carte test
- Tester un dépôt antiquaire avec génération de fiche police PDF

Ces tests doivent être faits par l'humain avant tout déploiement
"go live" public.
