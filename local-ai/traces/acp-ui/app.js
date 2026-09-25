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

// ---- langfuse source, shared by the dashboard pages ----
// Langfuse 4.x keeps every span in events_full. Notes that cost real debugging time:
//
//   * events_core is the same rows with input/output truncated, and traces/observations are the
//     empty pre-4.x tables. Only events_full has the whole payload.
//   * span_id is unique and nothing is double-written, so none of the ACP pages' replay dedup
//     (min(ts), rank-by-status) is needed here. One row is one call.
//   * `name` is not a tool name. It frequently carries the command or path appended — "Edit
//     some-natalie/.../app.css", "git push 2>&1 | tail -2" — which is 5,854 distinct values, and
//     5,032 shell calls have a name that IS the command ("cd", "export", "grep"). Filtering on
//     it drops a quarter of the shell calls, so tools are identified by their input payload
//     instead: LF_SHELL for a command, LF_FILE for a file path. The two never overlap.
//   * session_id is empty on every TOOL row, so trace_id is the only grouping key available.
//   * is_deleted = 0 because the table is a ReplacingMergeTree with soft deletes.
const LF_TABLE = "default.events_full";
const LF_LIVE = "is_deleted = 0";
const LF_SHELL = "JSONHas(input, 'command')";
const LF_FILE = "JSONHas(input, 'file_path')";

// Cheap columns first, in an explicit PREWHERE. This is the difference between a 40 MiB query and
// a 1.02 GiB one, and it is not an optimisation — it is what stops these pages killing the server.
//
// Since litellm started writing to this table, `input` holds whole conversations: GENERATION rows
// average 989 KB each and 5.85 GB of the table's 5.88 GB of input text is theirs. Any predicate
// touching input — JSONHas, position, JSONExtractString — decompresses that column for every row
// the planner has not already excluded. Left to itself ClickHouse folds is_deleted/type into the
// same PREWHERE step as the JSON probe and reads all 870 MiB regardless, so the type filter has to
// be a separate, earlier stage. Measured: `type='TOOL'` alone reads 53 KiB; with JSONHas in the
// same WHERE, 870 MiB and 1.02 GiB resident, which is over half the 2 GiB per-query ceiling. Five
// panels loading at once then blow the 3 GiB per-user ceiling and the OvercommitTracker kills a
// query that may not even be the greedy one.
//
// ponytail: PREWHERE placement, not a rewrite. If input grows another order of magnitude, the
// fix is a materialized has_command/has_file_path column so the JSON is never touched at scan time.
const LF_PREWHERE = `PREWHERE ${LF_LIVE} AND type = 'TOOL'`;

// Failure is level='ERROR', which Langfuse mirrors into the metadata `status` key as "failed".
// Unfinished calls carry status pending/in_progress and are not failures.
const LF_FAILED = "level = 'ERROR'";
const LF_STATUS = "metadata_values[indexOf(metadata_names, 'status')]";

// Duration in seconds. end_time is populated on every TOOL row, but the longest is ~10.6 hours —
// a call whose span was left open, not a slow command — so the caller caps it.
const LF_SECS = "dateDiff('millisecond', start_time, end_time) / 1000";

// Every TOOL call, with the fields the dashboard pages actually read. `extra` adds page-specific
// columns; `where` narrows to the tool family — and lands in WHERE, after the PREWHERE above has
// already cut the row set down, because every tool-family predicate reads `input`.
const lfCalls = ({ where, extra = "" }) => `
  WITH calls AS (
    SELECT trace_id AS tid, span_id, start_time AS started, name AS label,
           ${LF_SECS} AS secs_raw,
           ${LF_FAILED} AS failed,
           ${LF_STATUS} AS status,
           output_length AS out_len,
           input, output,
           service_name AS svc, environment AS env
           ${extra ? "," + extra : ""}
    FROM ${LF_TABLE}
    ${LF_PREWHERE}${where ? `\n    WHERE ${where}` : ""}
  )`;

// ---- litellm-era tool calls ----
// The zed-acp tap wrote one TOOL span per tool call, with its duration, output size and outcome.
// Those rows stop at 2026-09-18: since litellm became the path, the only record of a tool call is
// the GENERATION row for the model turn that asked for it. So a tool call is now a row in that
// span's `tool_calls` array, and the two eras have to be unioned rather than one replacing the
// other — the TOOL rows are still the only place per-call duration and output exist.
//
// tool_calls and tool_call_names are real columns (Langfuse parses them out of the completion), so
// this costs ~5 MiB rather than the 870 MiB a scan of `input` would. arrayZip is safe here:
// verified 0 rows out of 4,157 have mismatched array lengths.
//
// What this era CANNOT carry, because litellm only sees the LLM exchange and never the tool
// running: duration, output size, and success or failure of the call itself. A GENERATION row's
// level=ERROR is the model request failing, not the tool. Pages must show these as unknown rather
// than as zero — a 0 ms call that returned 0 bytes is a different claim from "not recorded".
const LF_GEN_PREWHERE = `PREWHERE ${LF_LIVE} AND type = 'GENERATION' AND notEmpty(tool_calls)`;
// The bare SELECT, so a page that needs these rows inside its own CTE or a UNION can nest it
// without unwrapping a WITH clause. lfGenCalls() is the same thing as a named CTE.
const lfGenSelect = ({ extra = "" } = {}) => `
    SELECT trace_id AS tid, span_id, start_time AS started,
           session_id AS sid, service_name AS svc, environment AS env,
           tc.2 AS tool,
           JSONExtractString(tc.1, 'arguments') AS args,
           JSONExtractString(tc.1, 'id') AS call_id
           ${extra ? "," + extra : ""}
    FROM ${LF_TABLE}
    ARRAY JOIN arrayZip(tool_calls, tool_call_names) AS tc
    ${LF_GEN_PREWHERE}`;
const lfGenCalls = (opts = {}) => `
  WITH gen_calls AS (${lfGenSelect(opts)}
  )`;
// The tool family, read off the parsed arguments rather than off `name` (which is "litellm_request"
// on every one of these rows). Same payload test as LF_SHELL/LF_FILE, one level down.
//
// Two spellings of the file argument, because two different tool sets reach litellm: Claude Code
// sends file_path, and Zed's own built-in tools (the lowercase read/write/edit the local ollama
// models drive) send path. Checking only file_path silently drops all 47 of the latter, which is
// the same class of mistake as filtering tools by `name`.
const LF_GEN_SHELL = "JSONHas(args, 'command')";
const LF_GEN_FILE = "(JSONHas(args, 'file_path') OR JSONHas(args, 'path'))";
const LF_GEN_PATH =
  "if(JSONHas(args, 'file_path'), JSONExtractString(args, 'file_path'), JSONExtractString(args, 'path'))";

// A trace id as a link into Langfuse's own UI, so a row on these pages can be opened as the
// full request. The project is hardcoded because this compose file initialises exactly one.
const LANGFUSE_URL = "http://127.0.0.1:3000";
function lfTrace(tid, text) {
  if (!tid) return "—";
  const a = el("a", "lf", text || tid.slice(0, 8));
  a.href = `${LANGFUSE_URL}/project/pi/traces/${encodeURIComponent(tid)}`;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.title = "open this trace in Langfuse";
  return a;
}


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
    // The reload button is the "ignore the cache" control. freshOnce is cleared by the reload
    // itself once its queries are issued, so only that round bypasses and a filter change
    // afterwards is warm again.
    const reload = () => {
      freshOnce = true;
      return Promise.resolve(onReload()).finally(() => { freshOnce = false });
    };
    $("go").onclick = reload;
    for (const id of ["url", "user", "pass"]) {
      $(id).addEventListener("keydown", (e) => e.key === "Enter" && reload());
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

// ClickHouse's own query cache, rather than a cache in here. The secrets scan is the same
// aggregation over the same 3.3 GiB of text every time the page is opened or a filter is nudged,
// and it costs ~24s and ~300 GiB of reads to answer identically. Measured on this data: the hits
// phase goes 4.9s -> 3ms and each extraction chunk 2.8s -> 0.03s, same rows out.
//
// Three settings, all required:
//   * nondeterministic_function_handling='save' — ClickHouse classes multiMatchAllIndices as
//     nondeterministic and, by default, ERRORS OUT rather than silently skipping the cache. It is
//     deterministic for our purposes: same text, same patterns, same indices.
//   * min_query_duration — a cache entry is only worth an eviction slot if the query was slow.
//     The filter-options and freshness queries answer in ~30ms and must not displace a scan.
//   * ttl — the table is live (it grew by 200 rows while this was being measured), so entries
//     have to expire on their own. 15 minutes: long enough to cover a filter-fiddling session,
//     short enough that a forgotten tab is not reading yesterday's answer.
// Entries cap at 1 MiB each; the largest real scan result is 44 KiB, so nothing is refused.
const CACHE_TTL = 900, CACHE_MIN_MS = 500;

// Set by the reload button for exactly one round of queries. A reload that served a cached answer
// would be a lie — it is the one control whose whole job is "ask the server again".
let freshOnce = false;

// Read-bypass, not cache-off: a reload still *stores* its result, so the next page load is warm.
const cacheParams = (fresh) => ({
  use_query_cache: "1",
  query_cache_ttl: String(CACHE_TTL),
  query_cache_nondeterministic_function_handling: "save",
  query_cache_min_query_duration: String(CACHE_MIN_MS),
  ...(fresh ? { enable_reads_from_query_cache: "0" } : {}),
});

// Rows per read block, for the queries that read input/output. This is a memory setting, not a
// speed one, and it exists because a block is sized in ROWS while these rows are sized in
// MEGABYTES.
//
// ClickHouse reads 8192 rows per block by default. That was fine when a row was ~575 bytes; since
// litellm started writing whole conversations here, `input` runs to 7.75 MiB on a single row and
// 386 rows are over 4 MiB. One default block of the fat ones is a 2 GiB allocation, which is what
// "attempt to allocate chunk of 2.00 GiB, maximum 1.86 GiB (while reading column input)" is —
// the kill happens in the COLUMN READ, before extractAll ever runs, so neither chunking the
// patterns (SCAN_CHUNK) nor a PREWHERE can prevent it. Only a smaller block can.
//
// Measured on the real failing query, same rows out every time:
//   8192 (default) → killed, 2.00 GiB chunk      1024 → 1.30 GiB peak (only 1.3x under the cap)
//   2048           → killed, 2.00 GiB chunk       256 → 622 MiB peak, 2.6s
// 256 is the knee: 128 and 64 save nothing more (617/603 MiB) and every value from 64 to 4096 runs
// in the same ~2.6s, so the small block costs no time. The heaviest actual 256-row window in this
// table is 781 MiB of text, which is the 622 MiB peak plus overhead — i.e. this is sized against
// the real data, not a guess, and leaves ~3x headroom under the 1.86 GiB per-query ceiling.
//
// ponytail: a block-size cap, not a schema change. If rows keep growing, the durable fix is to stop
// storing whole conversations in a column these pages scan — or scan events_core and accept the
// truncation. Revisit when max(length(input)) passes ~30 MiB, where 256 rows again approaches 2 GiB.
const SCAN_BLOCK_ROWS = 256;
const textScanParams = () => ({ max_block_size: String(SCAN_BLOCK_ROWS) });

// `textScan` marks a query that reads the input/output columns in bulk, so it gets the small-block
// treatment above. It is opt-in rather than global because the dashboard pages' aggregates read
// narrow columns and benefit from full-size blocks.
async function query(sql, params = {}, { cache = false, textScan = false } = {}) {
  const u = new URL($("url").value);
  u.searchParams.set("default_format", "JSON");
  for (const [k, v] of Object.entries(params)) u.searchParams.set("param_" + k, v);
  // Parameterized queries key on the param values too, so the drill-in caches per secret rather
  // than serving the first value's rows for every other one.
  if (cache) {
    for (const [k, v] of Object.entries(cacheParams(freshOnce))) u.searchParams.set(k, v);
  }
  if (textScan) {
    for (const [k, v] of Object.entries(textScanParams())) u.searchParams.set(k, v);
  }
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
// Short form for a figure in a tile or a centre label, where the exact number is in the table
// beside it. Steps through K/M/B rather than stopping at K: token counts run to tens of millions,
// and capping at thousands rendered 49.9M as "49898.0K", which is longer than the digits it
// replaced and unreadable besides. Under 10,000 the full number is short enough to print.
const compact = (n) => {
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs < 10000) return v.toLocaleString();
  for (const [limit, div, suffix] of [[1e6, 1e3, "K"], [1e9, 1e6, "M"], [Infinity, 1e9, "B"]]) {
    if (abs < limit) return (v / div).toFixed(1) + suffix;
  }
};
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
  // A series value of null means "not measured here", which is not the same as zero and must not
  // be drawn as a point on the floor. Nulls are excluded from the scale and break the line into
  // separate runs, so a gap in the data reads as a gap.
  const defined = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
  const max = niceMax(Math.max(
    ...series.flatMap((s) => rows.map(s.value).filter(defined).map(Number)), 1));
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
    // Contiguous runs of defined points. One path per run, so a null leaves a hole rather than a
    // line dropping to the axis and climbing back out.
    const runs = [];
    rows.forEach((r, i) => {
      const v = s.value(r);
      if (!defined(v)) { runs.push(null); return; }
      const pt = `${px(i).toFixed(1)},${py(Number(v)).toFixed(1)}`;
      if (runs.at(-1) && Array.isArray(runs.at(-1))) runs.at(-1).push({ i, pt });
      else runs.push([{ i, pt }]);
    });
    for (const run of runs.filter(Array.isArray)) {
      const pts = run.map((p) => p.pt).join(" L");
      if (s.area) {
        const a = svgEl("path", { d: `M${px(run[0].i)},${py(0)} L${pts} ` +
                                     `L${px(run.at(-1).i)},${py(0)} Z` });
        a.style.fill = s.color;
        a.style.fillOpacity = 0.14;
        svg.append(a);
      }
      // A single point has no line to draw, so it gets a dot regardless of the step threshold.
      const p = svgEl("path", { class: "series", d: `M${pts}` });
      p.style.stroke = s.color;
      svg.append(p);
      if (step >= 9 || run.length === 1) {
        for (const { i } of run) {
          const c = svgEl("circle", { cx: px(i), cy: py(Number(s.value(rows[i]))), r: 2.5 });
          c.style.fill = s.color;
          svg.append(c);
        }
      }
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
      const v = series[k].value(rows[i]);
      // Hidden, not parked at zero: a hover dot on the axis would assert a measurement that the
      // null says was never taken.
      if (!defined(v)) { c.setAttribute("opacity", 0); return; }
      c.setAttribute("cx", px(i));
      c.setAttribute("cy", py(Number(v)));
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

// ---- secret triage, used by secrets.html ----
// The scan is built from a source descriptor naming the table and which of its columns hold the
// text, the grouping id and the timestamp, so it is not tied to one schema. The heuristics below
// are the subtle part: they decide whether a regex match actually holds credential material.
//
// Matching runs server-side through multiMatchAllIndices, which ClickHouse evaluates with
// vectorscan in one pass, so 1400+ regexes over the whole table stay subsecond. The generator
// already dropped the patterns ClickHouse rejects as too slow.

const chEsc = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const arrayLit = (pats) => "[" + pats.map((p) => "'" + chEsc(p.regex) + "'").join(",") + "]";

// Grouping is on the untruncated value so distinctness stays exact, but only the first
// VALUE_MAX characters come back; `len` exposes the over-match.
const VALUE_MAX = 200, VALUE_LIMIT = 2000;
const CONTEXT_PAD = 32, CONTEXT_LEN = 220;

// Secrets, not promises of secrets. Two rules, both cheap, both about the value rather than the
// rule that found it:
//   * a match with no credential material in it. github_token(=| :) captures the assignment and
//     stops, so it can never hold a secret; aws_secret_access_key is a variable name. Material
//     means a 16+ run from a credential charset that mixes digits with letters, or is long hex
//     or base64 — the shapes a generated credential actually takes.
//   * an Actions pin. If the material is exactly 40 hex and no credential word sits with it, it
//     is a pinned action or a git object, not a classic PAT.
const RUN = /[A-Za-z0-9+/=_-]{16,}/g;
const KEY_HEADER = /BEGIN [A-Z0-9 ]*(PRIVATE KEY|PGP)/i;
// 40 hex is a git SHA and also the shape of a pre-ghp_ classic PAT, so something has to break
// the tie. Enumerating SHA contexts does not converge — action pins, `100644 <sha>` from
// ls-tree, "bump X from <sha>", ?ref=, version→SHA maps — so the test is inverted: a bare 40
// hex is a SHA unless a credential word sits in the match with it. Only the rule that requires
// "github" near 40 hex produces these, so nothing else is affected: ghp_ tokens, AKIA keys and
// key headers all take other shapes.
const HEX40 = /\b[0-9a-f]{40}\b/;
const CRED_WORD = /(token|secret|password|passwd|api[_-]?key|apikey|auth|credential)/i;
const material = (s) => (s.match(RUN) || [])
  .filter((r) => (/[0-9]/.test(r) && /[A-Za-z]/.test(r)) || /^[0-9a-f]{32,}$/i.test(r))
  .sort((a, b) => b.length - a.length)[0] || "";

function noiseReason(r) {
  // A -----BEGIN PRIVATE KEY----- line carries no material itself; the key body is the bytes
  // right after it, which is exactly the leak. Never filter these.
  if (KEY_HEADER.test(r.val)) return null;
  if (!material(r.val)) return "no credential material";
  if (HEX40.test(r.val) && !CRED_WORD.test(r.val)) return "git SHA, not a PAT";
  return null;
}

// Enough to recognise AKIAIO••••••LE as AWS's documentation key, not enough to use. Below 20
// characters a head and tail would show more of the value than it hid, so mask the lot; every
// credential shape worth previewing (AWS keys, GitHub tokens) is longer than that anyway.
const mask = (s) => s.length < 20 ? "•".repeat(8) : s.slice(0, 6) + "••••••" + s.slice(-2);

// Masked until asked. Hover would reveal every value the cursor crossed on its way down the
// table, so it takes a click, and the click does not select the row.
function revealNode(full, placeholder) {
  const wrap = el("span", "val");
  const code = el("code", null, placeholder);
  const btn = el("button", "reveal", "reveal");
  let shown = false;
  btn.onclick = (e) => {
    e.stopPropagation();
    shown = !shown;
    code.textContent = shown ? full : placeholder;
    code.classList.toggle("shown", shown);
    btn.textContent = shown ? "hide" : "reveal";
  };
  wrap.append(code, btn);
  return wrap;
}

const valueCell = (r) =>
  revealNode(r.val + (Number(r.len) > VALUE_MAX ? "…" : ""), mask(r.val));

// A source names the table, the SQL expression holding the scannable text, the id whose distinct
// count is the "how many conversations" number, and the timestamp. `where` is an extra predicate
// (langfuse soft-deletes rows; the acp table has nothing to exclude).
//
// One row per (message, matching pattern). arrayJoin over the index list turns the per-row match
// array into countable rows.
const hitsQuery = (src, pats) => `
  SELECT idx, count() AS hits, uniqExact(gid) AS groups,
         min(ts) AS first_ts, max(ts) AS last_ts
  FROM (
    SELECT arrayJoin(multiMatchAllIndices(${src.text}, ${arrayLit(pats)})) AS idx,
           ${src.group} AS gid, ${src.ts} AS ts
    FROM ${src.table}${src.where ? ` WHERE ${src.where}` : ""}
  )
  GROUP BY idx ORDER BY hits DESC`;

// The counts above are per pattern, which overstates the problem: one token pasted into 400
// shell commands is one secret to rotate, not 400 findings. So group by the extracted value.
//
// Four traps in here:
//   * extract/extractAll return the first capture GROUP, not the whole match, so a pattern
//     like (AKIA|ASIA)[A-Z0-9]{16} yielded just "AKIA". Wrapping the whole regex in a group
//     makes group 1 the full match.
//   * the needle must be a literal, so the patterns are unrolled into an array of
//     (index, matches) tuples rather than indexed dynamically.
//   * ORDER BY must not name the `val` alias. Sorting on a computed expression over the
//     GROUP BY key sends the plan optimizer past its 10,000-optimization ceiling and the
//     query dies with TOO_MANY_QUERY_PLAN_OPTIMIZATIONS. Ordering by hits alone is fine.
//   * some upstream regexes end in .+ (AWS ARN does) and greedily eat the rest of the line.
const valuesQuery = (src, pats) => `
  SELECT idx, substring(v, 1, ${VALUE_MAX}) AS val, length(v) AS len, count() AS hits,
         uniqExact(gid) AS groups, min(ts) AS first_ts, max(ts) AS last_ts
  FROM (
    SELECT gid, ts, pair.1 AS idx, arrayJoin(pair.2) AS v
    FROM (
      SELECT gid, ts, arrayJoin([${pats.map((p, i) =>
        `tuple(toUInt16(${i + 1}), extractAll(txt, '(${chEsc(p.regex)})'))`).join(",")}]) AS pair
      FROM (
        SELECT ${src.group} AS gid, ${src.ts} AS ts, ${src.text} AS txt
        FROM ${src.table}
        WHERE ${src.where ? `${src.where} AND ` : ""}multiMatchAny(${src.text}, ${arrayLit(pats)})
      )
    )
  )
  WHERE v != '' GROUP BY idx, v ORDER BY hits DESC LIMIT ${VALUE_LIMIT}`;

// Every message a given value appears in, plus the text around it. The context matters because
// plenty of upstream rules match the *name* of a credential rather than its value — github_token
// is literally github[_-]?token(=| =|:| :) — so the match itself holds no secret and the thing
// worth reading is whatever follows it.
//
// toInt64 before subtracting: position() returns UInt64, so pos - CONTEXT_PAD underflows to a
// vast number for a match near the start of the line, and substring then returns nothing.
const placedQuery = (src) => `
  SELECT ${src.ts} AS ts, ${src.detail}
         substring(${src.text},
                   greatest(toInt64(position(${src.text}, {val:String})) - ${CONTEXT_PAD}, 1),
                   ${CONTEXT_LEN}) AS context
  FROM ${src.table}
  WHERE ${src.where ? `${src.where} AND ` : ""}position(${src.text}, {val:String}) > 0
  ORDER BY ts DESC LIMIT 60`;

// Run the two-phase scan: match to find which patterns fire, then extract values from only those.
//
// Extraction is chunked, and that is not a tuning knob — it is what keeps the page working. Each
// unrolled extractAll() independently evaluates the text expression, so N patterns in one query
// cost N passes over the concatenated prompt+completion column. Against ~1.8 GiB of text, the
// whole matched set in one query peaked at 5.2 GiB and was killed.
//
// There are TWO independent memory limits in play here, and they need different fixes:
//   * reading the text column — bounded by SCAN_BLOCK_ROWS (max_block_size). A default 8192-row
//     block of million-byte rows is a 2 GiB allocation and dies before extractAll runs at all.
//   * materialising the matches — bounded by this chunk size. A broad pattern
//     (github[_-]?token(=| =|:| :)) matches tens of thousands of rows, and each match carries the
//     grouping id and both timestamps through the arrayJoin.
// Fixing only one leaves the other to kill the query, which is why both are set.
//
// 2, down from 4: with the table at 7.2 GiB of text, the heaviest 4-pattern chunk peaked at
// 1.19 GiB against the 1.86 GiB per-query ceiling — under the limit but only 1.5x under it, on a
// table that grows every session. Measured on that same chunk, split: 2 patterns peaks at 843 MiB
// and 1 at 868 MiB, so 2 is where the curve flattens — going to 1 buys nothing and doubles the
// round trips. Total scan time is unchanged (~47s) because the work is the same passes either way.
//
// Chunking is exact, not approximate: the output was compared against per-pattern uncapped ground
// truth and both found the same 188-189 distinct (pattern, value) pairs. The alternative tried
// first — capping the text with substring() — silently lost matches, because 370 rows are larger
// than 1 MiB and the furthest real match sat 2.13 MiB into a row. Truncation loses credentials, so
// it was rejected; batching costs a few seconds and loses nothing.
//
// The per-chunk pattern index has to be shifted back to its position in `matched`, or every value
// is attributed to the wrong rule.
const SCAN_CHUNK = 2;

async function runScan(src, active, onStatus = () => {}) {
  onStatus(`scanning with ${active.length.toLocaleString()} patterns…`);
  const hits = await query(hitsQuery(src, active), {}, { cache: true, textScan: true });
  const matched = hits.map((r) => active[Number(r.idx) - 1]).filter(Boolean);

  const values = [];
  for (let at = 0; at < matched.length; at += SCAN_CHUNK) {
    const part = matched.slice(at, at + SCAN_CHUNK);
    const done = Math.min(at + part.length, matched.length);
    onStatus(`extracting values — ${done} of ${matched.length} matched pattern(s)…`);
    // Cached per chunk, so a filter change that reuses most of the same patterns only pays for
    // the chunks whose pattern set actually differs.
    for (const r of await query(valuesQuery(src, part), {}, { cache: true, textScan: true })) {
      const p = part[Number(r.idx) - 1];
      if (p) values.push({ ...r, idx: at + Number(r.idx), p });
    }
  }
  // Each chunk applied its own LIMIT, so the union can exceed it and is no longer ordered.
  // Sort by the same key and re-apply the cap, so the page still shows the busiest values first
  // and its "capped at N" note stays true.
  values.sort((a, b) => Number(b.hits) - Number(a.hits));
  return {
    values: values.slice(0, VALUE_LIMIT),
    patterns: hits.map((r) => ({ ...r, p: active[Number(r.idx) - 1] })).filter((r) => r.p),
  };
}

// Split the scanned values on the noise heuristics, keeping the reason so filtered rows stay
// auditable rather than silently dropped.
function triage(values) {
  const kept = [], filtered = [];
  for (const r of values) {
    const why = noiseReason(r);
    (why ? filtered : kept).push(why ? { ...r, why } : r);
  }
  return { kept, filtered };
}

// A re-scan invalidates the selection, so the drill-in has to go with it. Without this the panel
// keeps showing the previous value's occurrences under the new filter, which reads as a result
// for a row that is no longer in the table — and after a filter change it can name a service or
// event type the filter just excluded.
function clearDetail(prompt) {
  $("c-detail").textContent = "";
  $("sub-detail").textContent = prompt;
}

// The notes every page using this scanner owes its reader: what the patterns are, what a match
// does and does not mean, and what the masking is worth. `groupWord` is what the grouping id
// counts (a trace, for the langfuse source); `extra` is appended per page.
function scanNotes(DB, { groupWord, extra = [] }) {
  return [
    `Patterns come from ${DB._source} (${DB._license}). ${DB.upstream_count} upstream rules; ` +
    `${DB.patterns.length} are usable here. ${DB.dropped_expensive.length} were dropped because ` +
    `ClickHouse rejects them as too slow for vectorscan, and ${DB.dropped_invalid.length} would not compile.`,
    `The secret/identifier label is added by update-secret-patterns.py, not by upstream. Upstream ` +
    `confidence rates match certainty, not sensitivity — an AWS ARN rates high and is not a credential. ` +
    `Ambiguous rules are labelled secret, so a Slack webhook URL counts as one even though it is a URL.`,
    `Every match is a candidate, not a finding. Regex detection has no way to tell a live key from an ` +
    `example in documentation, and short high-entropy rules match ordinary text.`,
    `Some upstream rules match the name of a credential, not the credential — github_token is ` +
    `github[_-]?token(=| =|:| :), so its "value" is the assignment itself and the token is whatever ` +
    `follows. That is why the drill-in carries ${CONTEXT_LEN} characters of surrounding text.`,
    `Two filters cut the promises from the secrets, and both are listed under the table rather than ` +
    `dropped. "No credential material" means the match holds no 16-character run that mixes digits ` +
    `with letters or reads as long hex or base64 — a keyword or a variable name. "git SHA" means a ` +
    `bare 40 hex with no credential word beside it: identical in shape to a pre-ghp_ classic PAT, ` +
    `but in this data it is an Actions pin, a git object, or a version map. A private-key header is ` +
    `never filtered, because there the material is the bytes that follow it.`,
    `Counts are of distinct values, not matches: a token pasted into four hundred ${groupWord}s is ` +
    `one secret to rotate. Occurrences count every appearance, so the two numbers differ, and both ` +
    `only see the first ${VALUE_MAX} characters of a match.`,
    `Values arrive masked to a 6-character head and 2-character tail — enough to recognise a false ` +
    `positive, since AKIAIO••••••LE is AWS's documentation key. Reveal shows the full text for one ` +
    `value at a time, on click. The length is always unmasked, because a four-thousand-character ` +
    `"match" is how you spot a greedy rule like AWS ARN, whose regex ends in .+`,
    `Results are served from ClickHouse's query cache for up to ${CACHE_TTL / 60} minutes, because ` +
    `the scan reads gigabytes of text to return the same few hundred rows. So a secret that arrived ` +
    `in the last few minutes may not be listed yet — press reload, which bypasses the cache on ` +
    `purpose, before concluding this data is clean.`,
    ...extra,
  ];
}

