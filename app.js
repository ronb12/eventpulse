(() => {
  const key = "eventpulse-v1";
  const seed = {
    events: [
      {
        id: crypto.randomUUID(),
        name: "Pop-Up Market",
        type: "Pop-up",
        date: "2026-06-17",
        guests: 128,
        tickets: 2840,
        vendors: ["Coffee Cart", "Vintage Booth"],
      },
    ],
    guests: [
      { id: crypto.randomUUID(), eventId: "", name: "Jamie Carter", status: "Going" },
    ],
    vendors: [{ id: crypto.randomUUID(), eventId: "", name: "Stage & Sound", ready: true }],
  };

  const load = () => {
    const saved = localStorage.getItem(key);
    if (!saved) return seed;
    const data = JSON.parse(saved);
    if (!data.guests[0]?.eventId && data.events[0]) data.guests[0].eventId = data.events[0].id;
    if (!data.vendors[0]?.eventId && data.events[0]) data.vendors[0].eventId = data.events[0].id;
    return data;
  };

  const state = load();
  if (!state.guests[0].eventId) state.guests[0].eventId = state.events[0].id;
  if (!state.vendors[0].eventId) state.vendors[0].eventId = state.events[0].id;

  const save = () => localStorage.setItem(key, JSON.stringify(state));
  const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  document.head.insertAdjacentHTML(
    "beforeend",
    `<style>
      body{margin:0;background:#07111f;color:#eaf3ff;font:16px/1.45 system-ui,sans-serif}
      main{max-width:1200px;margin:0 auto;padding:32px 20px 48px}
      .ep-grid{display:grid;gap:20px}.ep-hero,.ep-card{background:#0f1d33;border:1px solid #22385d;border-radius:20px;padding:20px;box-shadow:0 18px 40px rgba(0,0,0,.22)}
      .ep-hero{display:grid;gap:16px}.ep-stats,.ep-panels{display:grid;gap:16px}.ep-stats{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.ep-panels{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
      .ep-stat,.ep-item{background:#122543;border-radius:16px;padding:14px}.ep-item{display:grid;gap:6px}.ep-list{display:grid;gap:12px;margin-top:12px}
      form{display:grid;gap:10px}.ep-row{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
      input,select,button{border-radius:12px;border:1px solid #35507c;padding:11px 12px;font:inherit}
      input,select{background:#081324;color:#f5fbff}button{background:#45a2ff;color:#07111f;font-weight:700;cursor:pointer}
      .ghost{background:transparent;color:#9fd0ff}.tag{display:inline-block;padding:4px 10px;border-radius:999px;background:#183050;color:#9fd0ff;font-size:12px}
      .meta{color:#9db4d3}.actions{display:flex;gap:8px;flex-wrap:wrap}.pill{padding:3px 9px;border-radius:999px;background:#1f3a60}.good{color:#7ef0a8}
      @media (max-width:700px){.ep-row{grid-template-columns:1fr}}
    </style>`
  );

  const main = document.querySelector("main");

  function selectedEventId() {
    return state.events[0]?.id || "";
  }

  function render() {
    const eventId = selectedEventId();
    const guests = state.guests.filter((guest) => guest.eventId === eventId);
    const vendors = state.vendors.filter((vendor) => vendor.eventId === eventId);
    const event = state.events[0];
    const going = guests.filter((guest) => guest.status === "Going").length + (event?.guests || 0);
    const ticketTotal = event?.tickets || 0;

    main.innerHTML = `
      <div class="ep-grid">
        <section class="ep-hero">
          <span class="tag">Working MVP</span>
          <h1>EventPulse</h1>
          <p class="meta">Manage an event page, RSVP guest list, vendor checklist, and ticket totals with local saved state.</p>
          <div class="ep-stats">
            <div class="ep-stat"><strong>${state.events.length}</strong><div class="meta">Events</div></div>
            <div class="ep-stat"><strong>${going}</strong><div class="meta">RSVPs going</div></div>
            <div class="ep-stat"><strong>${vendors.filter((vendor) => vendor.ready).length}/${vendors.length}</strong><div class="meta">Vendors ready</div></div>
            <div class="ep-stat"><strong>${money(ticketTotal)}</strong><div class="meta">Ticket revenue</div></div>
          </div>
        </section>
        <section class="ep-panels">
          <article class="ep-card">
            <h2>Create Event</h2>
            <form id="eventForm">
              <div class="ep-row">
                <input name="name" placeholder="Summer Mixer" required>
                <select name="type">
                  <option>Conference</option>
                  <option>Reunion</option>
                  <option>Pop-up</option>
                  <option>Birthday</option>
                </select>
              </div>
              <div class="ep-row">
                <input name="date" type="date" required>
                <input name="tickets" type="number" min="0" placeholder="Projected ticket sales">
              </div>
              <button type="submit">Save Event</button>
            </form>
            <div class="ep-list">
              ${state.events.map((item) => `<div class="ep-item"><b>${item.name}</b><span class="meta">${item.type} • ${item.date}</span><span>${item.guests} seeded RSVPs • ${money(item.tickets)}</span></div>`).join("")}
            </div>
          </article>
          <article class="ep-card">
            <h2>Guests</h2>
            <form id="guestForm">
              <div class="ep-row">
                <input name="name" placeholder="Guest name" required>
                <select name="status"><option>Going</option><option>Maybe</option><option>Invited</option></select>
              </div>
              <button type="submit">Add Guest</button>
            </form>
            <div class="ep-list">
              ${guests.map((guest) => `<div class="ep-item"><b>${guest.name}</b><span class="pill">${guest.status}</span></div>`).join("") || `<div class="ep-item">No guests yet.</div>`}
            </div>
          </article>
          <article class="ep-card">
            <h2>Vendors</h2>
            <form id="vendorForm">
              <div class="ep-row">
                <input name="name" placeholder="Vendor name" required>
                <select name="ready"><option value="false">Needs follow-up</option><option value="true">Ready</option></select>
              </div>
              <button type="submit">Add Vendor</button>
            </form>
            <div class="ep-list">
              ${vendors.map((vendor) => `<div class="ep-item"><b>${vendor.name}</b><span class="${vendor.ready ? "good" : "meta"}">${vendor.ready ? "Ready" : "Needs follow-up"}</span></div>`).join("") || `<div class="ep-item">No vendors yet.</div>`}
            </div>
          </article>
        </section>
      </div>`;

    document.querySelector("#eventForm").addEventListener("submit", (eventObject) => {
      eventObject.preventDefault();
      const form = new FormData(eventObject.currentTarget);
      state.events.unshift({
        id: crypto.randomUUID(),
        name: String(form.get("name")),
        type: String(form.get("type")),
        date: String(form.get("date")),
        guests: 0,
        tickets: Number(form.get("tickets") || 0),
        vendors: [],
      });
      save();
      render();
    });

    document.querySelector("#guestForm").addEventListener("submit", (eventObject) => {
      eventObject.preventDefault();
      const form = new FormData(eventObject.currentTarget);
      state.guests.unshift({
        id: crypto.randomUUID(),
        eventId: selectedEventId(),
        name: String(form.get("name")),
        status: String(form.get("status")),
      });
      save();
      render();
    });

    document.querySelector("#vendorForm").addEventListener("submit", (eventObject) => {
      eventObject.preventDefault();
      const form = new FormData(eventObject.currentTarget);
      state.vendors.unshift({
        id: crypto.randomUUID(),
        eventId: selectedEventId(),
        name: String(form.get("name")),
        ready: String(form.get("ready")) === "true",
      });
      save();
      render();
    });
  }

  save();
  render();
})();
