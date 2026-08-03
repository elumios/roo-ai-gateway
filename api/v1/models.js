export default function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.status(200).json({
    object: "list",
    data: [
      {
        id: "openai/gpt-4o-mini",
        object: "model",
        owned_by: "openai"
      },
      {
        id: "google/gemini-2.0-flash-exp",
        object: "model",
        owned_by: "google"
      },
      {
        id: "deepseek/deepseek-chat",
        object: "model",
        owned_by: "deepseek"
      }
    ]
  });

}
