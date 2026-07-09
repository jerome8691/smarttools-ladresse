# SmartTools V5.11.5 — SmartNews articles d'abord

Correction importante :
- SmartNews récupère et affiche maintenant les articles AVANT de lancer la synthèse Gemini.
- Si Gemini met trop longtemps, les articles restent visibles et le bouton se débloque.
- Le front appelle maintenant `/api/news?q=...&limit=...` en GET, plus facile à tester dans le navigateur.
- `/api/news` sans q reste le diagnostic.
- `/api/news?q=taux%20de%20credit&limit=12` lance une vraie recherche articles.

Tests après déploiement :
1. `https://TON-SITE.vercel.app/api/news`
   -> diagnostic avec NEWS_API_KEY true/false
2. `https://TON-SITE.vercel.app/api/news?q=taux%20de%20credit&limit=12`
   -> doit retourner des articles ou une erreur détaillée
3. SmartNews dans l'interface

À remplacer :
- `index.html`
- `api/news.js`
- `api/ai.js`
- `vercel.json`
- `package.json`
