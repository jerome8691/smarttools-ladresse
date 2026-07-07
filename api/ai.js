import OpenAI from "openai";

const systemPrompt = `
Tu es SmartTools, copilote métier pour l'agence immobilière L'Adresse CONCEPT PREMIUM.
Réponds en français, de façon concrète, utile en agence, sans jargon.
Structure toujours la réponse avec :
1. Diagnostic terrain
2. Arguments ou calculs à expliquer simplement
3. Mail/SMS/script prêt à copier si pertinent
4. Prochaine action concrète
Rappelle si nécessaire que SmartTools ne remplace pas le CRM : il prépare le rendez-vous, les mots, les calculs et les décisions.
`;

function buildUserPrompt(module, prompt) {
  return `[${module}]\n${prompt}`;
}

function fallback(module, prompt, errors = []) {
  const details = errors.length ? `\n\nDétails techniques :\n${errors.map(e => `• ${e}`).join("\n")}` : "";
  return `MODE TEST — aucune IA gratuite/API disponible

Module : ${module}
Demande : ${prompt}

SmartTools a essayé les moteurs disponibles mais aucun n'a répondu avec les variables actuelles.

Pour obtenir une vraie réponse IA gratuite ou très économique :
1. Ajoutez GEMINI_API_KEY dans Vercel
2. ou ajoutez GROQ_API_KEY dans Vercel
3. Redéployez le projet

Réponse exemple :
1. Diagnostic terrain
Le sujet doit être transformé en action simple, claire et directement utilisable.

2. Arguments
• Repartir du besoin client.
• S'appuyer sur les faits terrain.
• Proposer une action datée.

3. Phrase prête à dire
« Mon rôle est de sécuriser votre projet et de vous aider à prendre la bonne décision avec des éléments concrets. »

4. Prochaine action
Faire un point court, valider la décision, puis envoyer un écrit récapitulatif.${details}`;
}

async function tryOpenAI(module, prompt) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY absente");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(module, prompt) }
    ]
  });

  const text = response.output_text || "";
  if (!text.trim()) throw new Error("OpenAI : réponse vide");
  return { provider: "OpenAI", text };
}

async function tryGemini(module, prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY absente");

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      system_instruction: systemPrompt,
      input: buildUserPrompt(module, prompt),
      generation_config: {
        temperature: 0.4,
        thinking_level: "low"
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Gemini ${response.status} : ${data?.error?.message || "erreur API"}`);
  }

  const text = data.output_text || "";
  if (!text.trim()) throw new Error("Gemini : réponse vide");
  return { provider: `Gemini (${model})`, text };
}

async function tryGroq(module, prompt) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY absente");

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserPrompt(module, prompt) }
      ],
      temperature: 0.4,
      max_tokens: 1400
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Groq ${response.status} : ${data?.error?.message || "erreur API"}`);
  }

  const text = data?.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("Groq : réponse vide");
  return { provider: `Groq (${model})`, text };
}

async function runProvider(provider, module, prompt) {
  if (provider === "openai") return await tryOpenAI(module, prompt);
  if (provider === "gemini") return await tryGemini(module, prompt);
  if (provider === "groq") return await tryGroq(module, prompt);
  throw new Error(`Moteur inconnu : ${provider}`);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Méthode non autorisée" });

  const { module = "SmartTools", prompt = "" } = req.body || {};
  const preferred = (process.env.AI_PROVIDER || "auto").toLowerCase();
  const errors = [];

  try {
    if (preferred && preferred !== "auto" && preferred !== "demo") {
      const result = await runProvider(preferred, module, prompt);
      return res.status(200).json({ demo: false, provider: result.provider, text: result.text });
    }

    if (preferred === "demo") {
      return res.status(200).json({ demo: true, provider: "demo", text: fallback(module, prompt) });
    }

    const providers = ["openai", "gemini", "groq"];
    for (const provider of providers) {
      try {
        const result = await runProvider(provider, module, prompt);
        return res.status(200).json({ demo: false, provider: result.provider, text: result.text });
      } catch (error) {
        errors.push(error.message);
      }
    }

    return res.status(200).json({ demo: true, provider: "demo", text: fallback(module, prompt, errors) });
  } catch (error) {
    return res.status(200).json({
      demo: true,
      provider: "demo",
      text: fallback(module, prompt, [error.message])
    });
  }
}
