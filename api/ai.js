import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const systemPrompt = `
Tu es SmartTools, copilote métier pour l'agence immobilière L'Adresse CONCEPT PREMIUM.
Réponds en français, de façon concrète, utile en agence, sans jargon.
Tu dois répondre de manière courte et directement exploitable.
Structure la réponse avec :
1. Diagnostic terrain
2. Arguments simples
3. Mail/SMS/script prêt à copier si pertinent
4. Prochaine action concrète
`;

function buildUserPrompt(module, prompt) {
  const isNews = String(module || "").toLowerCase().includes("smartnews");
  const lengthInstruction = isNews
    ? "Réponse attendue : synthèse approfondie entre 800 et 1200 mots si les sources le permettent, structurée, concrète et exploitable en agence."
    : "Réponse attendue : maximum 450 mots, pas de théorie, uniquement exploitable en agence.";

  return `[${module}]\n${prompt}\n\n${lengthInstruction}`;
}

function fallback(module, prompt, errors = []) {
  const details = errors.length ? `\n\nDétails techniques :\n${errors.map(e => `• ${e}`).join("\n")}` : "";
  return `MODE TEST — IA non disponible dans le délai

Module : ${module}
Demande : ${prompt}

SmartTools a essayé d'appeler l'IA, mais le moteur n'a pas répondu assez vite.

À vérifier :
1. GEMINI_MODEL = gemini-3.1-flash-lite
2. AI_PROVIDER = gemini
3. Redéploiement Vercel en Production

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

function withTimeout(promise, ms, label) {
  let timeout;
  const timer = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} : délai dépassé après ${Math.round(ms/1000)} secondes`)), ms);
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(timeout));
}

async function tryOpenAI(module, prompt) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY absente");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await withTimeout(client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildUserPrompt(module, prompt) }
    ],
    max_output_tokens: 1800
  }), 22000, "OpenAI");

  const text = response.output_text || "";
  if (!text.trim()) throw new Error("OpenAI : réponse vide");
  return { provider: "OpenAI", text };
}

function extractGeminiText(interaction) {
  if (interaction?.output_text && String(interaction.output_text).trim()) return String(interaction.output_text).trim();
  if (interaction?.text && String(interaction.text).trim()) return String(interaction.text).trim();

  const found = [];
  const walk = (obj, depth = 0) => {
    if (!obj || depth > 8) return;
    if (Array.isArray(obj)) return obj.forEach(x => walk(x, depth + 1));
    if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if ((k === "text" || k === "output_text" || k === "outputText") && typeof v === "string" && v.trim()) found.push(v.trim());
        else walk(v, depth + 1);
      }
    }
  };
  walk(interaction);
  return found.join("\n").trim();
}

async function tryGemini(module, prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY absente");

  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const interaction = await withTimeout(ai.interactions.create({
    model,
    system_instruction: systemPrompt,
    input: buildUserPrompt(module, prompt),
    generation_config: {
      temperature: 0.3,
      thinking_level: "low",
      max_output_tokens: 1800
    }
  }), 22000, "Gemini");

  const text = extractGeminiText(interaction);
  if (!text.trim()) throw new Error(`Gemini : réponse vide avec ${model}`);
  return { provider: `Gemini (${model})`, text };
}

async function tryGroq(module, prompt) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY absente");

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 22000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
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
        temperature: 0.3,
        max_tokens: 900
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Groq ${response.status} : ${data?.error?.message || "erreur API"}`);

    const text = data?.choices?.[0]?.message?.content || "";
    if (!text.trim()) throw new Error("Groq : réponse vide");
    return { provider: `Groq (${model})`, text };
  } finally {
    clearTimeout(t);
  }
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
  const preferred = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const errors = [];

  try {
    if (preferred && preferred !== "auto" && preferred !== "demo") {
      const result = await runProvider(preferred, module, prompt);
      return res.status(200).json({ demo: false, provider: result.provider, text: result.text });
    }

    if (preferred === "demo") {
      return res.status(200).json({ demo: true, provider: "demo", text: fallback(module, prompt) });
    }

    for (const provider of ["gemini", "groq", "openai"]) {
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
