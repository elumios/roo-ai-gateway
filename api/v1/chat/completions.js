export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Gateway-Key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const gatewayKey = req.headers["x-gateway-key"] || req.headers.authorization?.replace("Bearer ", "");
  if (gatewayKey !== process.env.GATEWAY_KEY) {
    return res.status(401).json({ error: { message: "Invalid gateway key" } });
  }

  // Vercel body parser fix
  let body = req.body;
  if (!body || typeof body === 'string') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    try { body = JSON.parse(raw); } catch {}
  }

  console.log("INCOMING BODY KEYS:", body ? Object.keys(body) : "NO BODY", "MODEL:", body?.model);

  if (!body?.messages) {
    console.error("MISSING MESSAGES, BODY:", JSON.stringify(body).slice(0, 500));
    return res.status(400).json({ error: { message: "Missing messages" } });
  }

  const model = body.model || "openai/gpt-4o-mini";
  const isMeta = model.startsWith("meta/");
  const useStream = false; // пока без стрима для дебага

  const cleanBody = { model, messages: body.messages, stream: false };
  if (body.temperature != null) cleanBody.temperature = body.temperature;
  if (body.max_tokens) cleanBody.max_tokens = body.max_tokens;
  if (body.tools?.length > 0) {
    cleanBody.tools = body.tools;
    cleanBody.tool_choice = body.tool_choice;
  }

  const apiUrl = isMeta 
    ? "https://api.llama.com/compat/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  
  const headers = isMeta
    ? { "Authorization": `Bearer ${process.env.META_API_KEY}`, "Content-Type": "application/json" }
    : { 
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roo-ai-gateway.vercel.app",
        "X-Title": "Roo AI Gateway"
      };

  console.log("FETCHING:", apiUrl, "MODEL:", model);
  const response = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify(cleanBody) });
  const data = await response.json();
  
  console.log("UPSTREAM STATUS:", response.status, "MODEL:", model, "CHOICES:", data.choices?.length, "FULL:", JSON.stringify(data).slice(0, 3000));

  return res.status(response.status).json(data);
}
