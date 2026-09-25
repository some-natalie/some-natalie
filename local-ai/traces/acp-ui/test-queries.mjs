// Self-check for the shared query builders in app.js: the secret-triage heuristics and
// the langfuse source used by the llm-* pages. Run: node test-queries.mjs
//
// Covers the two things worth breaking: the noise heuristics that decide whether a match holds
// credential material, and the SQL builders that both pages depend on. No framework, no network —
// app.js is loaded with the handful of browser globals it touches at import time stubbed out.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

globalThis.document = {
  head: { append() {} }, body: { append() {} },
  createElement: () => ({ setAttribute() {}, append() {}, style: {}, classList: { toggle() {}, add() {} } }),
  createElementNS: () => ({ setAttribute() {}, append() {}, style: {} }),
  getElementById: () => null, querySelector: () => null,
};
globalThis.localStorage = {};
globalThis.location = { search: "" };

const kit = new Function(readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
  return { noiseReason, material, mask, triage, chEsc, arrayLit,
           hitsQuery, valuesQuery, placedQuery, VALUE_MAX, VALUE_LIMIT };`)();
const { noiseReason, material, mask, triage, chEsc, hitsQuery, valuesQuery, placedQuery } = kit;

const why = (val) => noiseReason({ val });

// ---- material: what counts as generated credential bytes ----
// Mixed-case-and-digits runs and long hex are credential shapes; words and short runs are not.
assert.equal(material("ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"), "ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8");
assert.equal(material("aws_secret_access_key"), "", "a variable name is not material");
assert.equal(material("short1a"), "", "under 16 chars is not material");
assert.equal(material("deadbeefdeadbeefdeadbeefdeadbeef"), "deadbeefdeadbeefdeadbeefdeadbeef", "32 hex is material");
// Longest run wins, so a token embedded in prose is still found. `=` and `_` are in the
// credential charset (base64 padding, key prefixes), so a run ends at whitespace, not at `=`.
assert.equal(material("pasted A1b2C3d4E5f6G7h8I9 into the shell"), "A1b2C3d4E5f6G7h8I9");
assert.equal(material("token=A1b2C3d4E5f6G7h8I9"), "token=A1b2C3d4E5f6G7h8I9");

// ---- noiseReason: keyword matches and git SHAs are filtered, real material is not ----
assert.equal(why("github_token="), "no credential material", "the assignment alone holds nothing");
assert.equal(why("ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"), null, "a real PAT survives");
assert.equal(why("AKIAIOSFODNN7EXAMPLE"), null, "AWS key id survives");

// A bare 40-hex is a git SHA; the same SHA beside a credential word is not filtered, because
// that is the shape of a pre-ghp_ classic PAT.
const sha = "a".repeat(8) + "b1c2d3e4f5" + "0".repeat(12) + "9f8e7d6c5b";
assert.equal(sha.length, 40);
assert.equal(why(`uses: actions/checkout@${sha}`), "git SHA, not a PAT");
assert.equal(why(`github_token: ${sha}`), null, "credential word beside 40 hex breaks the SHA tie");

// A private-key header carries no material of its own — the leak is the bytes after it — so it
// must never be filtered. This is the one case the material rule would get wrong.
assert.equal(why("-----BEGIN RSA PRIVATE KEY-----"), null);
assert.equal(why("-----BEGIN OPENSSH PRIVATE KEY-----"), null);
assert.equal(why("-----BEGIN PGP PRIVATE KEY BLOCK-----"), null);

// ---- mask: never emits the full value, always leaves something recognisable ----
assert.equal(mask("AKIAIOSFODNN7EXAMPLE"), "AKIAIO••••••LE");
assert.equal(mask("short"), "••••••••", "under 20 chars is masked whole");
for (const v of ["AKIAIOSFODNN7EXAMPLE", "ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8"]) {
  assert.ok(!mask(v).includes(v), "a mask must not contain the value it masks");
  assert.ok(mask(v).includes("•"), "a mask must be visibly masked");
}

// ---- triage: splits on the heuristics and keeps the reason ----
const t = triage([
  { val: "ghp_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8" },
  { val: "github_token=" },
  { val: `actions/checkout@${sha}` },
]);
assert.equal(t.kept.length, 1);
assert.equal(t.filtered.length, 2);
assert.ok(t.filtered.every((r) => r.why), "every filtered row explains itself");
assert.equal(t.kept[0].why, undefined, "kept rows carry no reason");

// ---- chEsc: a pattern with quotes or backslashes cannot break out of the SQL literal ----
assert.equal(chEsc(String.raw`a\b'c`), String.raw`a\\b\'c`);
assert.ok(!/(^|[^\\])'/.test(chEsc(`it's`)), "no unescaped quote survives");

// ---- query builders: both sources produce SQL with the columns the pages read ----
const PATS = [{ regex: "AKIA[0-9A-Z]{16}", name: "aws", kind: "secret", confidence: "high" }];
const SOURCES = {
  acp: { table: "acp.messages", text: "raw", group: "session_id", ts: "ts", detail: "session_id AS sid," },
  langfuse: {
    table: "default.events_full", text: "concat(input, '\\n', output)",
    group: "trace_id", ts: "start_time", where: "is_deleted = 0", detail: "trace_id AS tid,",
  },
};
for (const [label, src] of Object.entries(SOURCES)) {
  const hits = hitsQuery(src, PATS), vals = valuesQuery(src, PATS), placed = placedQuery(src);
  for (const [name, sql] of [["hits", hits], ["values", vals], ["placed", placed]]) {
    assert.ok(sql.includes(src.table), `${label}/${name} queries the right table`);
    assert.ok(!/undefined|NaN/.test(sql), `${label}/${name} has no undefined interpolation`);
  }
  // The pages read r.groups and r.last_ts off these rows; renaming either silently empties a column.
  for (const col of ["hits", "groups", "first_ts", "last_ts"]) {
    assert.ok(hits.includes(`AS ${col}`), `${label} hits exposes ${col}`);
    assert.ok(vals.includes(`AS ${col}`), `${label} values exposes ${col}`);
  }
  assert.ok(vals.includes("AS val") && vals.includes("AS len"), `${label} values exposes val/len`);
  assert.ok(placed.includes("AS context"), `${label} placed exposes context`);
  // The value scan must wrap the whole regex in a group: extractAll returns capture group 1, so
  // an unwrapped (AKIA|ASIA)[A-Z0-9]{16} would yield just "AKIA".
  assert.ok(vals.includes(`extractAll(txt, '(${PATS[0].regex})')`), `${label} wraps the regex`);
  // Underflow guard on the context window: position() is UInt64, so the subtraction needs toInt64.
  assert.ok(placed.includes("greatest(toInt64(position("), `${label} guards context underflow`);
  // Sorting on the computed `val` alias trips ClickHouse's plan-optimization ceiling.
  assert.ok(!/ORDER BY[^`]*\bval\b/.test(vals), `${label} does not ORDER BY val`);
  // A soft-deleting source must carry its predicate into every query, or deleted rows come back.
  if (src.where) {
    for (const [name, sql] of [["hits", hits], ["values", vals], ["placed", placed]]) {
      assert.ok(sql.includes(src.where), `${label}/${name} keeps the ${src.where} predicate`);
    }
  }
}

// langfuse scans prompt and completion together; acp scans the whole recorded line.
assert.ok(valuesQuery(SOURCES.langfuse, PATS).includes("concat(input, '\\n', output)"));

// ---- compact: steps past K, because token counts run to tens of millions ----
const { compact, bytes } = new Function(readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
  return { compact, bytes };`)();
assert.equal(compact(999), "999", "small numbers print in full");
assert.equal(compact(9999), "9,999", "under 10k prints in full");
assert.equal(compact(10000), "10.0K");
assert.equal(compact(999999), "1000.0K");
assert.equal(compact(1e6), "1.0M");
assert.equal(compact(49898000), "49.9M", "the case that rendered as 49898.0K");
assert.equal(compact(2.5e9), "2.5B");
// Never let a compacted figure be longer than the digits it replaces.
for (const n of [1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 5e9]) {
  assert.ok(compact(n).length <= String(n).length + 1, `compact(${n}) stays short`);
}
assert.equal(compact(0), "0");
assert.equal(compact(-1e6), "-1.0M", "negatives keep their sign and unit");

// ---- langfuse source: the shape the llm-* stats/bash/files pages depend on ----
const {
  lfCalls, LF_TABLE, LF_LIVE, LF_SHELL, LF_FILE, LF_FAILED, LF_STATUS, LF_SECS, LF_PREWHERE,
  lfGenCalls, lfGenSelect, LF_GEN_SHELL, LF_GEN_FILE, LF_GEN_PATH, LF_GEN_PREWHERE,
} = new Function(readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
  return { lfCalls, LF_TABLE, LF_LIVE, LF_SHELL, LF_FILE, LF_FAILED, LF_STATUS, LF_SECS,
           LF_PREWHERE, lfGenCalls, lfGenSelect, LF_GEN_SHELL, LF_GEN_FILE, LF_GEN_PATH,
           LF_GEN_PREWHERE };`)();

// Tools must be identified by the input payload, never by the event name: Langfuse's `name`
// carries the command or path appended to it, and 5,032 shell calls have a name that IS the
// command ("cd", "grep"), so a name-based filter silently loses a quarter of them.
assert.ok(LF_SHELL.includes("JSONHas(input, 'command')"), "shell is detected by payload");
assert.ok(LF_FILE.includes("JSONHas(input, 'file_path')"), "file ops are detected by payload");
for (const probe of [LF_SHELL, LF_FILE]) {
  assert.ok(!/\bname\b/.test(probe), "tool detection must not read the name column");
}

// events_full, not events_core (truncated input/output) and not traces/observations (empty).
assert.equal(LF_TABLE, "default.events_full");
// Soft deletes must be excluded, or deleted rows reappear in every count.
assert.ok(/is_deleted\s*=\s*0/.test(LF_LIVE), "live rows exclude soft-deleted");

const shellCalls = lfCalls({ where: LF_SHELL, extra: "1 AS probe" });
assert.ok(shellCalls.includes(LF_TABLE) && shellCalls.includes(LF_LIVE));
assert.ok(shellCalls.includes("type = 'TOOL'"), "only tool spans are calls");
assert.ok(shellCalls.includes(LF_SHELL), "the where predicate is applied");
assert.ok(shellCalls.includes("1 AS probe"), "extra columns are appended");
assert.ok(!/undefined|NaN/.test(shellCalls), "no undefined interpolation");
// The pages read these aliases off every row; renaming one silently empties a column.
for (const alias of ["AS tid", "AS started", "AS failed", "AS status", "AS out_len", "AS secs_raw"]) {
  assert.ok(shellCalls.includes(alias), `lfCalls exposes ${alias}`);
}
// A call with no extra columns must not emit a trailing comma.
assert.ok(!/,\s*FROM/.test(lfCalls({ where: LF_FILE })), "no dangling comma without extras");
// Failure is level=ERROR, mirrored into metadata.status — not a non-zero exit code, which the
// trace does not carry.
assert.ok(LF_FAILED.includes("ERROR"), "failure is level=ERROR");
assert.ok(LF_STATUS.includes("metadata_names"), "status reads the metadata map");
// Duration must be seconds, so the page's MAX_SECS cap and bucket edges mean what they say.
assert.ok(LF_SECS.includes("/ 1000") && LF_SECS.includes("millisecond"),
          "duration is milliseconds converted to seconds");

// ---- the PREWHERE that keeps these pages from killing the server ----
// This is the memory bug, and it is a placement bug, not a predicate bug. `input` holds whole
// conversations since litellm started writing here (GENERATION rows average ~1 MB; 5.85 of the
// table's 5.88 GB of input text is theirs), so any predicate touching input decompresses the column
// for every row not already excluded. Measured on the real table: `type='TOOL'` alone reads 53 KiB;
// the same count with JSONHas(input,…) in the same WHERE reads 870 MiB and holds 1.02 GiB — over
// half the 2 GiB per-query ceiling, and five concurrent panels then trip the 3 GiB per-user one.
// The cheap columns must therefore be in an earlier PREWHERE stage than the JSON probe.
assert.ok(/^\s*PREWHERE\b/.test(LF_PREWHERE), "LF_PREWHERE is a PREWHERE clause");
assert.ok(LF_PREWHERE.includes("type = 'TOOL'") && LF_PREWHERE.includes(LF_LIVE),
          "the cheap columns are what get promoted");
// The whole point: no input-reading predicate may ride along in the PREWHERE, or it is evaluated
// in the same pass and the 870 MiB comes back.
assert.ok(!/\binput\b/.test(LF_PREWHERE),
          "LF_PREWHERE must not touch input — that is the 1 GiB regression");
// lfCalls must put its tool-family predicate in WHERE, after the PREWHERE stage.
{
  const sql = lfCalls({ where: LF_SHELL });
  const pre = sql.indexOf("PREWHERE"), where = sql.indexOf("WHERE", sql.indexOf("PREWHERE") + 8);
  assert.ok(pre > 0, "lfCalls uses PREWHERE");
  assert.ok(where > pre, "the input predicate lands in a WHERE after the PREWHERE");
  assert.ok(sql.slice(pre, where).indexOf("input") === -1,
            "nothing between PREWHERE and WHERE reads input");
}
// Every page that reads tool spans must go through the PREWHERE. A page hand-rolling
// "WHERE is_deleted = 0 AND type = 'TOOL' AND JSONHas(...)" is exactly the shape that was killed.
for (const page of ["bash.html", "files.html", "stats.html"]) {
  const src = readFileSync(new URL("./" + page, import.meta.url), "utf8");
  assert.ok(!/WHERE\s+\$\{LF_LIVE\}\s+AND\s+type\s*=\s*'TOOL'\s+AND\s+\$\{LF_(SHELL|FILE)\}/.test(src),
            `${page} must not filter tool spans and input in one WHERE — use LF_PREWHERE`);
}

// ---- the litellm era: tool calls that are not TOOL spans ----
// The zed-acp tap stopped writing TOOL spans on 2026-09-18. Every tool call since is a row in a
// GENERATION span's tool_calls array, so a page reading only TOOL rows goes blank after that date —
// which is what happened to stats.html. These are real columns, so reading them costs ~5 MiB
// against the 870 MiB an input scan would.
assert.ok(LF_GEN_PREWHERE.includes("type = 'GENERATION'"), "gen calls come from GENERATION spans");
assert.ok(LF_GEN_PREWHERE.includes("notEmpty(tool_calls)"), "only spans that requested a tool");
assert.ok(!/\binput\b/.test(LF_GEN_PREWHERE), "the gen source must not scan input either");

const gen = lfGenCalls();
assert.ok(gen.includes("arrayZip(tool_calls, tool_call_names)"),
          "call and name are zipped, so a tool's name stays with its arguments");
assert.ok(gen.includes("ARRAY JOIN"), "one row out per tool call, not per model turn");
assert.ok(!/undefined|NaN/.test(gen), "no undefined interpolation");
for (const alias of ["AS tid", "AS started", "AS tool", "AS args", "AS svc"]) {
  assert.ok(gen.includes(alias), `lfGenCalls exposes ${alias}`);
}
// lfGenSelect is the same query without the CTE wrapper, so a page can nest it in a UNION. If it
// carried its own WITH, every union that embeds it would be a syntax error.
assert.ok(!/\bWITH\b/.test(lfGenSelect()), "lfGenSelect is a bare SELECT, nestable in a UNION");
assert.ok(lfGenCalls().includes("WITH gen_calls AS"), "lfGenCalls is the named-CTE form");
assert.ok(lfGenSelect({ extra: "1 AS probe" }).includes("1 AS probe"), "extra columns are appended");
assert.ok(!/,\s*FROM/.test(lfGenSelect()), "no dangling comma without extras");

// The family test reads the parsed arguments, not `name` — which is "litellm_request" on every one
// of these rows, so a name-based filter would match nothing at all here.
assert.ok(LF_GEN_SHELL.includes("args"), "gen shell detection reads the arguments payload");
for (const probe of [LF_GEN_SHELL, LF_GEN_FILE]) {
  assert.ok(!/\bname\b/.test(probe), "gen tool detection must not read the name column");
}
// Two spellings of the path argument, because two tool sets reach litellm: Claude Code sends
// file_path, Zed's built-in lowercase read/write/edit send path. Checking only file_path drops the
// latter entirely — the same class of bug as filtering tools by name.
assert.ok(LF_GEN_FILE.includes("file_path") && LF_GEN_FILE.includes("'path'"),
          "both spellings of the path argument are recognised");
assert.ok(LF_GEN_PATH.includes("file_path") && LF_GEN_PATH.includes("'path'"),
          "LF_GEN_PATH reads whichever spelling is present");

// Both pages that count tool calls must actually union the two eras, or they go blank after the
// 18th again. The union is the fix; asserting on it is what stops a later edit quietly undoing it.
for (const page of ["stats.html", "bash.html", "files.html"]) {
  const src = readFileSync(new URL("./" + page, import.meta.url), "utf8");
  assert.ok(/UNION ALL/.test(src), `${page} unions the tool-span and litellm eras`);
  assert.ok(/lfGenSelect\(\)/.test(src), `${page} sources litellm calls from the shared builder`);
}

// ---- unmeasured is not zero ----
// litellm sees the model asking for a tool and never the tool running, so its calls have no
// duration, no output size and no outcome. Those must be NULL rather than 0: a nullable column is
// excluded from a median and from count(), whereas a 0 drags the median toward zero and
// countIf(failed) silently reads "not recorded" as "succeeded".
for (const page of ["stats.html", "bash.html", "files.html"]) {
  const src = readFileSync(new URL("./" + page, import.meta.url), "utf8");
  assert.ok(/CAST\(NULL, 'Nullable\(UInt8\)'\) AS fail_flag/.test(src),
            `${page} marks the unmeasured era's outcome NULL, not 0`);
  // countIf(fail_flag) on a Nullable would count NULLs as false and report them as successes; the
  // explicit "= 1" is what keeps unmeasured out of the failure count.
  assert.ok(!/countIf\(fail_flag\)/.test(src),
            `${page} must compare fail_flag explicitly, not coerce a Nullable to a predicate`);
  // And the denominator has to travel with the numerator, or the rate is a share of everything.
  assert.ok(/count\(fail_flag\) AS (known|rated)/.test(src),
            `${page} carries a denominator for the calls that record an outcome`);
}
// bash.html's duration and output are the other two unmeasurables, and the page's medians and
// byte totals are only honest if they are nullable too.
{
  const src = readFileSync(new URL("./bash.html", import.meta.url), "utf8");
  assert.ok(/CAST\(NULL, 'Nullable\(Float64\)'\) AS secs_raw/.test(src),
            "bash.html marks unmeasured duration NULL");
  assert.ok(/CAST\(NULL, 'Nullable\(UInt64\)'\) AS out_len/.test(src),
            "bash.html marks unmeasured output size NULL");
  // A null out_len summed into a byte bucket would report the litellm era as an "empty" bucket.
  assert.ok(/WHERE out_len IS NOT NULL GROUP BY bucket/.test(src),
            "the output distribution excludes calls with no recorded size");
}

// ---- chunked extraction: the thing that keeps the secrets scan inside the memory limit ----
const { SCAN_CHUNK, VALUE_LIMIT: VLIM } = new Function(
  readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
  return { SCAN_CHUNK, VALUE_LIMIT };`)();
// Every unrolled extractAll re-reads the text column, so the batch has to stay small. 6 was the
// largest that survived the real query shape (which also carries gid + both timestamps through
// the arrayJoin); anything above that peaked over 1.9 GiB and was killed. Lowered to 2 once the
// table reached 7.2 GiB of text: 4 still ran but peaked at 1.19 GiB against the 1.86 GiB ceiling,
// and 2 brings the same chunk to 843 MiB for no extra wall-clock.
assert.ok(SCAN_CHUNK >= 1 && SCAN_CHUNK <= 4,
          `SCAN_CHUNK must stay in 1..4, got ${SCAN_CHUNK} — above 4 the scan runs too close ` +
          `to the per-query memory ceiling on a table this size`);

// ---- the read-block cap: the OTHER memory limit, and the one SCAN_CHUNK cannot fix ----
// A block is sized in ROWS, these rows are sized in MEGABYTES. At the 8192-row default, one block
// of litellm's million-byte rows is a 2 GiB allocation and the query dies inside the column read —
// "(while reading column input)" — before extractAll is ever evaluated. So chunking the patterns
// cannot prevent it and neither can a PREWHERE; only a smaller block can.
{
  const { SCAN_BLOCK_ROWS, textScanParams } = new Function(
    readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
    return { SCAN_BLOCK_ROWS, textScanParams };`)();
  // 8192 is the ClickHouse default and the value that fails; 2048 failed too. 256 measured 622 MiB
  // on the query that was dying, and below 256 buys nothing (128 → 617 MiB, 64 → 603 MiB).
  assert.ok(SCAN_BLOCK_ROWS >= 32 && SCAN_BLOCK_ROWS <= 1024,
            `SCAN_BLOCK_ROWS must stay in 32..1024, got ${SCAN_BLOCK_ROWS} — 2048 and up are killed ` +
            `by a 2 GiB read chunk`);
  // The setting has to reach ClickHouse as max_block_size, as a string (URL params are strings).
  const p = textScanParams();
  assert.equal(p.max_block_size, String(SCAN_BLOCK_ROWS),
               "textScanParams sends the block cap as max_block_size");
  assert.ok(Object.values(p).every((v) => typeof v === "string"),
            "query params must be strings to survive URLSearchParams");
}

// Every query that reads input/output in bulk must opt into the small block, or it is the one that
// gets killed. These are the four: both scan phases in app.js, and the model attribution and
// per-value drill-in in secrets.html.
{
  const appSrc = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  for (const q of ["hitsQuery(src, active)", "valuesQuery(src, part)"]) {
    const call = appSrc.slice(appSrc.indexOf(q));
    assert.ok(/^[^;]*textScan:\s*true/.test(call),
              `${q} must be issued with textScan: true — it reads the text column`);
  }
  const secSrc = readFileSync(new URL("./secrets.html", import.meta.url), "utf8");
  for (const q of ["modelsQuery(part)", "placedQuery(src())"]) {
    const call = secSrc.slice(secSrc.indexOf(q));
    assert.ok(/^[\s\S]{0,160}?textScan:\s*true/.test(call),
              `${q} must be issued with textScan: true — it reads the text column`);
  }
  // The filter-options query reads only LowCardinality columns; giving it a 256-row block would
  // make a ~30ms query needlessly chatty for no memory benefit.
  assert.ok(!/service_name AS v FROM \$\{TABLE\}[\s\S]{0,400}?textScan:\s*true/.test(secSrc),
            "the filter-options query must not ask for the small block — it reads no text");
}

// A chunk's pattern index is 1-based within its own batch, so it must be shifted by the batch
// offset to address `matched`. Without the shift every value is attributed to the wrong rule.
// This models the mapping runScan does and checks it round-trips.
{
  const matched = Array.from({ length: 14 }, (_, i) => ({ name: `p${i}` }));
  const seen = [];
  for (let at = 0; at < matched.length; at += SCAN_CHUNK) {
    const part = matched.slice(at, at + SCAN_CHUNK);
    part.forEach((_, j) => {
      const localIdx = j + 1;                 // what ClickHouse returns for this chunk
      const p = part[localIdx - 1];
      seen.push({ global: at + localIdx, p });
    });
  }
  assert.equal(seen.length, matched.length, "every pattern is covered exactly once");
  seen.forEach((r, i) => {
    assert.equal(r.p, matched[i], `chunk offset maps index ${r.global} back to its own pattern`);
    assert.equal(r.global, i + 1, "global index is 1-based and contiguous");
  });
}

// The union of per-chunk results can exceed VALUE_LIMIT and arrives unordered, so runScan must
// re-sort by hits and re-apply the cap — otherwise "capped at N" is a lie and the table is not
// busiest-first. Tested against the real runScan, not a local model of it: a hand-rolled sort in
// this file would pass even if app.js stopped sorting.
//
// runScan closes over app.js's own `query`, so the stub is appended inside the same scope rather
// than set as a global — a global is shadowed by the real declaration and never called.
//
// The fixture is adversarial on purpose. The LAST chunk carries the busiest values and the first
// carries the quietest, so arrival order is the exact reverse of sorted order — with the sort
// removed the first row is the smallest and the deepEqual below fails. Each chunk returns more than
// VALUE_LIMIT rows so the merged total passes VALUE_LIMIT, which is the only way the re-applied
// cap is observable, and the winning values live in the last chunk so a missing cap or a missing
// sort both change the answer.
{
  const COUNT = 12;
  const patterns = Array.from({ length: COUNT }, (_, i) => ({ name: `p${i}`, regex: `x${i}` }));
  const harness = `
    let __call = 0;
    const CHUNKS = Math.ceil(${COUNT} / SCAN_CHUNK);
    const PER_CHUNK = Math.ceil((VALUE_LIMIT + 100) / CHUNKS);
    query = async () => {
      if (__call++ === 0) {
        return ${JSON.stringify(patterns)}.map((_, i) => ({ idx: i + 1, hits: 1, groups: 1 }));
      }
      const chunk = __call - 2;
      // Hits RISE with the chunk number, so the busiest values arrive last.
      return Array.from({ length: PER_CHUNK }, (_, j) => ({
        idx: (j % SCAN_CHUNK) + 1,
        val: "v" + chunk + "_" + j,
        len: 10,
        hits: chunk * 1000000 + j,
        groups: 1, first_ts: "2026-01-01 00:00:00", last_ts: "2026-01-01 00:00:00",
      }));
    };
    return { runScan, SCAN_CHUNK, VALUE_LIMIT, CHUNKS, PER_CHUNK };`;
  const kit = new Function(readFileSync(new URL("./app.js", import.meta.url), "utf8") + harness)();
  const { values } = await kit.runScan({ table: "t", text: "txt", group: "g", ts: "ts" }, patterns);
  const hits = values.map((r) => Number(r.hits));

  assert.ok(hits.length, "the stub produced rows");
  // Without the sort, arrival order puts chunk 0 (hits < 1e6) first and this fails.
  assert.deepEqual(hits, [...hits].sort((a, b) => b - a),
                   "runScan returns values busiest-first across chunk boundaries");
  // The very busiest value came from the LAST chunk, so it only leads if the merge sorted.
  assert.ok(hits[0] >= (kit.CHUNKS - 1) * 1000000,
            "the top row comes from the last chunk, not from whichever chunk returned first");
  assert.equal(values.length, kit.VALUE_LIMIT,
               "the merged result is capped at VALUE_LIMIT rather than every chunk's rows combined");
  // Every value must still carry a real pattern, with the chunk offset applied to its index.
  assert.ok(values.every((r) => r.p && patterns.includes(r.p)),
            "each value keeps a real pattern after the index shift");
  assert.ok(values.every((r) => Number(r.idx) >= 1 && Number(r.idx) <= COUNT),
            "shifted indices stay inside the matched set");
  // Without the offset every chunk reports idx 1..SCAN_CHUNK, so the highest global index can
  // never exceed SCAN_CHUNK. With it, the last chunk's rows reach COUNT. Checked on the index the
  // page actually carries, not on the pattern object — `p` is resolved from the per-chunk slice
  // and is therefore valid either way, which is why asserting on `p` alone misses this.
  assert.ok(Math.max(...values.map((r) => Number(r.idx))) > kit.SCAN_CHUNK,
            "global indices run past SCAN_CHUNK, so the per-chunk offset was applied");
}

// ---- query cache: the settings that make it work, and the reload that must bypass it ----
// All three settings are load-bearing. Without 'save' ClickHouse ERRORS on the scan rather than
// skipping the cache (multiMatchAllIndices is classed nondeterministic), so a missing one breaks
// the page outright rather than just slowing it down.
{
  const { cacheParams, CACHE_TTL, CACHE_MIN_MS } = new Function(
    readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
    return { cacheParams, CACHE_TTL, CACHE_MIN_MS };`)();

  const warm = cacheParams(false), fresh = cacheParams(true);
  assert.equal(warm.use_query_cache, "1");
  assert.equal(warm.query_cache_nondeterministic_function_handling, "save",
               "without 'save' ClickHouse errors on multiMatchAllIndices instead of caching");
  // A live table plus an unbounded TTL means a forgotten tab reports yesterday's secrets.
  assert.ok(Number(warm.query_cache_ttl) > 0 && Number(warm.query_cache_ttl) <= 3600,
            "entries must expire: the source table is still being written to");
  // Cheap queries (filter options, ~30ms) must not evict a scan result from a 1024-entry cache.
  assert.ok(Number(warm.query_cache_min_query_duration) > 0,
            "only slow queries earn a cache slot");

  // Reload bypasses READS but still STORES, so the next page load is warm. cache=0 would throw
  // both away and make every reload cost the next visitor a cold scan too.
  assert.equal(fresh.enable_reads_from_query_cache, "0", "reload must not read from the cache");
  assert.equal(fresh.use_query_cache, "1", "reload still repopulates the cache");
  assert.equal(warm.enable_reads_from_query_cache, undefined,
               "a normal load reads from the cache");
  assert.equal(Number(CACHE_TTL), Number(warm.query_cache_ttl));
  assert.equal(Number(CACHE_MIN_MS), Number(warm.query_cache_min_query_duration));
}

// The staleness caveat has to reach the reader: a cached security scan that looks live is the one
// way this optimisation could mislead someone into thinking nothing leaked.
{
  const { scanNotes } = new Function(readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
    return { scanNotes };`)();
  const notes = scanNotes(
    { _source: "s", _license: "l", upstream_count: 1, patterns: [{}],
      dropped_expensive: [], dropped_invalid: [] },
    { groupWord: "trace" }).join(" ");
  assert.ok(/cache/i.test(notes), "the notes disclose that results may be cached");
  assert.ok(/reload/i.test(notes), "the notes say how to force a fresh scan");
}

// ---- lineChart: a null is a gap, not a point on the floor ----
// The pages now hand lineChart null for days the litellm era does not measure. Number(null) is 0,
// so without explicit handling the chart draws a line diving to the axis and climbing back out —
// which reads as "nothing failed" / "nothing was read back" over a stretch where nothing was
// measured. Checked by counting the SVG paths: a gap in the middle must split the series in two.
{
  const svg = () => {
    const node = {
      tag: "svg", children: [], style: {}, attrs: {},
      setAttribute(k, v) { this.attrs[k] = v },
      getAttribute(k) { return this.attrs[k] },
      append(...kids) { this.children.push(...kids) },
      addEventListener() {},
      getBoundingClientRect: () => ({ left: 0, width: 400 }),
      querySelector: () => null,
      get clientWidth() { return 400 },
    };
    return node;
  };
  const made = [];
  globalThis.document = {
    head: { append() {} }, body: { append() {} },
    createElement: (tag) => { const n = svg(); n.tag = tag; n.classList = { add() {}, toggle() {} };
                              Object.defineProperty(n, "textContent", { set() {}, get: () => "" });
                              return n },
    createElementNS: (_ns, tag) => { const n = svg(); n.tag = tag; made.push(n); return n },
    getElementById: () => null, querySelector: () => null,
  };
  const { lineChart } = new Function(
    readFileSync(new URL("./app.js", import.meta.url), "utf8") + "\nreturn { lineChart };")();

  const paths = () => made.filter((n) => n.tag === "path" && n.attrs.class === "series");
  const host = { clientWidth: 400 };

  made.length = 0;
  lineChart(host, [{ d: "2026-09-01", v: 5 }, { d: "2026-09-02", v: 7 },
                   { d: "2026-09-03", v: 6 }],
            { x: (r) => r.d, series: [{ name: "s", value: (r) => r.v, color: "red" }],
              tipText: () => "" });
  assert.equal(paths().length, 1, "an unbroken series is one path");

  made.length = 0;
  lineChart(host, [{ d: "2026-09-01", v: 5 }, { d: "2026-09-02", v: null },
                   { d: "2026-09-03", v: 6 }],
            { x: (r) => r.d, series: [{ name: "s", value: (r) => r.v, color: "red" }],
              tipText: () => "" });
  assert.equal(paths().length, 2, "a null splits the series into two runs, leaving a visible gap");

  // The null must not reach the path data as a zero either — a 0 y-coordinate for the middle point
  // would be the exact false claim, even if the line happened to be split.
  made.length = 0;
  lineChart(host, [{ d: "2026-09-01", v: 100 }, { d: "2026-09-02", v: null }],
            { x: (r) => r.d, series: [{ name: "s", value: (r) => r.v, color: "red" }],
              tipText: () => "" });
  assert.equal(paths().length, 1, "a trailing null ends the series rather than extending it");
  // And the scale must ignore nulls: with max computed over [100, null] a coerced 0 is harmless,
  // but over [null] Math.max would yield NaN and every coordinate would be NaN.
  made.length = 0;
  lineChart(host, [{ d: "2026-09-01", v: null }, { d: "2026-09-02", v: null }],
            { x: (r) => r.d, series: [{ name: "s", value: (r) => r.v, color: "red" }],
              tipText: () => "" });
  assert.equal(paths().length, 0, "an entirely unmeasured series draws nothing");
  for (const n of made) {
    assert.ok(!/NaN/.test(JSON.stringify(n.attrs)), "no NaN coordinates reach the SVG");
  }
}

console.log("ok — all query checks passed");
