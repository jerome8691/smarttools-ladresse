# SmartTools V5.12.0 — SmartNews correction local & fiscalité

Correction :
- les thèmes “Local Seine-et-Marne / Melun” et “Fiscalité immobilière” ne bloquent plus si la requête exacte ne trouve rien ;
- SmartNews teste maintenant plusieurs requêtes élargies ;
- Google News RSS passe de `when:7d` à `when:30d` pour les thèmes moins fréquents ;
- si un thème local/fiscalité ne remonte rien, SmartNews bascule sur un socle immobilier général plutôt que d'afficher une erreur ;
- le nombre d'articles reste fixé à 5.

À remplacer :
- `index.html`
- `api/news.js`
- `package.json`

Puis :
- Vercel > Redeploy ;
- CTRL + F5.
