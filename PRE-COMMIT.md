# PRE-COMMIT — checklist exécutable

> Référence pour la règle CLAUDE.md : *"Tout commit doit passer
> `tsc --noEmit` ET `npm run build` avant push."* Cette checklist est
> exécutée automatiquement par `scripts/pre-commit.sh` une fois installé
> comme hook git (voir § Installation).

---

## Checklist (en ordre, fail-fast)

### 0. Avant de coder

- [ ] Lire le fichier existant **avant** d'en créer un nouveau.
- [ ] Si la modif touche un schéma DB : `\d table_name` dans psql ou
      requête `information_schema.columns` pour confirmer les noms +
      types réels. **Ne pas deviner.**

### 1. Typage strict — interdits

- [ ] **Aucun nouveau `as any` introduit.** Cherche un type précis
      (`as { foo: string }` au pire). Si vraiment impossible, justifier
      en commentaire `// as any: <raison + ticket>`.
- [ ] Aucune fonction publique ne retourne `Promise<unknown>` ou
      `Promise<Record<string, any>[]>`. Type retour explicite obligatoire.
- [ ] Toute fonction qui prend des filtres optionnels a une interface
      `Opts` typée (modèle : `GetArtworksOpts` dans `art-core/lib/db.ts`).

### 2. Garde-fous DB

- [ ] Toute lecture de colonne nullable est null-guardée :
      `(user.points_balance ?? 0)`, `user.role && ROLES.includes(user.role)`.
- [ ] Tout helper DB qui tente postgres-js → REST gère le **double-échec**
      (retourne `undefined`/`[]`, ne throw pas).
- [ ] Tout `fetch` vers Supabase REST utilise `cache: "no-store"`.

### 3. Front

- [ ] Aucun `<Suspense fallback={...}>` au-dessus de `useSearchParams()`.
- [ ] Toute page client qui dépend de `/api/auth/me` utilise
      `useAuthCheck` (`art-core/hooks/use-auth-check.ts`).
- [ ] Service Worker : aucune route `/_next/`, `/api/`, ni HTML ajoutée
      au cache.

### 4. Tests

- [ ] Si la modif touche une page critique : au moins une assertion
      Playwright sur le **contenu réel**, pas seulement le status code.
      (Ex. `expect(markets.length).toBeGreaterThan(0)`.)
- [ ] Si la modif touche une migration SQL : ajouter une entrée à
      `MIGRATION-APPLIQUER-*.md` (procédure manuelle pour humain).

### 5. Build (automatisé par le hook)

- [ ] `npx tsc --noEmit` passe sur **chaque app affectée**.
- [ ] `npm run build` passe sur **chaque app affectée**.

### 6. Secrets

- [ ] Aucun token, clé API, mot de passe collé en clair dans un fichier
      (y compris docs `.md`). Si un secret apparaît dans un retour de
      commande, le masquer et le considérer comme compromis.

### 7. Push

- [ ] Branche dev correcte (jamais push direct sur main pendant le sprint
      kill-switch, sauf instruction explicite humaine).
- [ ] `git push -u origin <branch>` (jamais `--force` sur main, jamais
      `--no-verify`).

---

## Installation du hook (réel, exécutable)

Le script `scripts/pre-commit.sh` automatise les étapes **1**, **5**, **6**.
Pour l'installer comme hook git local :

```bash
# Depuis la racine du repo
ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x scripts/pre-commit.sh
```

Le hook tournera automatiquement avant chaque `git commit`. Pour bypasser
en cas d'urgence (à éviter), `git commit --no-verify` — mais cela
**doit** être suivi immédiatement par une vérif manuelle de la checklist.

### Pourquoi un lien symbolique
Les fichiers dans `.git/hooks/` ne sont pas versionnés. Le lien permet
de versionner le script et de bénéficier de toute mise à jour future
sans re-copier à la main.

---

## Mode CI (vérification après push)

Si le hook local n'a pas été installé (nouveau clone, etc.), le workflow
GitHub Actions `smoke-tests.yml` rattrape les régressions visibles
(tsc/build/data-flow) mais avec un délai : la prod peut être cassée
quelques minutes avant que le test ne devienne rouge.

**Le hook local reste la première ligne de défense.**
