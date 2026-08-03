export default async function handler(req, res) {

  try {

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: "Ответь одним словом: работает"
            }
          ]
        })
      }
    );


    const data = await response.json();

    return res.status(response.status).json(data);


  } catch (error) {

    return res.status(500).json({
      error: error.message
    });

  }

}
