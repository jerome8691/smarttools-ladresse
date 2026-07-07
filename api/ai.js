import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

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

SmartTools a essayé les moteurs disponibles mais aucun n'a répondu.

À vérifier :
1. Variables Vercel en Production
2. Redéploiement Vercel après ajout des variables
3. AI_PROVIDER = gemini
4. GEMINI_MODEL = gemini-3.5-flash

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

function extractGeminiText(interaction) {
  if (interaction?.output_text && String(interaction.output_text).trim()) {
    return String(interaction.output_text).trim();
  }

  if (interaction?.text && String(interaction.text).trim()) {
    return String(interaction.text).trim();
  }

  const found = [];
  const walk = (obj, depth = 0) => {
    if (!obj || depth > 8) return;
    if (Array.isArray(obj)) {
      obj.forEach(x => walk(x, depth + 1));
      return;
    }
    if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if ((k === "text" || k === "output_text" || k === "outputText") && typeof v === "string" && v.trim()) {
          found.push(v.trim());
        } else {
          walk(v, depth + 1);
        }
      }
    }
  };
  walk(interaction);
  return found.join("\n").trim();
}

async function tryGemini(module, prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY absente");

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const interaction = await ai.interactions.create({
    model,
    system_instruction: systemPrompt,
    input: buildUserPrompt(module, prompt),
    generation_config: {
      temperature: 0.4,
      thinking_level: "low"
    }
  });

  const text = extractGeminiText(interaction);
  if (!text.trim()) {
    throw new Error(`Gemini : réponse vide avec ${model}. Essayez GEMINI_MODEL=gemini-3.5-flash ou vérifiez l'accès au modèle dans Google AI Studio.`);
  }

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
  if (!response.ok) throw new Error(`Groq ${response.status} : ${data?.error?.message || "erreur API"}`);

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

    for (const provider of ["openai", "gemini", "groq"]) {
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
