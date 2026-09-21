#!/usr/bin/python3
"""Regenerate acp-ui/secret-patterns.json from mazen160/secrets-patterns-db.

The patterns are vendored so the acp-ui pages stay dependency-free and keep working
offline. Upstream is CC-BY-SA-4.0, so attribution travels inside the generated file.

Two things happen here that the upstream data does not give us:

  * Hyperscan triage. ClickHouse evaluates multiMatchAllIndices with vectorscan and
    refuses patterns it judges too slow, failing the whole query. So every pattern is
    probed individually against a live server and the rejects are dropped, rather than
    turning off reject_expensive_hyperscan_regexps and eating the scan cost.
  * An identifier/secret label. Upstream "confidence" rates how surely a pattern
    matches its thing, not whether that thing is sensitive: an ARN rates high and is
    not a credential. These labels are ours, and ambiguity errs toward "secret".

Usage: ./update-secret-patterns.py [--out PATH] [--check]
Credentials come from ~/.config/acp-tap/env or ACP_TAP_* env vars, same as acp-tap.
Requires yq on PATH; the upstream file is YAML and hand-rolling a parser for it is a
correctness trap (unquoted regexes, inline-comment rules).
"""

import argparse
import base64
import http.client
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request

SOURCE_REPO = "mazen160/secrets-patterns-db"
SOURCE_FILE = "db/rules-stable.yml"
SOURCE_URL = "https://github.com/mazen160/secrets-patterns-db"
LICENSE = "CC-BY-SA-4.0"

# A credential term anywhere in the name or regex wins: a Slack webhook URL and a JDBC
# connection string are URLs, but the URL *is* the secret.
SECRET_TERMS = re.compile(
    r"webhook|credential|token|secret|password|passwd|api.?key|private.?key"
    r"|connection.?string|\bauth\b|redis|mongo|postgres|mysql",
    re.I,
)
# Otherwise, these say "this locates a resource" rather than "this authenticates".
IDENTIFIER_TERMS = re.compile(
    r"arn:|\barn\b|bucket|hostname|\bdomain\b|\bemail\b|\.amazonaws\.com|execute-api"
    r"|\bcompute\b|cloudfront|\belb\b|\burl\b|\buri\b|://|\bip address\b|\busername\b",
    re.I,
)


def classify(name, regex):
    blob = "%s %s" % (name, regex)
    if SECRET_TERMS.search(blob):
        return "secret"
    return "identifier" if IDENTIFIER_TERMS.search(blob) else "secret"


def config():
    cfg = {}
    try:
        with open(os.path.expanduser("~/.config/acp-tap/env")) as fh:
            for line in fh:
                line = line.strip()
                if line.startswith("ACP_TAP_") and "=" in line:
                    key, value = line.split("=", 1)
                    cfg[key] = value
    except OSError:
        pass
    cfg.update({k: v for k, v in os.environ.items() if k.startswith("ACP_TAP_")})
    return cfg


def fetch_rules():
    """Upstream YAML, via the contents API so no branch name is hardcoded."""
    url = "https://api.github.com/repos/%s/contents/%s" % (SOURCE_REPO, SOURCE_FILE)
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    payload = json.load(urllib.request.urlopen(req, timeout=60))
    return base64.b64decode(payload["content"])


def parse_yaml(blob):
    if not shutil.which("yq"):
        sys.exit("error: yq not found on PATH; needed to parse the upstream YAML")
    out = subprocess.run(
        ["yq", "-o=json", ".patterns | map(.pattern)"],
        input=blob, capture_output=True, check=True,
    ).stdout
    return json.loads(out)


class ClickHouse:
    def __init__(self, cfg):
        url = urllib.parse.urlparse(cfg.get("ACP_TAP_URL", "http://127.0.0.1:8123/"))
        self.conn = http.client.HTTPConnection(url.hostname, url.port or 8123, timeout=120)
        self.path = "/?" + urllib.parse.urlencode({
            "user": cfg.get("ACP_TAP_USER", "acp"),
            "password": cfg.get("ACP_TAP_PASSWORD", ""),
        })

    def run(self, sql):
        self.conn.request("POST", self.path, body=sql.encode())
        res = self.conn.getresponse()
        return res.status, res.read().decode("utf-8", "replace")


def escape(regex):
    """For a ClickHouse single-quoted string literal, which unescapes before RE2 sees it."""
    return regex.replace("\\", "\\\\").replace("'", "\\'")


def triage(patterns, ch):
    """Keep only patterns ClickHouse will actually accept inside multiMatchAllIndices."""
    kept, expensive, invalid = [], [], []
    for i, p in enumerate(patterns, 1):
        regex = (p.get("regex") or "").strip()
        name = (p.get("name") or "").strip()
        if not regex or not name:
            invalid.append(name or "(unnamed)")
            continue
        status, body = ch.run(
            "SELECT length(multiMatchAllIndices('probe', ['%s']))" % escape(regex))
        if status == 200:
            kept.append({
                "name": name,
                "regex": regex,
                "confidence": (p.get("confidence") or "unknown").strip(),
                "kind": classify(name, regex),
            })
        elif "too slow" in body:
            expensive.append(name)
        else:
            invalid.append(name)
        if i % 200 == 0:
            print("  probed %d/%d" % (i, len(patterns)), file=sys.stderr)
    return kept, expensive, invalid


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(here, "acp-ui", "secret-patterns.json"))
    ap.add_argument("--check", action="store_true",
                    help="exit 1 if the output would change; writes nothing")
    args = ap.parse_args()

    print("fetching %s from %s" % (SOURCE_FILE, SOURCE_REPO), file=sys.stderr)
    patterns = parse_yaml(fetch_rules())
    print("upstream patterns: %d" % len(patterns), file=sys.stderr)

    ch = ClickHouse(config())
    status, body = ch.run("SELECT 1")
    if status != 200:
        sys.exit("error: ClickHouse unreachable or credentials wrong: %s" % body.strip()[:200])

    kept, expensive, invalid = triage(patterns, ch)
    if not kept:
        sys.exit("error: no usable patterns survived triage; refusing to write")

    # Sorted so the file is stable and a scheduled run produces an empty diff when
    # upstream has not changed.
    kept.sort(key=lambda p: (p["name"].lower(), p["regex"]))
    doc = {
        "_comment": "GENERATED by update-secret-patterns.py -- do not edit by hand.",
        "_source": SOURCE_URL,
        "_source_file": SOURCE_FILE,
        "_license": LICENSE,
        "_attribution": "Secret detection patterns from %s (%s), licensed %s." % (
            SOURCE_REPO, SOURCE_URL, LICENSE),
        "_notes": [
            "kind is added here, not upstream: upstream confidence rates match certainty,"
            " not sensitivity. Ambiguous cases are labelled secret.",
            "Patterns ClickHouse rejects as too slow for vectorscan are dropped.",
        ],
        "upstream_count": len(patterns),
        "dropped_expensive": sorted(expensive),
        "dropped_invalid": sorted(invalid),
        "patterns": kept,
    }
    blob = json.dumps(doc, indent=2, sort_keys=False) + "\n"

    print("kept %d, dropped %d expensive, %d invalid"
          % (len(kept), len(expensive), len(invalid)), file=sys.stderr)
    print("  %d secret, %d identifier"
          % (sum(1 for p in kept if p["kind"] == "secret"),
             sum(1 for p in kept if p["kind"] == "identifier")), file=sys.stderr)

    if args.check:
        try:
            with open(args.out) as fh:
                current = fh.read()
        except OSError:
            current = ""
        if current != blob:
            print("out of date: %s" % args.out, file=sys.stderr)
            return 1
        print("up to date: %s" % args.out, file=sys.stderr)
        return 0

    with open(args.out, "w") as fh:
        fh.write(blob)
    print("wrote %s" % args.out, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
