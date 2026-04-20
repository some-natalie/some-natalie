#!/usr/bin/env bash
# findings_pipeline_ollama.sh — AI-assisted pentest findings review (local via Ollama)
# Usage: ./findings_pipeline_ollama.sh <findings_file> [logs_dir]
set -euo pipefail

FINDINGS_FILE="${1:?Usage: $0 <findings_file> [logs_dir]}"
LOGS_DIR="${2:-}"
OUTDIR="$(mktemp -d findings_report_XXXXXX)"
KEV_URL="https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
MODEL="gpt-oss:20b"
OLLAMA_BASE="${OLLAMA_HOST:-http://localhost:11434}"

if ! curl -sf "$OLLAMA_BASE/api/tags" > /dev/null 2>&1; then
  echo "Error: Ollama not reachable at $OLLAMA_BASE — is it running?" >&2
  exit 1
fi

call_model() {
  local system="$1"
  local user_prompt="$2"
  local tmp_sys tmp_user tmp_body
  tmp_sys="$(mktemp)"
  tmp_user="$(mktemp)"
  tmp_body="$(mktemp)"
  printf '%s' "$system" > "$tmp_sys"
  printf '%s' "$user_prompt" > "$tmp_user"
  jq -n \
    --arg model "$MODEL" \
    --rawfile system "$tmp_sys" \
    --rawfile user "$tmp_user" \
    '{model: $model, stream: false, messages: [{role: "system", content: $system}, {role: "user", content: $user}]}' \
    > "$tmp_body"
  rm -f "$tmp_sys" "$tmp_user"
  curl -s "$OLLAMA_BASE/v1/chat/completions" \
    -H "content-type: application/json" \
    --data "@$tmp_body" | jq -r '.choices[0].message.content'
  rm -f "$tmp_body"
}

echo "[1/4] Identifying top 5 most impactful findings..."
FINDINGS_CONTENT="$(cat "$FINDINGS_FILE")"
call_model \
  "You are a senior penetration tester reviewing security findings. Evaluate impact based on exploitability, business risk, and potential blast radius — not CVSS score." \
  "Review the following findings. Each includes a summary and exploit POC code where available. Identify the FIVE most impactful findings. For each, explain why it ranks highly and what the real-world impact would be.

FINDINGS:
${FINDINGS_CONTENT}" \
  > "$OUTDIR/step1_top5.md"

echo "   -> $OUTDIR/step1_top5.md"

echo "[2/4] Reviewing logs for creativity / novelty..."
TOP5_CONTENT="$(cat "$OUTDIR/step1_top5.md")"

if [[ -n "$LOGS_DIR" && -d "$LOGS_DIR" ]]; then
  LOGS_CONTENT="$(find "$LOGS_DIR" -type f | head -20 | xargs cat 2>/dev/null || true)"
else
  LOGS_CONTENT="(no logs provided)"
fi

call_model \
  "You are a senior penetration tester analyzing attack logs for noteworthy techniques." \
  "Given these top 5 findings:

${TOP5_CONTENT}

And the associated logs:

${LOGS_CONTENT}

For each finding, identify whether the exploitation technique was creative or novel. Call out anything unusual — unexpected chains, living-off-the-land, unconventional primitives, or non-obvious attack paths." \
  > "$OUTDIR/step2_logs.md"

echo "   -> $OUTDIR/step2_logs.md"

echo "[3/4] Cross-referencing package manifest findings against CISA KEV..."
echo "   Fetching KEV catalog..."
KEV_JSON="$(curl -sf "$KEV_URL" | jq '[.vulnerabilities[] | {cveID, vendorProject, product, shortDescription}]' 2>/dev/null || echo "[]")"

call_model \
  "You are a vulnerability analyst cross-referencing findings against the CISA Known Exploited Vulnerabilities catalog." \
  "Review the findings below and the CISA KEV entries provided. Identify any package manifest findings (dependency CVEs) that appear in the KEV list. Highlight these prominently — they are actively exploited in the wild and represent elevated risk.

FINDINGS:
${FINDINGS_CONTENT}

KEV CATALOG (subset):
${KEV_JSON}" \
  > "$OUTDIR/step3_kev.md"

echo "   -> $OUTDIR/step3_kev.md"

echo "[4/4] Generating talking points..."
STEP1="$(cat "$OUTDIR/step1_top5.md")"
STEP2="$(cat "$OUTDIR/step2_logs.md")"
STEP3="$(cat "$OUTDIR/step3_kev.md")"

call_model \
  "You are a security consultant preparing executive and technical briefing materials." \
  "Based on the analysis below, generate a structured briefing:

## Required output format:

### Top-Line Talking Points (3 items)
For each: one headline sentence with a reference link, followed by 3 sub-points with supporting detail.

### Additional Talking Points (5 items)
Five concise single-sentence talking points covering other notable findings.

---
TOP 5 FINDINGS:
${STEP1}

LOG ANALYSIS:
${STEP2}

KEV CROSS-REFERENCE:
${STEP3}" \
  > "$OUTDIR/talking_points.md"

echo "   -> $OUTDIR/talking_points.md"

# Combine into final report
cat > "$OUTDIR/report.md" <<EOF
# Findings Report
_Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")_
_Model: ${MODEL} (Ollama)_

---

## Top 5 Most Impactful Findings

$(cat "$OUTDIR/step1_top5.md")

---

## Log Analysis: Creative & Novel Techniques

$(cat "$OUTDIR/step2_logs.md")

---

## KEV Cross-Reference

$(cat "$OUTDIR/step3_kev.md")

---

## Talking Points

$(cat "$OUTDIR/talking_points.md")
EOF

echo ""
echo "Done. Report: $OUTDIR/report.md"
