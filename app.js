// === Column headers as they appear in your Excel/JSON ===
const COLS = [
  "SR No",
  "District Number",
  "Customer Name",
  "Last Updated Date",
  "Responsible Person",
  "Update Summary",
  "Update Email Link"
];

// === Filter fields we will build unique lists for ===
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
  kpiVisible: document.getElementById("kpi-visible")
};

const state = {
  rows: [],
  filtered: [],
  filters: { district: "", customer: "", person: "", search: "" }
};

init();

async function init() {
  await loadData();
  buildTableHead();
  populateDropdowns();
  applyFilters();
  wireEvents();
}

async function loadData() {
  const res = await fetch("data.json?_=" + Date.now());
  const data = await res.json();

  // Normalize rows and add a parsed date field for potential sorting
  state.rows = data.map(r => {
    const o = {};
    COLS.forEach(c => { o[c] = r[c] ?? ""; });
    const d = String(o["Last Updated Date"]).trim();
    o.__date = d ? new Date(d) : null;
    return o;
  });

  els.kpiTotal.textContent = state.rows.length.toLocaleString();
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

  // District can be single value "297" or a list "216, 217, 286" or names like "Atlantic Coast Area"
  fill(els.district, uniq(state.rows.map(r => r[FILTERS.district])), state.filters.district);
  fill(els.customer, uniq(state.rows.map(r => r[FILTERS.customer])), state.filters.customer);
  fill(els.person,   uniq(state.rows.map(r => r[FILTERS.person])),   state.filters.person);

  els.search.value = state.filters.search;
}

function wireEvents() {
  const update = () => { applyFilters(); saveFilters(); };

  els.district.addEventListener("change", e => (state.filters.district = e.target.value, update()));
  els.customer.addEventListener("change", e => (state.filters.customer = e.target.value, update()));
  els.person.addEventListener("change", e => (state.filters.person = e.target.value, update()));
  els.search.addEventListener("input", e => (state.filters.search = e.target.value.trim(), update()));

  els.reset.addEventListener("click", () => {
    state.filters = { district: "", customer: "", person: "", search: "" };
    populateDropdowns();
    applyFilters();
    saveFilters();
  });

  els.download.addEventListener("click", () => downloadVisible());
}

function applyFilters() {
  const f = state.filters;
  const txt = f.search.toLowerCase();

  state.filtered = state.rows.filter(r => {
    // District filter: supports CSV lists and names
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

  // Default sorting: by Last Updated Date desc if present
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
    // Turn Update Email Link into a button if it's non-empty
    const link = String(r["Update Email Link"] || "").trim();
    const linkHtml = link
      ? `<a class="btn" href="${escapeAttr(link)}" target="_blank" rel="noopener">Open Email</a>`
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

function saveFilters() {
  localStorage.setItem("otc_filters", JSON.stringify(state.filters));
}
(function restoreFilters(){
  try {
    const saved = JSON.parse(localStorage.getItem("otc_filters") || "{}");
    state.filters = { ...state.filters, ...saved };
  } catch {}
})();

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, s => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[s]));
}
function escapeAttr(v) {
  return String(v ?? "").replace(/"/g, "&quot;");
}
function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
``
