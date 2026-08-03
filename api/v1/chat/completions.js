export default async function handler(req, res) {

  console.log("METHOD:", req.method);
  console.log("BODY:", req.body);

  res.status(200).json({
    method: req.method,
    body: req.body
  });

}
