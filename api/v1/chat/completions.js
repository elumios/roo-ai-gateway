export default async function handler(req, res) {

  // =========================
  // CORS
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Gateway-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // =========================
  // Gateway protection
  // =========================
  const gatewayKey =
    req.headers["x-gateway-key"] ||
    req.headers.authorization?.replace("Bearer ", "");

  if (gatewayKey !== process.env.GATEWAY_KEY) {
    return res.status(401).json({
      error: { message: "Invalid gateway key" }
    });
  }

  // =========================
  // POST only
  // =========================
  if (req.method !== "POST") {
    return res.status(405).json({
      error: { message: "Only POST allowed" }
    });
  }

  try {
    const body = req.body;

    if (!body || !body.messages) {
      return res.status(400).json({
        error: { message: "Missing messages" }
      });
    }

    const model = body.model || "deepseek/deepseek-chat";
    const isMetaModel = model.startsWith("meta/");

    // Gemini ломается со streaming на OpenRouter - оставляем фикс
    const useStream = model.includes("gemini") ? false : body.stream || false;

    // =========================
    // ROUTING LOGIC
    // =========================
    let apiUrl;
    let headers;
    let requestBody;

    if (isMetaModel) {
      // Meta API - напрямую
      apiUrl = "https://api.llama.com/compat/v1/chat/completions";
      headers = {
        "Authorization": `Bearer ${process.env.META_API_KEY}`,
        "Content-Type": "application/json"
      };
      requestBody = {
        model: model,
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        stream: useStream,
        tools: body.tools,
        tool_choice: body.tool_choice
      };
    } else {
      // OpenRouter - все остальное
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roo-ai-gateway.vercel.app",
        "X-Title": "Roo AI Gateway"
      };
      requestBody = {
        model: model,
        messages: body.messages,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        stream: useStream,
        tools: body.tools,
        tool_choice: body.tool_choice
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    // =========================
    // Streaming response
    // =========================
    if (useStream === true) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    }

    // =========================
    // JSON response
    // =========================
    const data = await response.json();

    console.log("MODEL:", model, "| ROUTED TO:", isMetaModel ? "META" : "OPENROUTER");
    console.log("RESPONSE:", JSON.stringify(data).slice(0, 1000));

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Gateway error:", error);
    return res.status(500).json({
      error: { message: error.message }
    });
  }
}
