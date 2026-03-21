// === Column headers in your JSON ===
const COLS = [
  "SR No",
  "District Number",
  "Customer Name",
  "Last Updated Date",
  "Responsible Person",
  "Update Summary",
  "Update Email Link"
];

const FILTERS = {
  district: "District Number",
  customer: "Customer Name",
  person: "Responsible Person"
};

const els = {
  head: document.getElementById("grid-head"),
  body: document.getElementById("grid-body"),
  district: document.getElementById("district"),
  customer: document.getElementById("customer"),
  person: document.getElementById("person"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  download: document.getElementById("download"),
  kpiTotal: document.getElementById("kpi-total"),
  kpiVisible: document.getElementById("kpi-visible"),
  alert: document.getElementById("app-alert")
};

const state = { rows: [], filtered: [], filters: { district: "", customer: "", person: "", search: "" } };

init().catch(err => showError("App init failed: " + err.message));

async function init() {
  await loadData();
  buildTableHead();
  populateDropdowns();
  applyFilters();
  wireEvents();
}

async function loadData() {
  const url = "data/updates.json?_=" + Date.now();
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const raw = await res.json();
    state.rows = raw.map(r => {
      const o = {};
      COLS.forEach(c => { o[c] = r[c] ?? ""; });
      const d = String(o["Last Updated Date"]).trim();
      o.__date = d ? new Date(d) : null;
      return o;
    });
    els.kpiTotal.textContent = state.rows.length.toLocaleString();
  } catch (e) {
    showError(`Failed to load data: ${e.message}. Does /data/updates.json exist?`);
    console.error(e);
    state.rows = [];
  }
}

function showError(msg) {
  if (!els.alert) return;
  els.alert.textContent = msg;
  els.alert.style.display = "block";
}

function buildTableHead() {
  const tr = document.createElement("tr");
  COLS.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    tr.appendChild(th);
  });
  els.head.innerHTML = "";
  els.head.appendChild(tr);
}

function populateDropdowns() {
  const uniq = arr => [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const fill = (el, values, saved) => {
    el.innerHTML = `<option value="">All</option>` + values.map(v => `<option>${escapeHtml(v)}</option>`).join("");
    if (saved) el.value = saved;
  };

  fill(els.district, uniq(state.rows.map(r => r[FILTERS.district])), state.filters.district);
  fill(els.customer, uniq(state.rows.map(r => r[FILTERS.customer])), state.filters.customer);
  fill(els.person,   uniq(state.rows.map(r => r[FILTERS.person])),   state.filters.person);

  const saved = JSON.parse(localStorage.getItem("otc_filters") || "{}");
  Object.assign(state.filters, saved);
  document.getElementById("search").value = state.filters.search || "";
}

function wireEvents() {
  const update = () => { applyFilters(); localStorage.setItem("otc_filters", JSON.stringify(state.filters)); };

  els.district.addEventListener("change", e => (state.filters.district = e.target.value, update()));
  els.customer.addEventListener("change", e => (state.filters.customer = e.target.value, update()));
