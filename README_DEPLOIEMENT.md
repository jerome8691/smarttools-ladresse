# SmartTools V5.10.3 — IA gratuite / multi-moteurs

Cette version ajoute un serveur IA multi-fournisseurs.

Ordre de fonctionnement par défaut (`AI_PROVIDER=auto`) :
1. OpenAI si `OPENAI_API_KEY` fonctionne
2. Gemini si `GEMINI_API_KEY` fonctionne
3. Groq si `GROQ_API_KEY` fonctionne
4. Mode test dynamique si aucun moteur ne répond

Variables Vercel à ajouter :
- `AI_PROVIDER` = `auto`
- `GEMINI_API_KEY` = votre clé Google AI Studio
- `GEMINI_MODEL` = `gemini-3.5-flash`
- optionnel : `GROQ_API_KEY`
- optionnel : `GROQ_MODEL` = `llama-3.1-8b-instant`

Pour forcer Gemini :
- `AI_PROVIDER` = `gemini`

Pour forcer Groq :
- `AI_PROVIDER` = `groq`

Fichiers à déposer dans GitHub :
- `index.html`
- `api/ai.js`
- `package.json`
- `vercel.json`

Puis redéployer dans Vercel.
