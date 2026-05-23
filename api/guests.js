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
      if (!body.eventId || !body.name || !body.rsvp) {
        return json(res, 400, { error: "Missing required guest fields" });
      }

      await sql`
        INSERT INTO guests (id, event_id, name, email, rsvp, party_size, notes)
        VALUES (
          ${crypto.randomUUID()},
          ${String(body.eventId)},
          ${String(body.name)},
          ${String(body.email || "")},
          ${String(body.rsvp)},
          ${Number(body.partySize || 1)},
          ${String(body.notes || "")}
        )
      `;

      return json(res, 201, await getDashboard());
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
