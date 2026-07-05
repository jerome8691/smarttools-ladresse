# SmartTools V5.9 — Graal Candidate Finale

## Objectif
Version candidate finale de présentation + pack prêt pour déploiement cloud.

## Démo immédiate
Ouvrir `index.html` directement dans le navigateur.

## GitHub Pages
1. Renommer / garder `index.html` à la racine.
2. Déposer le fichier dans le repo `smarttools-ladresse`.
3. Settings > Pages > Deploy from a branch > main / root.

## Vercel + IA réelle
1. Importer le repo GitHub dans Vercel.
2. Ajouter les variables d'environnement :
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
3. Déployer.

## Important
Ne jamais mettre une clé API dans le fichier `index.html`.
La clé doit rester côté serveur / variables Vercel.
