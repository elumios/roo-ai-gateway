export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Gateway-Key");
  if (req.method === "OPTIONS") return res.status(200).end();

  const gatewayKey = req.headers["x-gateway-key"] || req.headers.authorization?.replace("Bearer ", "");
  if (gatewayKey !== process.env.GATEWAY_KEY) {
    return res.status(401).json({ error: { message: "Invalid gateway key" } });
  }
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Only POST allowed" } });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.messages) return res.status(400).json({ error: { message: "Missing messages" } });

    const model = body.model || "openai/gpt-4o-mini";
    const isMeta = model.startsWith("meta/");
    const useStream = model.includes("gemini") ? false : body.stream || false;

    // === ФИКС ПУСТОГО ОТВЕТА ===
    // Убираем пустые tools и null max_tokens - из-за них free модели отдают []
    const cleanBody = {
      model: model,
      messages: body.messages,
      stream: useStream,
    };
    if (body.temperature != null) cleanBody.temperature = body.temperature;
    if (body.max_tokens) cleanBody.max_tokens = body.max_tokens;
    if (body.tools && body.tools.length > 0) {
      cleanBody.tools = body.tools;
      if (body.tool_choice) cleanBody.tool_choice = body.tool_choice;
    }

    let apiUrl, headers;
    if (isMeta) {
      apiUrl = "https://api.llama.com/compat/v1/chat/completions";
      headers = { "Authorization": `Bearer ${process.env.META_API_KEY}`, "Content-Type": "application/json" };
    } else {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roo-ai-gateway.vercel.app",
        "X-Title": "Roo AI Gateway"
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(cleanBody)
    });

    if (useStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (response.body) {
        const { Readable } = await import('node:stream');
        Readable.fromWeb(response.body).pipe(res);
        return;
      }
    }

    const data = await response.json();
    console.log("MODEL:", model, "STATUS:", response.status, "DATA:", JSON.stringify(data).slice(0, 2000));

    if (!response.ok) return res.status(response.status).json(data);

    // Если OpenRouter вернул пустой choices - отдаем ошибку человеческим текстом, чтобы Roo Code показал ее
    if (!data.choices || data.choices.length === 0) {
      return res.status(200).json({
        id: data.id || "chatcmpl-error",
        object: "chat.completion",
        created: Date.now(),
        model: model,
        choices: [{
          index: 0,
          message: { role: "assistant", content: `Upstream returned empty. Full upstream: ${JSON.stringify(data).slice(0, 1000)}` },
          finish_reason: "stop"
        }]
      });
    }

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Gateway error:", error);
    return res.status(500).json({ error: { message: error.message } });
  }
}
