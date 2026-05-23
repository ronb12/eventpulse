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
      if (!body.name || !body.kind || !body.venue || !body.eventDate) {
        return json(res, 400, { error: "Missing required event fields" });
      }

      await sql`
        INSERT INTO events (id, name, kind, venue, event_date, status, ticket_goal, ticket_price, notes)
        VALUES (
          ${crypto.randomUUID()},
          ${String(body.name)},
          ${String(body.kind)},
          ${String(body.venue)},
          ${String(body.eventDate)},
          ${String(body.status || "Planning")},
          ${Number(body.ticketGoal || 0)},
          ${Number(body.ticketPrice || 0)},
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
