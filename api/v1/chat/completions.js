export default async function handler(req, res) {

  // =========================
  // CORS
  // =========================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Gateway-Key"
  );


  // =========================
  // OPTIONS
  // =========================

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  // =========================
  // Проверка Gateway Key
  // =========================

  const gatewayKey =
    req.headers["x-gateway-key"] ||
    req.headers.authorization?.replace(
      "Bearer ",
      ""
    );


  if (
    gatewayKey !== process.env.GATEWAY_KEY
  ) {

    return res.status(401).json({
      error: {
        message: "Invalid gateway key"
      }
    });

  }


  // =========================
  // Только POST
  // =========================

  if (req.method !== "POST") {

    return res.status(405).json({
      error: {
        message: "Only POST allowed"
      }
    });

  }


  try {

    const body = req.body;


    if (
      !body ||
      !body.messages
    ) {

      return res.status(400).json({
        error: {
          message: "Missing messages"
        }
      });

    }


    // =========================
    // OpenRouter request
    // =========================

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {

        method: "POST",

        headers: {

          "Authorization":
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "Content-Type":
            "application/json",

          "HTTP-Referer":
            "https://roo-ai-gateway.vercel.app",

          "X-Title":
            "Roo AI Gateway"

        },


        body: JSON.stringify({

          model:
            body.model ||
            "openai/gpt-4o-mini",

          messages:
            body.messages,


          temperature:
            body.temperature,


          max_tokens:
            body.max_tokens,


          stream:
            body.stream || false,


          tools:
            body.tools,


          tool_choice:
            body.tool_choice

        })

      }
    );


    // =========================
    // Streaming response
    // =========================

    if (
      body.stream === true
    ) {


      res.setHeader(
        "Content-Type",
        "text/event-stream"
      );

      res.setHeader(
        "Cache-Control",
        "no-cache"
      );

      res.setHeader(
        "Connection",
        "keep-alive"
      );


      const reader =
        response.body.getReader();


      while (true) {


        const {
          done,
          value
        } =
          await reader.read();


        if (done) {
          break;
        }


        res.write(
          Buffer.from(value)
        );

      }


      return res.end();

    }



    // =========================
    // Обычный JSON ответ
    // =========================


    const data =
      await response.json();


    return res
      .status(response.status)
      .json(data);



  } catch (error) {


    console.error(
      "Gateway error:",
      error
    );


    return res.status(500).json({

      error: {

        message:
          error.message

      }

    });

  }

}
