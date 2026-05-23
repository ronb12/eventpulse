const state = {
  activePanel: "events",
  data: null
};

const elements = {
  stats: document.querySelector("#stats"),
  eventList: document.querySelector("#eventList"),
  guestList: document.querySelector("#guestList"),
  vendorList: document.querySelector("#vendorList"),
  taskList: document.querySelector("#taskList"),
  toast: document.querySelector("#toast"),
  eventForm: document.querySelector("#eventForm"),
  guestForm: document.querySelector("#guestForm"),
  vendorForm: document.querySelector("#vendorForm"),
  taskForm: document.querySelector("#taskForm"),
  guestEventId: document.querySelector("#guestEventId"),
  vendorEventId: document.querySelector("#vendorEventId"),
  taskEventId: document.querySelector("#taskEventId"),
  railTabs: [...document.querySelectorAll(".rail-tab")],
  panels: [...document.querySelectorAll(".panel")],
  heroTabs: [...document.querySelectorAll("[data-tab-target]")],
  cardTemplate: document.querySelector("#cardTemplate")
};

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  elements.toast.style.borderColor = isError ? "rgba(255, 125, 125, 0.35)" : "rgba(114, 224, 255, 0.2)";
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

async function loadDashboard() {
  state.data = await request("/api/bootstrap");
  render();
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function updateSelects() {
  const options = state.data.events
    .map((event) => `<option value="${event.id}">${event.name}</option>`)
    .join("");
  elements.guestEventId.innerHTML = options;
  elements.vendorEventId.innerHTML = options;
  elements.taskEventId.innerHTML = options;

  const activeId = state.data.activeEventId;
  elements.guestEventId.value = activeId;
  elements.vendorEventId.value = activeId;
  elements.taskEventId.value = activeId;
}

function statCard(label, value) {
  return `
    <article class="stat-card">
      <div class="value">${value}</div>
      <div class="label">${label}</div>
    </article>
  `;
}

function badgeClass(value) {
  if (["Booked", "Going", "Done", "Locked", "On Sale"].includes(value)) return "badge good";
  if (["Maybe", "Quoted", "In Progress", "Planning"].includes(value)) return "badge warn";
  return "badge";
}

function buildCard(title, badge, rows, footer = "") {
  const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
  card.innerHTML = `
    <header>
      <div>
        <h3>${title}</h3>
      </div>
      <span class="${badgeClass(badge)}">${badge}</span>
    </header>
    <div class="record-grid">
      ${rows.map((row) => `<div class="record-row"><span>${row.label}</span><strong>${row.value}</strong></div>`).join("")}
    </div>
    ${footer ? `<div class="record-meta">${footer}</div>` : ""}
  `;
  return card;
}

function renderStats() {
  const { stats } = state.data;
  elements.stats.innerHTML = [
    statCard("Events", stats.totalEvents),
    statCard("Committed Tickets", stats.ticketsCommitted),
    statCard("Ticket Goal", stats.ticketGoal),
    statCard("Projected Revenue", money(stats.ticketRevenue)),
    statCard("Booked Vendors", stats.vendorBooked),
    statCard("Open Tasks", stats.openTasks)
  ].join("");
}

function renderEvents() {
  elements.eventList.innerHTML = "";
  state.data.events.forEach((event) => {
    const rows = [
      { label: "Type", value: event.kind },
      { label: "Venue", value: event.venue },
      { label: "Date", value: event.event_date },
      { label: "Ticket Goal", value: `${event.ticket_goal} @ ${money(event.ticket_price)}` }
    ];
    elements.eventList.appendChild(buildCard(event.name, event.status, rows, event.notes));
  });
}

function renderGuests() {
  elements.guestList.innerHTML = "";
  if (!state.data.guests.length) {
    elements.guestList.innerHTML = `<div class="empty-state">No RSVP records yet.</div>`;
    return;
  }
  state.data.guests.forEach((guest) => {
    const rows = [
      { label: "Email", value: guest.email || "No email" },
      { label: "Party Size", value: guest.party_size },
      { label: "Logged", value: new Date(guest.created_at).toLocaleDateString() }
    ];
    elements.guestList.appendChild(buildCard(guest.name, guest.rsvp, rows, guest.notes));
  });
}

function renderVendors() {
  elements.vendorList.innerHTML = "";
  if (!state.data.vendors.length) {
    elements.vendorList.innerHTML = `<div class="empty-state">No vendor records yet.</div>`;
    return;
  }
  state.data.vendors.forEach((vendor) => {
    const rows = [
      { label: "Service", value: vendor.service },
      { label: "Contact", value: vendor.contact || "No contact" },
      { label: "Budget", value: money(vendor.budget) }
    ];
    elements.vendorList.appendChild(buildCard(vendor.name, vendor.status, rows));
  });
}

function renderChecklist() {
  elements.taskList.innerHTML = "";
  if (!state.data.checklist.length) {
    elements.taskList.innerHTML = `<div class="empty-state">No checklist items yet.</div>`;
    return;
  }
  state.data.checklist.forEach((item) => {
    const rows = [
      { label: "Owner", value: item.owner || "Unassigned" },
      { label: "Due", value: item.due_date || "No due date" }
    ];
    elements.taskList.appendChild(buildCard(item.title, item.status, rows));
  });
}

function render() {
  updateSelects();
  renderStats();
  renderEvents();
  renderGuests();
  renderVendors();
  renderChecklist();
}

function setPanel(panel) {
  state.activePanel = panel;
  elements.railTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === panel));
  elements.panels.forEach((node) => node.classList.toggle("active", node.dataset.panel === panel));
}

async function handleSubmit(form, endpoint) {
  const payload = Object.fromEntries(new FormData(form).entries());
  const response = await request(endpoint, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  state.data = response;
  render();
  form.reset();
  updateSelects();
}

elements.railTabs.forEach((tab) => tab.addEventListener("click", () => setPanel(tab.dataset.tab)));
elements.heroTabs.forEach((tab) => tab.addEventListener("click", () => setPanel(tab.dataset.tabTarget)));

elements.eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await handleSubmit(elements.eventForm, "/api/events");
    showToast("Event saved to EventPulse.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.guestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await handleSubmit(elements.guestForm, "/api/guests");
    showToast("RSVP saved.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.vendorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await handleSubmit(elements.vendorForm, "/api/vendors");
    showToast("Vendor saved.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await handleSubmit(elements.taskForm, "/api/checklist");
    showToast("Checklist item saved.");
  } catch (error) {
    showToast(error.message, true);
  }
});

loadDashboard().catch((error) => {
  showToast(error.message, true);
});
