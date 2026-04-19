import OpenAI from "openai";

let openaiClient;

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: key });
  return openaiClient;
}

/** @param {{ system?: string, user: string, json?: boolean }} opts */
export async function completeWithOpenAI(opts) {
  const client = getOpenAI();
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.user },
  ];
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
  });
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty AI response");
  return text;
}

/** Gemini REST — requires GEMINI_API_KEY */
export async function completeWithGemini(opts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const apiVersion = (process.env.GEMINI_API_VERSION || "v1beta").trim();
  const model = (process.env.GEMINI_MODEL || "gemini-flash-latest").trim();
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${encodeURIComponent(
    key
  )}`;
  const parts = [];
  if (opts.system) {
    parts.push({ text: `System instructions:\n${opts.system}\n\n` });
  }
  parts.push({ text: opts.user });
  const body = {
    contents: [{ role: "user", parts: [{ text: parts.map((p) => p.text).join("") }] }],
    generationConfig: opts.json
      ? { responseMimeType: "application/json" }
      : undefined,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text.trim()) throw new Error("Empty Gemini response");
  return text.trim();
}

export async function completeAI(opts) {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "gemini") return completeWithGemini(opts);
  return completeWithOpenAI(opts);
}
