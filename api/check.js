// Vercel Serverless Function: /api/check
// La chiave sta nelle variabili d'ambiente di Vercel (ANTHROPIC_API_KEY), mai nella pagina.

const ALLOWED_ORIGINS = [
  // Serve solo se usi la pagina su un altro sito (senza "/" finale). Per la pagina su Vercel non serve.
];
const MODEL = "claude-haiku-5-5";
const MAX_PROMPT = 12000;
const PREFIX = "Sei un insegnante di lettere gentile e preciso.";

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  const sameSite = origin === "https://" + req.headers.host;
  if (origin && !sameSite && !ALLOWED_ORIGINS.includes(origin)) return res.status(403).end();
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || prompt.length > MAX_PROMPT || !prompt.startsWith(PREFIX))
    return res.status(400).end();

  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
    });
  } catch (e) {
    console.error("Rete:", String(e));
    return res.status(502).json({ debug: "Rete: " + String(e) });
  }

  if (!r.ok) {
    const body = await r.text();
    console.error("Anthropic", r.status, body);
    return res.status(r.status === 429 ? 429 : 502).json({ debug: "Anthropic " + r.status + " " + body });
  }

  const data = await r.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  const a = text.indexOf("{"), z = text.lastIndexOf("}");
  try {
    return res.status(200).json(JSON.parse(text.slice(a, z + 1)));
  } catch (e) {
    console.error("JSON non valido:", text);
    return res.status(502).json({ debug: "JSON non valido: " + text });
  }
};
