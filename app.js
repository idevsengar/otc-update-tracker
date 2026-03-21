// === Column headers in your JSON ===();

  state.filtered = state.rows.filter(r => {
    if (f.district) {
      const cell = String(r[FILTERS.district] ?? "");
      const list = cell.split(",").map(s => s.trim());
      const matchList = list.includes(f.district);
      const matchText = cell.toLowerCase().includes(f.district.toLowerCase());
      if (!matchList && !matchText) return false;
    }
    if (f.customer && r[FILTERS.customer] !== f.customer) return false;
    if (f.person && r[FILTERS.person] !== f.person) return false;

    if (txt) {
      const hay = COLS.map(c => String(r[c]).toLowerCase()).join(" ");
      if (!hay.includes(txt)) return false;
    }
    return true;
  });

  state.filtered.sort((a,b) => {
    const ad = a.__date ? a.__date.getTime() : -Infinity;
    const bd = b.__date ? b.__date.getTime() : -Infinity;
    return bd - ad;
  });

  els.kpiVisible.textContent = state.filtered.length.toLocaleString();
  render();
}

function render() {
  els.body.innerHTML = state.filtered.map(r => {
    const link = String(r["Update Email Link"] || "").trim();
    const linkHtml = link
      ? '<a class="btn" href="' + escapeAttr(link) + '" target="_blank" rel="noopener">Open Email</a>'
      : "";
    return `<tr>${
      [
        "SR No",
        "District Number",
        "Customer Name",
        "Last Updated Date",
        "Responsible Person",
        "Update Summary"
      ].map(c => `<td>${escapeHtml(r[c])}</td>`).join("")
      + `<td>${linkHtml}</td>`
    }</tr>`;
  }).join("");
}

function downloadVisible() {
  const header = COLS.join(",");
  const lines = state.filtered.map(r => COLS.map(c => csvEscape(r[c])).join(","));
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "visible_rows.csv"; a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, s => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[s]));
}
function escapeAttr(v) { return String(v ?? "").replace(/"/g, "&quot;"); }
function csvEscape(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
``
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
    showError(`Failed to load data: ${e.message}. Ensure /data/updates.json exists, and you're serving the site from the same origin.`);
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
  els.person.addEventListener("change", e => (state.filters.person = e.target.value, update()));
  els.search.addEventListener("input", e => (state.filters.search = e.target.value.trim(), update()));

  els.reset.addEventListener("click", () => {
    state.filters = { district: "", customer: "", person: "", search: "" };
    populateDropdowns(); applyFilters();
  });

  els.download.addEventListener("click", () => downloadVisible());
}

function applyFilters() {
