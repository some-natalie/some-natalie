#!/usr/bin/env bash
# End-to-end check: `cat` stands in for an ACP agent, echoing the request back as a response.
# Both directions must land in acp.messages with materialized columns populated.
set -euo pipefail
cd "$(dirname "$0")"

. ~/.config/acp-tap/env
ch() { curl -sS --fail-with-body -u "$ACP_TAP_USER:$ACP_TAP_PASSWORD" "${ACP_TAP_URL:-http://127.0.0.1:8123/}" --data-binary "$1"; }

probe="selftest-$$"
printf '%s\n' "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"session/prompt\",\"params\":{\"sessionId\":\"$probe\"}}" |
  ./acp-tap selftest /bin/cat >/dev/null
sleep 3

got=$(ch "SELECT count(), countDistinct(dir), any(method) FROM acp.messages WHERE session_id = '$probe'")
ch "DELETE FROM acp.messages WHERE session_id = '$probe'"
case "$got" in
  2*$'\t'2*session/prompt*) echo "OK: $got" ;;
  *) echo "FAIL: expected 2 rows across 2 directions with method session/prompt, got: $got" >&2; exit 1 ;;
esac
