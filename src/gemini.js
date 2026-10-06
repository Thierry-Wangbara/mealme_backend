// Calls Google's Gemini model. The API key lives only here on the server (from
// .env), never in the Flutter app.
require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function geminiReady() {
  return Boolean(API_KEY);
}

/// Sends a prompt to Gemini and returns the plain-text reply.
/// `system` is optional guidance prepended to steer the assistant.
async function askGemini(userText, system) {
  if (!API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      { role: "user", parts: [{ text: userText }] },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || "Sorry, I couldn't come up with an answer this time.";
}

module.exports = { askGemini, geminiReady };
