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

const PAGES = [["index.html", "home"], ["browse.html", "browse"], ["stats.html", "stats"]];

// Credentials come from ?u=/?p= (bookmarkable on loopback) else localStorage.
function restoreCreds() {
  const qs = new URLSearchParams(location.search);
  const fromQuery = { url: qs.get("url"), user: qs.get("u"), pass: qs.get("p") };
  for (const id of ["url", "user", "pass"]) {
    if (fromQuery[id]) { $(id).value = fromQuery[id]; continue; }
    try {
      if (localStorage["acp." + id]) $(id).value = localStorage["acp." + id];
    } catch { /* storage may be denied; the field still works */ }
  }
  for (const id of ["url", "user", "pass"]) {
    $(id).addEventListener("change", () => {
      try { localStorage["acp." + id] = $(id).value } catch { /* ignore */ }
    });
  }
}

function mountHeader({ current, extraHTML = "", onReload }) {
  const nav = PAGES.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  document.querySelector("header").innerHTML = `
    <nav>${nav}</nav>
    <label>url <input type="url" id="url" value="http://127.0.0.1:8123/"></label>
    <label>user <input id="user" value="acp"></label>
    <label>pass <input type="password" id="pass"></label>
    <button id="go">reload</button>
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
  if (!res.ok) throw new Error(body.slice(0, 300));
  return JSON.parse(body).data;
}

function setStatus(text, bad = false) {
  const s = $("status");
  s.textContent = text;
  s.className = bad ? "err" : "meta";
}

const money = (n) => "$" + Number(n).toFixed(n < 10 ? 4 : 2);
const compact = (n) => Number(n) >= 10000 ? (Number(n) / 1000).toFixed(1) + "K" : Number(n).toLocaleString();
