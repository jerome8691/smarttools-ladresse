import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const systemPrompt = `
Tu es SmartTools, copilote métier pour une agence immobilière transaction L'Adresse.
Réponds en français, de façon concrète, utile en agence, sans jargon.
Structure toujours la réponse avec :
1. Diagnostic terrain
2. Arguments ou calculs à expliquer simplement
3. Mail/SMS/script prêt à copier si pertinent
4. Prochaine action concrète
Rappelle si nécessaire que SmartTools ne remplace pas le CRM : il prépare le rendez-vous, les mots, les calculs et les décisions.
`;

function fallback(module, prompt) {
  return `MODE DÉMO — IA non connectée

Module : ${module}
Demande : ${prompt}

Réponse exemple :
1. Diagnostic terrain
Le sujet doit être traité avec une réponse simple, factuelle et orientée action.

2. Arguments
• Repartir du besoin client.
• S'appuyer sur les chiffres et le marché.
• Transformer le sujet en décision concrète.

3. Phrase prête à dire
« Mon rôle est de sécuriser votre projet et d'éviter de perdre du temps avec une stratégie qui ne produit pas de résultat. »

4. Prochaine action
Programmer un point court, valider la décision, puis envoyer un écrit récapitulatif.

Ajoutez OPENAI_API_KEY dans Vercel pour activer la vraie IA.`;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { module = "SmartTools", prompt = "" } = req.body || {};

    if (!client) {
      return res.status(200).json({
        demo: true,
        text: fallback(module, prompt)
      });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `[${module}]\n${prompt}` }
      ]
    });

    return res.status(200).json({
      demo: false,
      text: response.output_text || "Réponse IA vide."
    });
  } catch (error) {
    return res.status(500).json({
      demo: true,
      text: `Erreur API IA : ${error.message}`
    });
  }
}
