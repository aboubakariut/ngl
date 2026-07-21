# abk-ngl — messages privés (PWA, structure minimale)

## Structure du projet (2 dossiers seulement)

```
index.html          page d'accueil
m.html               formulaire public d'envoi (/m?to=slug)
dashboard.html        dashboard privé (/dashboard?token=...)
style.css             styles partagés
manifest.json          manifest PWA
sw.js                  service worker PWA
init-db.js             crée les tables Supabase au build
package.json / vercel.json / .env.example / .gitignore

api/                 ← dossier 1 (aucun sous-dossier)
  messages.js          POST envoi + PATCH marquage lu
  dashboard.js          POST vérif token + liste des messages

icons/                ← dossier 2 (aucun sous-dossier)
  icon-192.png
  icon-512.png
```

Pas de framework (Next.js imposait des dossiers de routage) : c'est du
HTML/CSS/JS pur pour le front, et des fonctions serverless Vercel pour
l'API (convention native `api/*.js`).

## 1. Variables d'environnement (Vercel > Project Settings > Environment Variables)

- `DATABASE_URL` — Supabase > Database > Connection string > URI
- `SUPABASE_URL` — Supabase > API > Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase > API > service_role key
- `PUBLIC_SLUG` (optionnel, défaut "contact")
- `IPGEO_API_KEY` (optionnel)

## 2. Déploiement

```bash
npx vercel --prod
```

`vercel.json` fait exécuter `init-db.js` à chaque build : les tables
`abk_ngl_*` sont créées automatiquement si absentes. Au premier déploiement,
va dans les **logs de build Vercel** pour récupérer le token d'accès généré
(affiché une seule fois).

## 3. Utilisation

- Page publique : `https://ton-domaine.vercel.app/m?to=contact`
- Dashboard : ouvre **une seule fois** `https://ton-domaine.vercel.app/dashboard?token=TON_TOKEN`
  — le token est alors mémorisé dans le navigateur (`localStorage`) et retiré
  de l'URL. Ensuite, il te suffit d'ouvrir `/dashboard` (sans rien coller)
  pour accéder à tes messages, sur ce même navigateur/appareil.
- Installable comme app (PWA) : uniquement depuis `/dashboard` — la page
  publique `/m` n'est pas installable, pour éviter que les personnes à qui
  tu envoies le lien puissent ajouter "ton" app à leur écran d'accueil.
  L'icône ouvre directement le dashboard (`start_url` dans `manifest.json`).
- Si tu changes de navigateur ou d'appareil, tu dois rouvrir le lien complet
  avec `?token=...` une fois pour le remémoriser à cet endroit-là aussi.
- Si le token est révoqué côté Supabase, il est automatiquement effacé du
  navigateur au prochain chargement.

## Note

Avec `outputDirectory: "."`, les fichiers à la racine (`package.json`,
`init-db.js`...) sont techniquement accessibles en lecture directe par URL
(ex. `/package.json`). Aucun secret n'y figure (les clés sont dans les
variables d'environnement Vercel, jamais dans le code), mais si tu préfères
éviter ça complètement, il faudrait réintroduire un dossier `public/` dédié
aux fichiers statiques — ce qui va à l'encontre de la structure à 2 dossiers
demandée. À toi de voir selon ta priorité.
