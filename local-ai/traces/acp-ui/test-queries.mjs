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
  lfCalls, LF_TABLE, LF_LIVE, LF_SHELL, LF_FILE, LF_FAILED, LF_STATUS, LF_SECS,
} = new Function(readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
  return { lfCalls, LF_TABLE, LF_LIVE, LF_SHELL, LF_FILE, LF_FAILED, LF_STATUS, LF_SECS };`)();

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

// ---- chunked extraction: the thing that keeps the secrets scan inside the memory limit ----
const { SCAN_CHUNK, VALUE_LIMIT: VLIM } = new Function(
  readFileSync(new URL("./app.js", import.meta.url), "utf8") + `
  return { SCAN_CHUNK, VALUE_LIMIT };`)();
// Every unrolled extractAll re-reads the text column, so the batch has to stay small. 6 was the
// largest that survived the real query shape (which also carries gid + both timestamps through
// the arrayJoin); anything above that peaked over 1.9 GiB and was killed.
assert.ok(SCAN_CHUNK >= 1 && SCAN_CHUNK <= 6,
          `SCAN_CHUNK must stay in 1..6, got ${SCAN_CHUNK} — above 6 the scan is killed`);

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

console.log("ok — all query checks passed");
