# SmartTools V5.10.4 — Gemini corrigé

Correction :
- le moteur Gemini utilise maintenant le SDK officiel `@google/genai` ;
- la lecture de la réponse Gemini est corrigée ;
- l'erreur « Gemini : réponse vide » doit disparaître si la clé et le modèle sont valides.

Variables Vercel recommandées :
- `AI_PROVIDER` = `gemini`
- `GEMINI_API_KEY` = votre clé Google AI Studio
- `GEMINI_MODEL` = `gemini-3.5-flash`

Fichiers à remplacer dans GitHub :
- `api/ai.js`
- `package.json`
- `index.html`
- `vercel.json`

Puis faire un Redeploy Vercel.
