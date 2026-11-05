// Vercel Serverless Function: /api/check
// La chiave sta nelle variabili d'ambiente di Vercel (ANTHROPIC_API_KEY), mai nella pagina.

const ALLOWED_ORIGINS = [
  "https://cavalcanti-plqltpipu-sbirulino.vercel.app/",  // <-- cambia con il tuo dominio Vercel (e aggiungi il dominio GitHub Pages, se lo usi)
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

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
  });
  if (r.status === 429) { console.error("Anthropic 429", await r.text()); return res.status(429).end(); }
  if (!r.ok) { console.error("Anthropic", r.status, await r.text()); return res.status(502).end(); }

  const data = await r.json();
  const text = (data.content || []).map(b => b.text || "").join("");
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  try { return res.status(200).json(JSON.parse(text.slice(a, b + 1))); }
  catch { console.error("JSON non valido:", text); return res.status(502).end(); }

  const data = await r.json();
  const text = (data.content || []).map(b => b.text || "").join("");
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  try { return res.status(200).json(JSON.parse(text.slice(a, b + 1))); }
  catch { return res.status(502).end(); }
};
