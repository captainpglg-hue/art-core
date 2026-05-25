# POSTMORTEM — Écosystème art-core / pass-core / prime-core

> Synthèse honnête des erreurs récurrentes commises par l'agent Claude pendant
> le développement des 3 apps. Reconstruite depuis l'historique git + les docs
> d'état (`RAPPORT-CLAUDE-CODE.md`, `LIVRAISON-ETAT-2026-05-23.md`,
> `CHANGELOG.md` × 3). Sert de référence permanente — si un pattern réapparaît,
> on s'arrête et on relit.

---

## Méta-pattern

Toutes les erreurs ci-dessous partagent la même racine :
**coder contre des hypothèses au lieu de lire la réalité** — Postgres,
prod, fichiers existants, payload réel des fonctions.

Les garde-fous (`CLAUDE.md`, typage strict, tests data-flow) sont tous
**réactifs**. Le pre-commit hook (`PRE-COMMIT.md` + `scripts/pre-commit.sh`)
les rend exécutoires.

---

## 1. `as any` qui ont masqué de vrais bugs

**Coût** : 19 bugs runtime + 1 bug majeur prod (filtres marketplace ignorés).

### Bug racine
`getArtworks(...) as any` au call-site marketplace a laissé passer des filtres
non-supportés en silence pendant des semaines. La fonction acceptait
`{ category, priceMin, ... }` sans avoir d'interface `Opts` — le compilateur
n'a jamais pu attraper la dérive.

### Bug d'amplification
`getUserByToken` retournait `Promise<unknown>` (via `return users[0]` sans
annotation). Tous les call-sites faisaient `(user as any).x`. Après typage
strict en `Promise<Tables<"users"> | undefined>` (commit `0b86091`), le
compilateur a immédiatement révélé 19 bugs réels :

| # | Fichier | Bug |
|---|---------|-----|
| 1 | `/api/profile` PUT | `UPDATE users SET name = ?` — la colonne s'appelle `full_name`. Profil ne sauvait jamais. |
| 2 | `/api/auth/login`, `/api/auth/me` | `name: user.name \|\| user.full_name` — `user.name` toujours undefined. |
| 3-6 | `/api/{artworks, certify, merchants/register, cahier-police}` | `ROLES.includes(user.role)` sans null-guard → rejets 403 silencieux. |
| 7-10 | `/api/{boost, nova, promo/shop, initie/signup}` | `null + 5 = NaN` écrit en DB pour `points_balance` nullable. |
| 11-13 | `/api/{certify, certification, offers}` | Emails sortant avec `"undefined propose 250€..."`. |
| 14 | `/dashboard/page.tsx` | `Bonjour {user.name}` → `Bonjour ` tout court. |
| 15 | `oeuvre/[id]/detail-client.tsx` | Interface locale exigeait `is_initie: number` alors que la DB renvoie `boolean \| null`. |
| 16-19 | divers | null-guards manquants après lecture DB. |

### Nettoyage tardif
- Commit `bc0b778` — élimine 29 `as any` dans 16 routes API + 3 `lib/db.ts`
- Commit `4f93b8c` — élimine les 46 derniers du scope `api/` + `lib/db.ts`
- Reste 16 `as any` dans `app/(pages)` et `lib/fiche-police.ts` (hors scope API critique)

### Leçon non-négociable
**Typer les frontières DB en premier, pas en dernier.** Toute fonction
qui retourne des données doit avoir un type retour explicite — jamais
inféré, jamais `unknown`.

---

## 2. Smoke tests verts pendant que la prod est cassée

**Coût** : dashboard prime-core vide en permanence pendant ~1 mois sans
qu'aucun test ne s'en aperçoive. Détecté par un user réel (issue #11).

### Cause
Les 82 tests Playwright (commit `80648b4`) vérifiaient « la page charge
sans 500 », pas « la page affiche des données ». Un dashboard vide passait
au vert.

### Correctif
`tests/smoke/data-flow.spec.ts` — assertions strictes :
- `/api/markets` doit retourner ≥ 1 marché
- boutique art-core ≥ 1 œuvre
- search ≥ 1 résultat

### Leçon
**Un test qui ne peut jamais être rouge pour la raison qui compte est un
faux ami.** Pour chaque page critique, écrire au moins une assertion
sur le contenu réel, pas juste le status code.

---

## 3. Schéma Postgres ↔ code — désaccords répétés

**Coût** : 4 commits de fix consécutifs pour des colonnes/types mal devinés.

| Commit | Bug |
|--------|-----|
| `a57e52c` | `betting_markets.id` était UUID en prod, pas TEXT. |
| `9269cdd` | Colonne `artworks.gauge_locked_at` — nom faux dans le code. |
| `c8bccd8` | Table `betting_markets` carrément manquante en prod. |
| (RAPPORT) | Tables `magic_links`, `platform_secrets`, `seller_profiles` jamais récupérées par `gen-types.cjs`. |

### Leçon
**Lire le schéma Postgres avant d'écrire le code.** Pas de devinette sur
les types (UUID vs TEXT vs SERIAL), pas de devinette sur les noms de
colonnes. `\d table_name` dans `psql` ou requête à `information_schema`
avant toute migration.

---

## 4. Fallbacks DB qui throwent — fragilité sous charge

**Coût** : pages 500 intermittentes en prod sur prime-core.

### Pattern bug
```ts
try { restSelect } catch { queryAll(JOIN) }
```
Si **les deux** échouent, exception propagée → page 500.

### Correctif (commit `954387d` puis `40cb5a2`, `96141f6`)
- `try` imbriqué qui retourne `undefined`/`[]` sur double-échec
- Ajout de `withPgTimeout(6000ms)` sur les 3 helpers `query`/`queryOne`/`queryAll`
- Error boundary `error.tsx` sur dashboard
- Wrapper `loadDashboardData()` try/catch retournant `{ parsed: [], totalBets: 0 }`

### Leçon
**Ce qui marche dans 2 apps sur 3 dérive vite si on ne migre pas
symétriquement.** Quand un pattern de résilience est ajouté à art-core,
le porter immédiatement sur pass-core ET prime-core dans le même commit.

---

## 5. Service Worker qui cache `/_next/` → ChunkLoadError

**Coût** : app cassée pour les users existants à chaque deploy jusqu'à
hard-refresh manuel.

Interdit absolu inscrit dans `CLAUDE.md`. Commentaire en tête de
`art-core/public/sw.js` documente l'erreur.

### Leçon
**Service Worker ne doit JAMAIS cacher** : `/_next/`, `/api/`, pages HTML.
Cache uniquement assets statiques avec hash dans le nom (images, fonts).

---

## 6. `<Suspense fallback={...}>` au-dessus de `useSearchParams()`

**Coût** : pages figées en prod (rendu bloqué sur le fallback).

Interdit ajouté dans `CLAUDE.md`. Pattern correct : `window.location.search`
lu dans `useEffect`.

---

## 7. Tokens & secrets exposés en clair

**Coût** : 4 tokens Vercel + 1 clé Anthropic exposés pendant les sessions
(issue #10, label `manual-action-required`).

### Cause
Recopiés dans des messages chat / fichiers de session sans masquage. Aucun
garde-fou côté agent.

### Leçon
**Jamais coller un secret en clair dans un message ou un fichier**, même
"temporairement". Si un secret apparaît dans un retour de commande,
masquer immédiatement et le considérer comme compromis.

---

## 8. Fichiers panic-coded à la racine

**Exemples supprimés** : `PUSH-NOW.ps1`, `DO-EVERYTHING.ps1`, `PUSH.bat`,
`99%` (0 byte), etc.

### Cause
Push bloqué par règle de permission → réponse panique = créer un script
"qui force" au lieu de comprendre la cause (sandbox sans droit push direct).

### Correctif
Règle dans `CLAUDE.md` : *"Lire le code existant avant d'écrire du nouveau.
Préférer modifier un fichier existant que créer un nouveau."*

### Leçon
**Un blocage n'est jamais une raison de créer un nouveau fichier de
contournement.** D'abord comprendre la cause, ensuite agir.

---

## 9. CI Vercel — `set -e` qui amplifie un faux problème

**Coût** : 1 cycle de fix (`ddb7e5a` → `df0a1f3`).

### Bug
Ajout de `set -e` + `curl -sf` "pour être strict" dans le step
"Find Vercel project". Le `VERCEL_TOKEN` est un personal token sans
scope teams → `GET /v2/teams` retourne 403 → `curl -sf` exit 22 →
`set -e` kill le job.

### Correctif (`df0a1f3`)
Retire `set -e` et `-f`, gère explicitement la réponse JSON, continue
sur scope personal si teams échoue.

### Leçon
**Strictness ≠ robustness.** `set -e` dans un script qui doit gérer des
404/403 attendus est un bug, pas un garde-fou. Bien distinguer
"erreur fatale" et "code de retour à inspecter".

---

## 10. Push direct main sans tsc/build local

**Coût** : prod cassée plusieurs fois en quelques minutes (auto-deploy
Vercel sur push to main pendant le sprint kill-switch).

### Correctif
Règle dans `CLAUDE.md` : *"Tout commit doit passer `npx tsc --noEmit`
ET `npm run build` avant push."*

### Leçon
Cette règle ne vaut que si elle est **exécutée**, pas juste écrite. D'où
le pre-commit hook (`scripts/pre-commit.sh`) qui rend la règle obligatoire
au niveau du repo.

---

## Annexe — fichiers à relire en cas de doute

- `CLAUDE.md` (racine) — interdits absolus + patterns obligatoires
- `art-core/CLAUDE.md`, `pass-core/CLAUDE.md`, `prime-core/CLAUDE.md` — contexte par app
- `RAPPORT-CLAUDE-CODE.md` — détail commit-par-commit du commit `0b86091`
- `LIVRAISON-ETAT-2026-05-23.md` — état de la livraison + PRs ouvertes
- `PRE-COMMIT.md` + `scripts/pre-commit.sh` — checklist exécutable
