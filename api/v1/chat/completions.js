export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST allowed"
    });
  }


  try {

    const body = await req.json?.() || req.body;


    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${process.env.OPENROUTER_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(body)
      }
    );


    const data = await response.json();

    return res
      .status(response.status)
      .json(data);


  } catch (error) {

    return res.status(500).json({
      error: error.message
    });

  }

}
