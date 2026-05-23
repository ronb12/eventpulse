const { getDashboard, json } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const payload = await getDashboard();
    return json(res, 200, payload);
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
