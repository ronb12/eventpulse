const { sql, ensureSchema, getDashboard, json } = require("./_db");

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!body.eventId || !body.name || !body.service) {
        return json(res, 400, { error: "Missing required vendor fields" });
      }

      await sql`
        INSERT INTO vendors (id, event_id, name, service, contact, status, budget)
        VALUES (
          ${crypto.randomUUID()},
          ${String(body.eventId)},
          ${String(body.name)},
          ${String(body.service)},
          ${String(body.contact || "")},
          ${String(body.status || "Quoted")},
          ${Number(body.budget || 0)}
        )
      `;

      return json(res, 201, await getDashboard());
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
