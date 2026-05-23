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
      if (!body.eventId || !body.title) {
        return json(res, 400, { error: "Missing required checklist fields" });
      }

      await sql`
        INSERT INTO checklist_items (id, event_id, title, owner, due_date, status)
        VALUES (
          ${crypto.randomUUID()},
          ${String(body.eventId)},
          ${String(body.title)},
          ${String(body.owner || "")},
          ${body.dueDate ? String(body.dueDate) : null},
          ${String(body.status || "Open")}
        )
      `;

      return json(res, 201, await getDashboard());
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
};
