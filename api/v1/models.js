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
        created: 1700000000,
        owned_by: "openai"
      },
      {
        id: "google/gemini-2.0-flash-exp",
        object: "model",
        created: 1700000000,
        owned_by: "google"
      },
      {
        id: "google/gemini-2.5-flash",
        object: "model",
        created: 1700000000,
        owned_by: "google"
      },
      {
        id: "deepseek/deepseek-chat",
        object: "model",
        created: 1700000000,
        owned_by: "deepseek"
      },
      {
        id: "meta/muse-spark-1.3",
        object: "model",
        created: 1700000000,
        owned_by: "meta"
      },
      {
        id: "meta/muse-spark-1.2",
        object: "model",
        created: 1700000000,
        owned_by: "meta"
      }
    ]
  });

}
