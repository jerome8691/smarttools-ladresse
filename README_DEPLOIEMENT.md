# SmartTools V5.11.2 — SmartNews renforcé + diagnostic

Correction :
- SmartNews affiche maintenant le moteur réellement utilisé et les détails techniques.
- Le retour IA est beaucoup plus approfondi.
- SmartNews ne dépend plus uniquement de GNews ou NewsAPI :
  1. GNews si `GNEWS_API_KEY` est présente ;
  2. NewsAPI si `NEWS_API_KEY` est présente ;
  3. Tavily si `TAVILY_API_KEY` est présente ;
  4. Google News RSS en secours sans clé.
- La période de recherche passe à 3 jours pour éviter “aucun résultat” sur les sujets immobiliers très ciblés.
- L'endpoint `/api/news` accepte maintenant GET pour tester rapidement si l'API est bien déployée.

Test rapide après déploiement :
- ouvrir `https://TON-SITE.vercel.app/api/news`
- tu dois voir :
  - `status: ok`
  - quelles clés sont détectées true/false.

Fichiers importants :
- `index.html`
- `api/news.js`
- `api/ai.js`
- `vercel.json`
- `package.json`

Après remplacement :
- commit GitHub ;
- Vercel > Redeploy.
