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
  // text may be a function: a line chart's single hover target reports a different point
  // depending on where in it the cursor sits.
  node.onmousemove = (e) => {
    tip.textContent = typeof text === "function" ? text(e) : text;
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

const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

// Round a scale top up to a readable number. The 1.5/2.5/3/4 steps are there so a max of
// 2,408 tops out at 2,500 rather than 5,000 and the series keeps the full height of the plot.
const niceMax = (v) => {
  if (v <= 5) return 5;
  const pow = 10 ** Math.floor(Math.log10(v));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 10].map((m) => m * pow).find((c) => c >= v);
};

// Daily marks stop being legible long before a year of them fits, so tick density follows the
// span: every day up to three weeks, then Mondays, then first-of-month.
function xMarks(days) {
  const monthly = days.length > 120, weekly = days.length > 21;
  const out = [];
  days.forEach((d, i) => {
    const dt = new Date(d + "T00:00:00");
    const hit = monthly ? dt.getDate() === 1 : weekly ? dt.getDay() === 1 : true;
    if (hit) out.push({ i, text: monthly ? MONTHS[dt.getMonth()] : d.slice(5) });
  });
  return out;
}
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Nothing here scales with row count, which is what lets a year of daily points fit the card:
// each series is one path, dots appear only once they'd be far enough apart to read, and hover
// is a single overlay snapping to the nearest x rather than one hit target per point.
function lineChart(host, rows, { x, series, tipText, yFmt = compact }) {
  const W = Math.max(host.clientWidth, 320), H = 210;
  const padL = 46, padR = 12, padT = 12, padB = 20;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = niceMax(Math.max(...series.flatMap((s) => rows.map(s.value)), 1));
  const step = rows.length > 1 ? plotW / (rows.length - 1) : 0;
  const px = (i) => padL + i * step;
  const py = (v) => padT + plotH - (v / max) * plotH;

  const svg = svgEl("svg", { class: "chart", viewBox: `0 0 ${W} ${H}`, role: "img" });
  for (const f of [0, 0.5, 1]) {
    const y = py(max * f);
    svg.append(svgEl("line", { class: "grid", x1: padL, x2: W - padR, y1: y, y2: y }));
    const t = svgEl("text", { class: "ylab", x: padL - 8, y: y + 4 });
    t.textContent = yFmt(max * f);
    svg.append(t);
  }
  for (const m of xMarks(rows.map(x))) {
    svg.append(svgEl("line", { class: "grid", x1: px(m.i), x2: px(m.i), y1: padT, y2: py(0) }));
    const t = svgEl("text", { class: "xlab", x: px(m.i), y: H - 6 });
    t.textContent = m.text;
    svg.append(t);
  }
  for (const s of series) {
    const pts = rows.map((r, i) => `${px(i).toFixed(1)},${py(s.value(r)).toFixed(1)}`).join(" L");
    if (s.area) {
      const a = svgEl("path", { d: `M${padL},${py(0)} L${pts} L${px(rows.length - 1)},${py(0)} Z` });
      a.style.fill = s.color;
      a.style.fillOpacity = 0.14;
      svg.append(a);
    }
    const p = svgEl("path", { class: "series", d: `M${pts}` });
    p.style.stroke = s.color;
    svg.append(p);
    if (step >= 9) {
      rows.forEach((r, i) => {
        const c = svgEl("circle", { cx: px(i), cy: py(s.value(r)), r: 2.5 });
        c.style.fill = s.color;
        svg.append(c);
      });
    }
  }

  const guide = svgEl("line", { class: "guide", y1: padT, y2: py(0), x1: padL, x2: padL, opacity: 0 });
  const dots = series.map((s) => {
    const c = svgEl("circle", { class: "hi", r: 4, cx: padL, cy: py(0), opacity: 0 });
    c.style.fill = s.color;
    return c;
  });
  const hit = svgEl("rect", { x: padL, y: padT, width: plotW, height: plotH, fill: "transparent" });
  svg.append(guide, ...dots, hit);

  // The svg scales with the card, so client x has to come back through the viewBox to an index.
  const at = (e) => {
    const b = svg.getBoundingClientRect();
    const vx = (e.clientX - b.left) * (W / b.width);
    return Math.min(rows.length - 1, Math.max(0, Math.round((vx - padL) / (step || 1))));
  };
  hit.addEventListener("mousemove", (e) => {
    const i = at(e);
    for (const a of ["x1", "x2"]) guide.setAttribute(a, px(i));
    guide.setAttribute("opacity", 1);
    dots.forEach((c, k) => {
      c.setAttribute("cx", px(i));
      c.setAttribute("cy", py(series[k].value(rows[i])));
      c.setAttribute("opacity", 1);
    });
  });
  hit.addEventListener("mouseleave", () => {
    guide.setAttribute("opacity", 0);
    for (const c of dots) c.setAttribute("opacity", 0);
  });
  bindTip(hit, (e) => tipText(rows[at(e)]));

  const wrap = el("div");
  // No legend for a single series — the card's own heading already names it, and a one-item
  // legend is chrome that says nothing.
  if (series.length > 1) {
    const legend = el("div", "legend");
    for (const s of series) {
      const item = el("span");
      const sw = el("i");
      sw.style.background = s.color;
      item.append(sw, document.createTextNode(s.name));
      legend.append(item);
    }
    wrap.append(legend);
  }
  wrap.append(svg);
  return wrap;
}

const CAT = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)",
             "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];

// Part-to-whole at a glance, which is the only job a ring does well: six segments at most, and
// the caller folds everything else into one. Drawn as a dashed circle stroke rather than arc
// paths — same geometry, a fraction of the code. The 2px gap between segments is the surface
// showing through, which is what keeps two adjacent hues legible as two.
function donut(rows, { label, value, tipText, centre, centreFoot }) {
  const total = rows.reduce((a, r) => a + value(r), 0) || 1;
  const R = 58, WIDTH = 20, C = 2 * Math.PI * R, GAP = 2;
  const svg = svgEl("svg", { class: "donut", viewBox: "0 0 150 150", role: "img" });
  // A circle's stroke starts at 3 o'clock; rotate so the first segment starts at 12.
  const ring = svgEl("g", { transform: "rotate(-90 75 75)" });
  let at = 0;
  rows.forEach((r, i) => {
    const frac = value(r) / total;
    const len = Math.max(frac * C - GAP, 0.5);
    const seg = svgEl("circle", {
      cx: 75, cy: 75, r: R, fill: "none", "stroke-width": WIDTH,
      "stroke-dasharray": `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
      "stroke-dashoffset": (-at * C).toFixed(2),
    });
    seg.style.stroke = CAT[i % CAT.length];
    bindTip(seg, tipText(r));
    ring.append(seg);
    at += frac;
  });
  svg.append(ring);
  if (centre) {
    const c = svgEl("text", { class: "dc", x: 75, y: centreFoot ? 73 : 80 });
    c.textContent = centre;
    svg.append(c);
  }
  if (centreFoot) {
    const f = svgEl("text", { class: "dcf", x: 75, y: 90 });
    f.textContent = centreFoot;
    svg.append(f);
  }

  // Legend carries the label and the share, so identity is never colour alone — which is also
  // the relief the palette's sub-3:1 contrast against a light surface requires.
  const legend = el("div", "legend col");
  rows.forEach((r, i) => {
    const item = el("span");
    const sw = el("i");
    sw.style.background = CAT[i % CAT.length];
    item.append(sw, el("span", "lb", label(r)),
                el("span", "lv tnum", (value(r) / total * 100).toFixed(1) + "%"));
    bindTip(item, tipText(r));
    legend.append(item);
  });

  const wrap = el("div", "donutwrap");
  wrap.append(svg, legend);
  return wrap;
}

const SEQ = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)"];

// Magnitude on a grid: one sequential hue, so the number of rows is not a colour budget the way
// a categorical chart's series count is. Buckets are fixed and named in the legend rather than
// continuous — a reader can place a cell in a bucket, but nobody reads a value off a shade.
// Built as a CSS grid of divs, not SVG: the cells are rectangles on a regular pitch, which is
// what grid already does, and each one can carry its own hover without hit-testing.
function heatmap(rows, { row, cols, value, tipText, colLabel, buckets }) {
  const step = (n) => {
    if (!n) return -1;
    let i = 0;
    while (i < buckets.length && n > buckets[i]) i++;
    return Math.min(i, SEQ.length - 1);
  };
  const wrap = el("div", "heat");
  const grid = el("div", "hgrid");
  // Capped rather than 1fr: stretched across a full-width card a dozen columns become 110px
  // stripes, and a heatmap cell has to read as a cell. minmax still lets them shrink when cramped.
  grid.style.gridTemplateColumns =
    `var(--heat-label) repeat(${cols.length}, minmax(6px, var(--heat-cell)))`;

  grid.append(el("div"));                       // corner above the row labels
  cols.forEach((c, i) => grid.append(el("div", "hcol", colLabel(c, i))));

  for (const r of rows) {
    grid.append(el("div", "hrow", row(r)));
    for (const c of cols) {
      const n = value(r, c);
      const cell = el("div", "hcell");
      const s = step(n);
      if (s >= 0) cell.style.background = SEQ[s];
      bindTip(cell, tipText(r, c, n));
      grid.append(cell);
    }
  }

  // Legend doubles as the bucket key, which is the only way a shade means anything.
  const legend = el("div", "hkey");
  legend.append(el("span", "hklab", "operations"));
  buckets.forEach((b, i) => {
    const item = el("span");
    const sw = el("i");
    sw.style.background = SEQ[i];
    const lo = i === 0 ? 1 : buckets[i - 1] + 1;
    item.append(sw, document.createTextNode(i === buckets.length - 1 ? `${lo}+` : `${lo}–${b}`));
    legend.append(item);
  });
  wrap.append(grid, legend);
  return wrap;
}

// An inline bar for a table cell, measured against the column's maximum rather than a total.
// That distinction is what makes it usable for overlapping categories: one bash call runs
// several programs, so the counts sum past the call total and any mark implying a share of a
// whole — ring, treemap, stacked bar — would be reading a fraction that does not exist.
function barCell(frac) {
  const track = el("div", "cbar");
  const fill = el("div", "cfill");
  fill.style.width = (Math.min(Math.max(frac, 0), 1) * 100).toFixed(1) + "%";
  track.append(fill);
  return track;
}

function tableNode(cols, rows) {
  const t = el("table");
  const tr = t.createTHead().insertRow();
  // An optional width per column. Without one, auto layout hands the slack to whichever column
  // it likes, which is how a 4-character program name ended up 460px from its own bar.
  for (const c of cols) {
    const th = el("th", c.n ? "n" : null, c.h);
    if (c.w) th.style.width = c.w;
    tr.append(th);
  }
  const tb = t.createTBody();
  for (const r of rows) {
    const row = tb.insertRow();
    for (const c of cols) {
      const td = row.insertCell();
      td.className = [c.n ? "n tnum" : "", c.cls?.(r) || ""].filter(Boolean).join(" ");
      const v = c.v(r);
      if (v instanceof Node) td.append(v); else td.textContent = v;
    }
  }
  return t;
}

function render(target, chartFn, tableFn) {
  const host = $(target);
  host.textContent = "";
  host.append(tableView ? tableFn() : chartFn(host));
}

function notesNode(lines) {
  const ul = el("ul");
  for (const line of lines.filter(Boolean)) ul.append(el("li", null, line));
  const wrap = el("div");
  wrap.append(el("div", null, "How these numbers are built"), ul);
  return wrap;
}
