// Shared plumbing for the acp pages: header/nav, credentials, ClickHouse queries.
// No build step, no deps. ClickHouse's HTTP interface allows the x-clickhouse-*
// auth headers cross-origin, so these pages talk to :8123 directly.

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const PAGES = [["index.html", "home"], ["browse.html", "browse"],
               ["stats.html", "stats"], ["bash.html", "bash"], ["files.html", "files"],
               ["secrets.html", "secrets"]];

// Favicon as an emoji in an SVG data URI: no binary asset, no extra request, and set here
// so every page inherits it. encodeURIComponent keeps the markup data-URI safe.
document.head.append(Object.assign(document.createElement("link"), {
  rel: "icon",
  href: "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<text y="0.9em" font-size="90">🕵️</text></svg>`),
}));

// Credentials come from ?url=/?u=/?p= (bookmarkable on loopback), else whatever was last
// used, else the defaults in the header. Whichever wins is saved right away: assigning
// .value fires no 'change' event, so a pasted ?p= would otherwise be forgotten the moment
// you follow a nav link, which carries no query string.
function restoreCreds() {
  const qs = new URLSearchParams(location.search);
  const fromQuery = { url: qs.get("url"), user: qs.get("u"), pass: qs.get("p") };
  const save = (id) => {
    try { localStorage["acp." + id] = $(id).value } catch { /* storage may be denied */ }
  };
  for (const id of ["url", "user", "pass"]) {
    let saved;
    try { saved = localStorage["acp." + id] } catch { /* the field still works */ }
    $(id).value = fromQuery[id] ?? saved ?? $(id).value;
    save(id);
    $(id).addEventListener("input", () => save(id));  // 'input', so it sticks without blurring
  }
}

function mountHeader({ current, extraHTML = "", onReload, onToggleView }) {
  const nav = PAGES.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  document.querySelector("header").innerHTML = `
    <nav>${nav}</nav>
    <label>url <input type="url" id="url" value="http://127.0.0.1:8123/" autocomplete="off"></label>
    <label>user <input id="user" value="acp" autocomplete="off"></label>
    <label>pass <input type="password" id="pass" autocomplete="new-password"></label>
    <button id="go">reload</button>
    ${onToggleView ? `<button id="tv" aria-pressed="false">table view</button>` : ""}
    ${extraHTML}
    <span class="grow"></span>
    <span class="meta" id="status"></span>`;
  restoreCreds();
  if (onReload) {
    $("go").onclick = onReload;
    for (const id of ["url", "user", "pass"]) {
      $(id).addEventListener("keydown", (e) => e.key === "Enter" && onReload());
    }
  }
  if (onToggleView) {
    $("tv").onclick = () => {
      tableView = !tableView;
      $("tv").setAttribute("aria-pressed", String(tableView));
      onToggleView();
    };
  }
}

async function query(sql, params = {}) {
  const u = new URL($("url").value);
  u.searchParams.set("default_format", "JSON");
  for (const [k, v] of Object.entries(params)) u.searchParams.set("param_" + k, v);
  const res = await fetch(u, {
    method: "POST", body: sql,
    headers: { "x-clickhouse-user": $("user").value, "x-clickhouse-key": $("pass").value },
  });
  const body = await res.text();
  // Name the user in the error: a browser autofilling these fields is otherwise invisible.
  if (!res.ok) throw new Error(`as "${$("user").value}": ` + body.slice(0, 260));
  return JSON.parse(body).data;
}

function setStatus(text, bad = false) {
  const s = $("status");
  s.textContent = text;
  s.className = bad ? "err" : "meta";
}

const money = (n) => "$" + Number(n).toFixed(n < 10 ? 4 : 2);
const compact = (n) => Number(n) >= 10000 ? (Number(n) / 1000).toFixed(1) + "K" : Number(n).toLocaleString();
const bytes = (n) => {
  const v = Number(n);
  if (v < 1024) return v + " B";
  return v < 1024 * 1024 ? (v / 1024).toFixed(1) + " KB" : (v / 1024 / 1024).toFixed(1) + " MB";
};

// ---- dashboard kit, shared by the chart pages ----
// Chart marks carry one hue: these categories are nominal, so length is the only encoding.

let tableView = false;

function bindTip(node, text) {
  let tip = $("tip");
  if (!tip) {
    tip = el("div");
    tip.id = "tip";
    document.body.append(tip);
  }
  node.onmousemove = (e) => {
    tip.textContent = text;
    tip.style.opacity = 1;
    const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(e.clientX + pad, innerWidth - w - 4) + "px";
    tip.style.top = Math.max(4, Math.min(e.clientY + pad, innerHeight - h - 4)) + "px";
  };
  node.onmouseleave = () => { tip.style.opacity = 0 };
}

function tileNode({ label, value, foot, hero }) {
  const d = el("div", "tile" + (hero ? " hero" : ""));
  d.append(el("div", "label", label), el("div", "value", value));
  if (foot) d.append(el("div", "foot", foot));
  return d;
}

function hbars(rows, { name, value, failed, tipText }) {
  const max = Math.max(...rows.map(value), 1);
  const box = el("div", "bars");
  for (const r of rows) {
    const row = el("div", "row");
    row.append(el("div", "rl", name(r)));
    const track = el("div", "rt");
    const fill = el("div", "fill");
    fill.style.width = (value(r) / max * 100).toFixed(2) + "%";
    if (failed?.(r)) fill.style.background = "var(--viz-crit)";
    track.append(fill);
    row.append(track, el("div", "rv tnum", compact(value(r))));
    bindTip(row, tipText(r));
    box.append(row);
  }
  return box;
}

function columns(rows, { label, value, tipText }) {
  const max = Math.max(...rows.map(value), 1);
  const wrap = el("div");
  const plot = el("div", "cols"), axis = el("div", "xaxis");
  for (const r of rows) {
    const cell = el("div", "cell");
    const n = value(r);
    cell.append(el("div", "cap", n ? compact(n) : ""));
    const bar = el("div", "bar");
    bar.style.height = `calc(${(n / max * 100).toFixed(2)}% - 18px)`;
    if (!n) bar.style.background = "var(--viz-track)";
    cell.append(bar);
    bindTip(cell, tipText(r));
    plot.append(cell);
    axis.append(el("div", null, label(r)));
  }
  wrap.append(plot, axis);
  return wrap;
}

function tableNode(cols, rows) {
  const t = el("table");
  const tr = t.createTHead().insertRow();
  for (const c of cols) tr.append(el("th", c.n ? "n" : null, c.h));
  const tb = t.createTBody();
  for (const r of rows) {
    const row = tb.insertRow();
    for (const c of cols) {
      const td = row.insertCell();
      td.className = [c.n ? "n tnum" : "", c.cls?.(r) || ""].filter(Boolean).join(" ");
      td.textContent = c.v(r);
    }
  }
  return t;
}

function render(target, chartFn, tableFn) {
  const host = $(target);
  host.textContent = "";
  host.append(tableView ? tableFn() : chartFn());
}

function notesNode(lines) {
  const ul = el("ul");
  for (const line of lines.filter(Boolean)) ul.append(el("li", null, line));
  const wrap = el("div");
  wrap.append(el("div", null, "How these numbers are built"), ul);
  return wrap;
}
