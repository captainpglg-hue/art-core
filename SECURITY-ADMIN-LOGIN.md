# Admin login — comment récupérer ton code après le fix de la vuln

**Mise à jour du 17 avril 2026.** La route `/api/admin/auth/request-code`
ne renvoie plus le code à 6 chiffres dans le body HTTP en production.
Voici comment récupérer ton code selon le contexte.

---

## Cas 1 — tu es en Production sans SMTP configuré

C'est le cas par défaut aujourd'hui. Après avoir cliqué "Envoyer le code"
sur l'interface admin :

1. Ouvre Vercel → ton projet (art-core-final ou pass-core-final)
2. Onglet **Logs** (ou "Runtime Logs")
3. Règle le **Log level** sur `warn` ou `all`
4. Cherche la ligne qui commence par `[admin/request-code] code généré pour captainpglg@gmail.com : `
5. Les 6 chiffres suivants sont ton code, valable 10 minutes
6. Retourne sur la page de login admin et entre-les

Ligne type à chercher :

    [admin/request-code] code généré pour captainpglg@gmail.com : 473892 (expire à 2026-04-17T14:32:18.000Z, email_sent=false)

---

## Cas 2 — tu veux tester sans toucher à Vercel (Preview ou local)

Rien à faire. Sur Preview (`VERCEL_ENV=preview`) ou en local (`npm run dev`),
la réponse JSON inclut automatiquement `dev_code` pour les tests.

Exemple de réponse en Preview :

```json
{
  "success": true,
  "message": "Code généré. Consulte les logs Vercel ou contacte l'administrateur.",
  "dev_code": "473892",
  "dev_email_url": null,
  "dev_notice": "dev_code exposé car ADMIN_DEV_CODE_ENABLED=1 ou VERCEL_ENV != production. Ne mets JAMAIS ADMIN_DEV_CODE_ENABLED sur le scope Production."
}
```

---

## Cas 3 — tu as un besoin ponctuel d'exposer le dev_code en Production

**À éviter**, mais si vraiment tu dois (par exemple pour un test de régression
depuis un CI/CD externe qui n'a pas accès aux logs Vercel) :

1. Vercel → Settings → Environment Variables
2. Ajoute `ADMIN_DEV_CODE_ENABLED=1`
3. Scope : **Production** (cocher)
4. Redeploy sans cache
5. Fais ton test
6. **IMMÉDIATEMENT APRÈS** : supprime la variable et redeploy

Tant que cette variable est à `1` en Production, la vuln initiale est
de fait réintroduite : n'importe qui peut récupérer un code admin en
connaissant ton email.

---

## Cas 4 — tu veux résoudre le problème à la racine

Configure un mailer. Deux options simples :

### Option A : Resend (le plus rapide, gratuit jusqu'à 3000 mails/mois)

1. Crée un compte sur [resend.com](https://resend.com)
2. Vérifie le domaine `art-core.app` (ou `pass-core.app`) via enregistrements DNS
3. Récupère une API key
4. Vercel → Environment Variables → ajoute :
   - `RESEND_API_KEY=re_xxx...`
   - `RESEND_FROM=admin@art-core.app`
5. Vérifie que `lib/mailer.ts` → `sendAdminCode()` utilise bien Resend (sinon
   adapte-le, c'est ~20 lignes)
6. Redeploy

Une fois configuré, le code part bien dans ta boîte mail et tu n'as plus
besoin des logs Vercel ni de l'escape hatch.

### Option B : SMTP classique (Gmail, SendGrid, Mailgun, etc.)

Variables à définir :

- `SMTP_HOST`
- `SMTP_PORT` (587 ou 465)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

---

## Rate limit

Le fix inclut aussi une protection contre le spam : si un code non-utilisé
a été généré pour ton email il y a moins de 60 secondes, la route répond
`429 Too Many Requests` avec un header `Retry-After: 60`.

Si tu vois cette erreur en cliquant "Envoyer le code", patiente 1 minute
ou utilise le dernier code déjà généré (tu le retrouves dans les logs
Vercel comme au Cas 1).

---

## Vérification rapide que le fix est bien déployé

```bash
# Doit retourner success=true mais PAS de dev_code en production
curl -X POST https://art-core.app/api/admin/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"email":"captainpglg@gmail.com","name":"Philippe"}' \
  | jq
```

Réponse attendue en prod :

```json
{
  "success": true,
  "message": "Code généré. Consulte les logs Vercel ou contacte l'administrateur."
}
```

Si tu vois un `dev_code` dans la réponse → la variable `ADMIN_DEV_CODE_ENABLED=1`
traîne encore sur le scope Production, il faut la retirer.
