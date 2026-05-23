const { neon } = require("@neondatabase/serverless");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(databaseUrl);

let schemaReady;

async function ensureSchema() {
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id text PRIMARY KEY,
        name text NOT NULL,
        kind text NOT NULL,
        venue text NOT NULL,
        event_date date NOT NULL,
        status text NOT NULL DEFAULT 'Planning',
        ticket_goal integer NOT NULL DEFAULT 0,
        ticket_price numeric(10,2) NOT NULL DEFAULT 0,
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS guests (
        id text PRIMARY KEY,
        event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name text NOT NULL,
        email text NOT NULL DEFAULT '',
        rsvp text NOT NULL,
        party_size integer NOT NULL DEFAULT 1,
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS vendors (
        id text PRIMARY KEY,
        event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name text NOT NULL,
        service text NOT NULL,
        contact text NOT NULL DEFAULT '',
        status text NOT NULL,
        budget numeric(10,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS checklist_items (
        id text PRIMARY KEY,
        event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        title text NOT NULL,
        owner text NOT NULL DEFAULT '',
        due_date date,
        status text NOT NULL DEFAULT 'Open',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  })();

  return schemaReady;
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function getDashboard() {
  await ensureSchema();

  const events = await sql`
    SELECT id, name, kind, venue, event_date, status, ticket_goal, ticket_price, notes, created_at
    FROM events
    ORDER BY event_date ASC, created_at DESC
  `;

  if (events.length === 0) {
    const eventId = crypto.randomUUID();
    await sql`
      INSERT INTO events (id, name, kind, venue, event_date, status, ticket_goal, ticket_price, notes)
      VALUES (${eventId}, ${"Downtown Summer Mixer"}, ${"Pop-up"}, ${"Panama City Marina Hall"}, ${"2026-06-17"}, ${"Planning"}, ${220}, ${35}, ${"Anchor launch event for vendors, RSVPs, and ticket pacing."})
    `;
    await sql`
      INSERT INTO guests (id, event_id, name, email, rsvp, party_size, notes)
      VALUES
        (${crypto.randomUUID()}, ${eventId}, ${"Jamie Carter"}, ${"jamie@example.com"}, ${"Going"}, ${2}, ${"Needs two vegetarian tickets"}),
        (${crypto.randomUUID()}, ${eventId}, ${"Malik Johnson"}, ${"malik@example.com"}, ${"Maybe"}, ${1}, ${"Waiting on schedule confirmation"})
    `;
    await sql`
      INSERT INTO vendors (id, event_id, name, service, contact, status, budget)
      VALUES
        (${crypto.randomUUID()}, ${eventId}, ${"Stage & Sound Co."}, ${"Audio / MC"}, ${"sound@example.com"}, ${"Booked"}, ${950}),
        (${crypto.randomUUID()}, ${eventId}, ${"Sunrise Coffee Cart"}, ${"Food Vendor"}, ${"coffee@example.com"}, ${"Quoted"}, ${420})
    `;
    await sql`
      INSERT INTO checklist_items (id, event_id, title, owner, due_date, status)
      VALUES
        (${crypto.randomUUID()}, ${eventId}, ${"Finalize sponsor banner set"}, ${"Marketing"}, ${"2026-06-07"}, ${"Open"}),
        (${crypto.randomUUID()}, ${eventId}, ${"Confirm AV load-in time"}, ${"Ops"}, ${"2026-06-10"}, ${"In Progress"})
    `;

    return getDashboard();
  }

  const eventIds = events.map((event) => event.id);
  const guests = await sql`
    SELECT id, event_id, name, email, rsvp, party_size, notes, created_at
    FROM guests
    WHERE event_id = ANY(${eventIds})
    ORDER BY created_at DESC
  `;
  const vendors = await sql`
    SELECT id, event_id, name, service, contact, status, budget, created_at
    FROM vendors
    WHERE event_id = ANY(${eventIds})
    ORDER BY created_at DESC
  `;
  const checklist = await sql`
    SELECT id, event_id, title, owner, due_date, status, created_at
    FROM checklist_items
    WHERE event_id = ANY(${eventIds})
    ORDER BY due_date ASC NULLS LAST, created_at DESC
  `;

  const activeEvent = events[0];
  const activeGuests = guests.filter((guest) => guest.event_id === activeEvent.id);
  const activeVendors = vendors.filter((vendor) => vendor.event_id === activeEvent.id);
  const activeChecklist = checklist.filter((item) => item.event_id === activeEvent.id);

  const ticketsCommitted = activeGuests
    .filter((guest) => guest.rsvp === "Going")
    .reduce((sum, guest) => sum + Number(guest.party_size || 1), 0);
  const ticketRevenue = ticketsCommitted * Number(activeEvent.ticket_price || 0);
  const vendorBooked = activeVendors.filter((vendor) => vendor.status === "Booked").length;
  const openTasks = activeChecklist.filter((item) => item.status !== "Done").length;

  return {
    events,
    guests: activeGuests,
    vendors: activeVendors,
    checklist: activeChecklist,
    activeEventId: activeEvent.id,
    stats: {
      totalEvents: events.length,
      ticketsCommitted,
      ticketGoal: Number(activeEvent.ticket_goal || 0),
      ticketRevenue,
      vendorBooked,
      openTasks
    }
  };
}

module.exports = {
  sql,
  ensureSchema,
  getDashboard,
  json
};
