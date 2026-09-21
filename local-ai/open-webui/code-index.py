#!/usr/bin/python3
"""Index local source trees and their external references into Elasticsearch.

Embeddings default to ollama's nomic-embed-text-v2-moe (768 dims, 512-token context), so
chunks are kept small. That model has no prompt template baked in, so the nomic task
prefixes are applied here: "search_document: " when indexing, "search_query: " when
searching. Mixing the two up quietly degrades recall, which is why they are constants.
Point EMBED_MODEL at another model and set EMBED_DIMS to match; a dimension mismatch is
rejected by Elasticsearch at index time, so delete the index when you switch.

Every file the crawler reads is also scanned for http(s) URLs. Those get fetched and
indexed as kind=external, with referenced_by pointing back at the files that cited them.
GitHub and GHES URLs go through the REST API using the token gh already holds, because the
useful part of an issue or a blob is not in its HTML.

Files git ignores are skipped, so local credentials and state in a working tree stay out of
the index. Run with --dry-run first to see what a given set of roots would pull in.

Usage:
  ./code-index.py --self-check                   offline assertions, no network
  ./code-index.py ~/src/foo ~/src/bar            index files + external refs
  ./code-index.py                                prompt for directories, then index
  ./code-index.py ~/src/foo --dry-run            crawl and report, no writes
  ./code-index.py ~/src/foo --no-refs            index files only
  ./code-index.py ~/src/foo --refs-only          refresh external refs only
  ./code-index.py ~/src/foo --knowledge          upload to an Open WebUI collection
  ./code-index.py --query "how does promotion work"

Environment (or a .env sitting next to this file, which is read for all of these):
  ELASTIC_PASSWORD        required for anything that touches Elasticsearch
  ELASTIC_USER            default "elastic"
  OPEN_WEBUI_TOKEN        required for --knowledge (Settings -> Account -> API keys)
  CODE_INDEX_ROOTS        os.pathsep-separated directories, so the prompt can be skipped
  ES_URL                  default http://localhost:9200
  OLLAMA_URL              default http://localhost:11434
  OPEN_WEBUI_URL          default http://localhost:3080
  CODE_INDEX_INDEX        Elasticsearch index name, default "code-search"
  EMBED_MODEL             ollama model, default nomic-embed-text-v2-moe:latest
  EMBED_DIMS              vector width the model emits, default 768
  GITHUB_HOSTS            comma-separated, default "github.com"; add your GHES host here
  CODE_INDEX_AUTH_HOSTS   comma-separated host suffixes to send the gh token to, for
                          internal sites behind the same SSO as your GHES
  CODE_INDEX_INSECURE_TLS set to 1 to pass curl -k (TLS-inspecting corporate proxies)
  CODE_INDEX_KNOWLEDGE_SKIP_DIRS
                          comma-separated directory names whose JSON stays out of the
                          Open WebUI collection but still lands in Elasticsearch
  GH_BIN                  path to the gh binary; blank checks the usual install paths
                          before PATH, since a `gh` on PATH is often a wrapper or shim
"""

import argparse
import base64
import concurrent.futures
import glob
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))

# Set by resolve_roots() from argv, $CODE_INDEX_ROOTS, or an interactive prompt.
ROOTS = []


def load_env():
    """Load KEY=VALUE pairs from the .env sitting next to this file.

    Runs at import, before the constants below read the environment, so the file can set
    any of them. The real environment always wins, so an exported value overrides the file.
    """
    path = os.path.join(HERE, ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = val.strip().strip("'\"")


load_env()


def env(name, default):
    return os.environ.get(name) or default


def env_set(name, default):
    """Parse a comma-separated env var into a lowercased set."""
    return {p.strip().lower() for p in env(name, default).split(",") if p.strip()}


ES = env("ES_URL", "http://localhost:9200").rstrip("/")
INDEX = env("CODE_INDEX_INDEX", "code-search")
OLLAMA = env("OLLAMA_URL", "http://localhost:11434").rstrip("/")
EMBED_MODEL = env("EMBED_MODEL", "nomic-embed-text-v2-moe:latest")
DIMS = int(env("EMBED_DIMS", "768"))
DOC_PREFIX = "search_document: "
QUERY_PREFIX = "search_query: "

OPEN_WEBUI = env("OPEN_WEBUI_URL", "http://localhost:3080").rstrip("/")
KNOWLEDGE_NAME = env("CODE_INDEX_KNOWLEDGE_NAME", "code")
OW_BATCH = 100

CHUNK_CHARS = 1600
CHUNK_OVERLAP = 200
EMBED_BATCH = 32
BULK_DOCS = 200
MAX_FILE_BYTES = 1_000_000
FETCH_WORKERS = 8
FETCH_TIMEOUT = 20
MAX_REF_CHARS = 200_000

# Generated, vendored, or duplicated trees. .worktrees holds second checkouts of a repo
# already crawled, so indexing it doubles every hit for no new content.
SKIP_DIRS = {
    ".git", ".terraform", "node_modules", "_site", ".ruff_cache", "__pycache__",
    ".worktrees", ".jekyll-cache", ".venv", "venv", ".pytest_cache", ".mypy_cache",
    ".next", ".cache", "vendor",
}
# sbom.spdx.json and friends are megabytes of package inventory apiece: they would dominate
# the index and answer no question anyone asks in prose.
SKIP_NAMES = {".DS_Store", ".env", "sbom.spdx.json", "Gemfile.lock", "package-lock.json"}
SKIP_SUFFIXES = (
    ".bundle.json", ".pyc", ".pyo", ".so", ".dylib", ".png", ".jpg", ".jpeg", ".gif",
    ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".pdf", ".zip", ".gz", ".tgz",
    ".bz2", ".xz", ".tar", ".whl", ".jar", ".class", ".wasm", ".mp4", ".mov", ".webp",
    ".tfstate", ".tfstate.backup", ".tfplan", ".pem", ".key", ".p12", ".crt", ".der",
)

URL_RE = re.compile(r'https?://[^\s"\'`<>)\]}\\|]+')
# Templated URLs in shell and workflow files: fetching these is meaningless.
URL_PLACEHOLDERS = ("${", "$(", "{", "<", "%s", "%d", "\\n", "…", "**")
SKIP_REF_HOSTS = {
    "example.com", "www.example.com", "localhost", "127.0.0.1",
    "0.0.0.0", "host.docker.internal", "api.github.com", "registry.npmjs.org",
}
# Documentation placeholders and unroutable names, plus avatar CDNs that serve only images.
SKIP_HOST_SUFFIXES = (".example", ".example.com", ".invalid", ".test", ".local",
                      ".localdomain")
SKIP_HOST_PREFIXES = ("avatars.", "avatar.")
# Hosts whose URLs are read through the GitHub REST API instead of scraping HTML. Add a
# GitHub Enterprise Server host here to get its issues, blobs, and releases as text.
GITHUB_HOSTS = env_set("GITHUB_HOSTS", "github.com")
# Host suffixes that get the gh token attached on plain (non-API) fetches, for internal
# sites sharing SSO with your GHES.
AUTH_HOST_SUFFIXES = tuple(sorted(env_set("CODE_INDEX_AUTH_HOSTS", "")))
INSECURE_TLS = env("CODE_INDEX_INSECURE_TLS", "") not in ("", "0", "false", "no")
UA = "code-index/1.0 (local indexer)"

_token_cache = {}


# ---------------------------------------------------------------------------- helpers


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def now():
    return datetime.now(timezone.utc).isoformat()


def resolve_roots(paths):
    """Settle the directories to crawl: argv, then $CODE_INDEX_ROOTS, then ask.

    Asking is the fallback rather than an error because the common case is one person on one
    laptop pointing this at a couple of checkouts, and remembering a flag for that is work.
    """
    if not paths:
        paths = [p for p in env("CODE_INDEX_ROOTS", "").split(os.pathsep) if p.strip()]
    if not paths and sys.stdin.isatty():
        print("Directories to index (space- or comma-separated, ~ and globs ok):",
              file=sys.stderr)
        try:
            reply = input("> ")
        except EOFError:
            reply = ""
        paths = [p for p in re.split(r"[,\s]+", reply.strip()) if p]
    roots, bad = [], []
    for raw in paths:
        matches = glob.glob(os.path.expanduser(raw)) or [os.path.expanduser(raw)]
        for path in matches:
            path = os.path.abspath(path)
            if not os.path.isdir(path):
                bad.append(path)
            elif path not in roots:
                roots.append(path)
    for path in bad:
        log(f"not a directory, skipping: {path}")
    if not roots:
        sys.exit("no directories to index: pass them as arguments or set CODE_INDEX_ROOTS")
    # A root nested inside another would index its files twice under two project names.
    for outer in list(roots):
        for inner in list(roots):
            if inner != outer and inner.startswith(outer + os.sep):
                log(f"dropping {inner}: already covered by {outer}")
                roots.remove(inner)
    return roots


def request(url, data=None, method=None, headers=None, timeout=120, content_type=None):
    """POST/GET JSON against a localhost service (Elasticsearch, ollama)."""
    body = None
    hdrs = {"User-Agent": UA}
    if headers:
        hdrs.update(headers)
    if data is not None:
        if isinstance(data, bytes):
            body = data
        else:
            body = json.dumps(data).encode()
        hdrs["Content-Type"] = content_type or "application/json"
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = resp.read()
        return json.loads(payload) if payload else {}


def es(path, data=None, method=None, timeout=120, content_type=None):
    password = os.environ.get("ELASTIC_PASSWORD")
    if not password:
        sys.exit("ELASTIC_PASSWORD is not set and no .env was found next to this script")
    user = env("ELASTIC_USER", "elastic")
    auth = base64.b64encode((user + ":" + password).encode()).decode()
    return request(ES + path, data=data, method=method, timeout=timeout,
                   content_type=content_type,
                   headers={"Authorization": "Basic " + auth})


CURL = shutil.which("curl") or "/usr/bin/curl"


def http_get(url, headers=None, timeout=FETCH_TIMEOUT):
    """GET a remote URL via curl, returning (status, content_type, body_bytes).

    curl rather than urllib because TLS-inspecting corporate proxies commonly present a CA
    cert that OpenSSL 3 rejects outright ("Basic Constraints of CA cert not marked
    critical"), leaving urllib unable to reach public hosts at all. Localhost traffic
    (Elasticsearch, ollama) still goes through urllib.

    Set CODE_INDEX_INSECURE_TLS=1 on such a network to add -k. That disables verification
    for every external fetch including the GitHub/GHES API calls, which carry a bearer
    token, so leave it off unless the chain genuinely is not verifiable from where you sit.
    """
    cmd = [CURL, "-sSL", "--compressed", "--max-time", str(timeout), "-A", UA,
           "-D", "/dev/stderr", "-o", "-"]
    if INSECURE_TLS:
        cmd.append("-k")
    for key, val in (headers or {}).items():
        cmd += ["-H", f"{key}: {val}"]
    cmd.append(url)
    out = subprocess.run(cmd, capture_output=True, timeout=timeout + 10)
    if out.returncode != 0:
        detail = out.stderr.decode("utf-8", "replace").strip().splitlines()
        raise OSError(f"curl exit {out.returncode}: {detail[-1] if detail else '?'}"[:200])
    status, ctype = 0, ""
    for line in out.stderr.decode("utf-8", "replace").splitlines():
        line = line.strip()
        if line.upper().startswith("HTTP/"):
            bits = line.split()
            if len(bits) > 1 and bits[1].isdigit():
                status = int(bits[1])  # last status wins, after any redirects
        elif ":" in line:
            key, _, val = line.partition(":")
            if key.strip().lower() == "content-type":
                ctype = val.strip().lower()
    if status >= 400:
        raise OSError(f"HTTP {status}")
    return status, ctype, out.stdout


# Where gh actually lives, checked before PATH. A `gh` on PATH is often a wrapper or plugin
# shim, and a shim that decides to prompt or phone home turns one token lookup into a
# 15-second timeout per host. GH_BIN overrides this outright.
GH_PATHS = ("/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh")


def gh_binary():
    """Best guess at a real gh executable, preferring known install paths over PATH."""
    override = env("GH_BIN", "")
    if override:
        return override if os.path.exists(override) else None
    for path in GH_PATHS:
        if os.path.exists(path):
            return path
    return shutil.which("gh")


def gh_token(host):
    """Return the token gh already holds for a host, or None."""
    if host in _token_cache:
        return _token_cache[host]
    exe = gh_binary()
    token = None
    if exe:
        try:
            out = subprocess.run([exe, "auth", "token", "--hostname", host],
                                 capture_output=True, text=True, timeout=15)
            if out.returncode == 0:
                token = out.stdout.strip() or None
        except (subprocess.SubprocessError, OSError):
            token = None
    _token_cache[host] = token
    return token


# ---------------------------------------------------------------------------- chunking


def chunk(text, size=CHUNK_CHARS, overlap=CHUNK_OVERLAP):
    """Split text on line boundaries into <=size pieces with a trailing-line overlap.

    Line-aware because the corpus is mostly code and YAML, where a chunk that starts
    mid-token embeds badly. Lines longer than size are hard-split.
    """
    out, buf, held = [], [], 0
    for line in text.splitlines(keepends=True):
        while len(line) > size:
            if buf:
                out.append("".join(buf))
                buf, held = [], 0
            out.append(line[:size])
            line = line[size:]
        if held + len(line) > size and buf:
            out.append("".join(buf))
            tail, count = [], 0
            for prev in reversed(buf):
                if count + len(prev) > overlap:
                    break
                tail.insert(0, prev)
                count += len(prev)
            buf, held = tail, count
        buf.append(line)
        held += len(line)
    if buf:
        out.append("".join(buf))
    return [c for c in out if c.strip()]


def embed(texts, prefix=DOC_PREFIX):
    """Embed texts in batches, returning one vector per input."""
    vectors = []
    for start in range(0, len(texts), EMBED_BATCH):
        batch = [prefix + t for t in texts[start:start + EMBED_BATCH]]
        for attempt in range(4):
            try:
                res = request(OLLAMA + "/api/embed",
                              data={"model": EMBED_MODEL, "input": batch}, timeout=300)
                got = res["embeddings"]
                if len(got) != len(batch):
                    raise ValueError(f"asked {len(batch)} got {len(got)}")
                vectors.extend(got)
                break
            except Exception as exc:  # ollama 500s under load; back off and retry
                if attempt == 3:
                    raise
                log(f"  embed retry {attempt + 1}: {exc}")
                time.sleep(2 * (attempt + 1))
    return vectors


# ---------------------------------------------------------------------------- crawling


def walk(root):
    for base, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and not d.endswith(".egg-info"))
        for name in sorted(files):
            if name in SKIP_NAMES or name.endswith(SKIP_SUFFIXES):
                continue
            yield os.path.join(base, name)


_ignored_cache = {}


def ignored_paths(root):
    """Absolute paths under root that git ignores, resolved against each nested repo.

    Gitignored files are local by intent: terraform local.tfvars holding real credentials,
    lock files, build output, state. None of that should land in an Elasticsearch index or
    an LLM-queryable knowledge collection just because it happens to sit in the working
    tree. A root may hold many repos side by side, so check-ignore runs per repo rather
    than once at the top.
    """
    if root in _ignored_cache:
        return _ignored_cache[root]
    repos = []
    for base, dirs, _ in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        if os.path.isdir(os.path.join(base, ".git")):
            repos.append(base)
    out = set()
    for repo in repos:
        rels = [os.path.relpath(p, repo) for p in walk(repo)]
        if not rels:
            continue
        try:
            done = subprocess.run(["git", "-C", repo, "check-ignore", "--stdin"],
                                  input="\n".join(rels), capture_output=True,
                                  text=True, timeout=120)
        except (subprocess.SubprocessError, OSError) as exc:
            log(f"  check-ignore failed in {repo}: {exc}")
            continue
        for line in done.stdout.splitlines():
            if line.strip():
                out.add(os.path.join(repo, line.strip()))
    _ignored_cache[root] = out
    return out


def read_text(path):
    """Return decoded text, or None when the file is binary, empty, or oversized."""
    try:
        size = os.path.getsize(path)
    except OSError:
        return None
    if size == 0 or size > MAX_FILE_BYTES:
        return None
    try:
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError:
        return None
    if b"\x00" in data[:8192]:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def doc_id(*parts):
    return hashlib.sha1("\x00".join(str(p) for p in parts).encode()).hexdigest()


def file_docs(path, text):
    rel = None
    project = ""
    for root in ROOTS:
        if path.startswith(root + os.sep):
            rel = os.path.relpath(path, root)
            project = os.path.basename(root)
            break
    if rel is None:
        rel, project = path, ""
    repo = rel.split(os.sep)[0]
    ext = os.path.splitext(path)[1].lower()
    mtime = datetime.fromtimestamp(os.path.getmtime(path), timezone.utc).isoformat()
    pieces = chunk(text)
    for i, body in enumerate(pieces):
        yield doc_id("file", path, i), {
            "kind": "file",
            "content": body,
            "project": project,
            "repo": repo,
            "path": rel,
            "abs_path": path,
            "ext": ext,
            "title": rel,
            "chunk": i,
            "chunks": len(pieces),
            "mtime": mtime,
            "indexed_at": now(),
        }


# ------------------------------------------------------------------- external refs


def normalize_url(raw):
    """Clean a URL scraped from source, or return None if it is not worth fetching."""
    url = html.unescape(raw).rstrip(".,;:!?\"')]}>*`")
    if any(p in url for p in URL_PLACEHOLDERS):
        return None
    url, _, _ = url.partition("#")
    if not url or len(url) > 500:
        return None
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError:
        return None
    host = (parts.hostname or "").lower()
    if not host or "." not in host or host in SKIP_REF_HOSTS:
        return None
    if host.endswith(SKIP_HOST_SUFFIXES) or host.startswith(SKIP_HOST_PREFIXES):
        return None
    if "@" in parts.netloc:  # credential-bearing clone URLs
        return None
    if parts.scheme not in ("http", "https"):
        return None
    path = parts.path.rstrip("/")
    if path.endswith(".git"):
        path = path[:-4]
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


def github_api(url):
    """Map a GitHub/GHES web URL to (api_url, accept, kind), or None to skip it."""
    parts = urllib.parse.urlsplit(url)
    host = parts.hostname
    api = "https://api.github.com" if host == "github.com" else f"https://{host}/api/v3"
    seg = [s for s in parts.path.split("/") if s]
    if len(seg) < 2:
        return None  # org landing page, nothing to read
    owner, repo, rest = seg[0], seg[1], seg[2:]
    base = f"{api}/repos/{owner}/{repo}"
    if not rest:
        return f"{base}/readme", "application/vnd.github.raw", "readme"
    head = rest[0]
    if head == "blob" and len(rest) >= 3:
        ref, path = rest[1], "/".join(rest[2:])
        q = urllib.parse.urlencode({"ref": ref})
        return f"{base}/contents/{path}?{q}", "application/vnd.github.raw", "blob"
    if head in ("issues", "pull", "pulls") and len(rest) >= 2 and rest[1].isdigit():
        return f"{base}/issues/{rest[1]}", "application/vnd.github+json", "issue"
    if head == "releases":
        if len(rest) >= 3 and rest[1] == "tag":
            tag = urllib.parse.quote(rest[2], safe="")
            return f"{base}/releases/tags/{tag}", "application/vnd.github+json", "release"
        return f"{base}/releases?per_page=10", "application/vnd.github+json", "releases"
    if head == "commit" and len(rest) >= 2:
        return f"{base}/commits/{rest[1]}", "application/vnd.github+json", "commit"
    if head == "tree" and len(rest) >= 3:
        ref, path = rest[1], "/".join(rest[2:])
        q = urllib.parse.urlencode({"ref": ref})
        return f"{base}/contents/{path}?{q}", "application/vnd.github+json", "tree"
    # settings, security, actions, deployments, projects: UI-only or admin-gated.
    return None


def render_github(kind, payload, api_url, host):
    """Turn a GitHub API payload into indexable text plus a title."""
    if kind in ("readme", "blob"):
        return os.path.basename(api_url.split("?")[0]), payload if isinstance(payload, str) else ""
    data = json.loads(payload) if isinstance(payload, str) else payload
    if kind == "issue":
        title = data.get("title", "")
        lines = [f"# {title}", f"state: {data.get('state')}", data.get("body") or ""]
        url = data.get("comments_url")
        if url and data.get("comments"):
            try:
                comments = gh_get(url + "?per_page=50", "application/vnd.github+json", host)
                for c in json.loads(comments):
                    who = (c.get("user") or {}).get("login", "?")
                    lines.append(f"\n--- comment by {who} ---\n{c.get('body') or ''}")
            except Exception as exc:
                log(f"  comments failed for {url}: {exc}")
        return title, "\n".join(lines)
    if kind == "commit":
        msg = (data.get("commit") or {}).get("message", "")
        files = "\n".join(f.get("filename", "") for f in data.get("files") or [])
        return msg.splitlines()[0] if msg else "commit", f"{msg}\n\nfiles:\n{files}"
    if kind == "release":
        return data.get("name") or data.get("tag_name") or "release", data.get("body") or ""
    if kind == "releases":
        out = []
        for r in data if isinstance(data, list) else []:
            out.append(f"## {r.get('tag_name')} {r.get('name') or ''}\n{r.get('body') or ''}")
        return "releases", "\n\n".join(out)
    if kind == "tree":
        names = [e.get("name", "") for e in data if isinstance(data, list)]
        return "tree", "\n".join(names)
    return "", ""


def gh_get(api_url, accept, host):
    headers = {"Accept": accept}
    token = gh_token(host)
    if token:
        headers["Authorization"] = "Bearer " + token
    _, _, payload = http_get(api_url, headers)
    return payload.decode("utf-8", "replace")


class TextExtractor(HTMLParser):
    """Strip HTML to rough plain text, dropping chrome that would pollute embeddings."""

    DROP = {"script", "style", "nav", "header", "footer", "noscript", "svg", "form",
            "aside", "button", "iframe", "template"}
    BREAK = {"p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6",
             "section", "article", "pre", "blockquote", "td", "th"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.depth = 0
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in self.DROP:
            self.depth += 1
        elif tag == "title":
            self._in_title = True
        elif tag in self.BREAK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.DROP and self.depth:
            self.depth -= 1
        elif tag == "title":
            self._in_title = False
        elif tag in self.BREAK:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self.depth and data.strip():
            self.parts.append(data)

    def text(self):
        joined = "".join(self.parts)
        joined = re.sub(r"[ \t\r\f\v]+", " ", joined)
        return re.sub(r"\n\s*\n\s*", "\n\n", joined).strip()


def fetch_ref(url):
    """Fetch one external reference. Returns (title, text) or raises."""
    host = (urllib.parse.urlsplit(url).hostname or "").lower()
    if host in GITHUB_HOSTS:
        route = github_api(url)
        if not route:
            return None, None
        api_url, accept, kind = route
        payload = gh_get(api_url, accept, host)
        return render_github(kind, payload, api_url, host)

    headers = {"Accept": "text/html,application/xhtml+xml,text/plain,application/json;q=0.9"}
    token = gh_token(host) if host.endswith(AUTH_HOST_SUFFIXES) else None
    if token:
        headers["Authorization"] = "Bearer " + token
    _, ctype, payload = http_get(url, headers)
    if not any(t in ctype for t in ("text/", "json", "xml", "yaml")):
        return None, None
    body = payload[:MAX_REF_CHARS * 2].decode("utf-8", "replace")
    if "html" in ctype:
        parser = TextExtractor()
        parser.feed(body)
        return parser.title.strip(), parser.text()[:MAX_REF_CHARS]
    return url.rsplit("/", 1)[-1], body[:MAX_REF_CHARS]


# ---------------------------------------------------------------------------- indexing


MAPPING = {
    "settings": {"index": {"number_of_replicas": 0, "refresh_interval": "30s"}},
    "mappings": {
        "properties": {
            "kind": {"type": "keyword"},
            "content": {"type": "text"},
            "project": {"type": "keyword"},
            "repo": {"type": "keyword"},
            "path": {"type": "keyword"},
            "abs_path": {"type": "keyword", "index": False},
            "ext": {"type": "keyword"},
            "url": {"type": "keyword"},
            "host": {"type": "keyword"},
            "title": {"type": "text"},
            "referenced_by": {"type": "keyword"},
            "chunk": {"type": "integer"},
            "chunks": {"type": "integer"},
            "mtime": {"type": "date"},
            "indexed_at": {"type": "date"},
            "vector": {
                "type": "dense_vector",
                "dims": DIMS,
                "index": True,
                "similarity": "cosine",
            },
        }
    },
}


def ensure_index():
    try:
        es("/" + INDEX)
        return
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
    es("/" + INDEX, data=MAPPING, method="PUT")
    log(f"created index {INDEX}")


class Sink:
    """Buffers docs, embeds them in batches, and pushes them through the _bulk API."""

    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.buf = []
        self.count = 0
        self.failed = 0

    def add(self, _id, doc):
        self.buf.append((_id, doc))
        if len(self.buf) >= BULK_DOCS:
            self.flush()

    def flush(self):
        if not self.buf:
            return
        batch, self.buf = self.buf, []
        self.count += len(batch)
        if self.dry_run:
            return
        vectors = embed([d["content"] for _, d in batch])
        lines = []
        for (_id, doc), vec in zip(batch, vectors):
            doc = dict(doc, vector=vec)
            lines.append(json.dumps({"index": {"_index": INDEX, "_id": _id}}))
            lines.append(json.dumps(doc))
        body = ("\n".join(lines) + "\n").encode()
        res = es("/_bulk", data=body, timeout=300, content_type="application/x-ndjson")
        if res.get("errors"):
            for item in res.get("items", []):
                err = (item.get("index") or {}).get("error")
                if err:
                    self.failed += 1
                    if self.failed <= 5:
                        log(f"  bulk error: {err.get('type')}: {err.get('reason')}")


def index_files(sink):
    """Crawl the roots, index every readable file, and collect referenced URLs."""
    refs = {}
    seen = scanned = 0
    for root in ROOTS:
        if not os.path.isdir(root):
            log(f"skipping missing root {root}")
            continue
        skip = ignored_paths(root)
        log(f"crawling {root} ({len(skip)} gitignored paths excluded)")
        for path in walk(root):
            if path in skip:
                continue
            scanned += 1
            text = read_text(path)
            if text is None:
                continue
            seen += 1
            for _id, doc in file_docs(path, text):
                sink.add(_id, doc)
            for match in URL_RE.findall(text):
                url = normalize_url(match)
                if url:
                    refs.setdefault(url, set()).add(path)
            if seen % 250 == 0:
                log(f"  {seen} files, {sink.count} chunks")
    sink.flush()
    log(f"files: {seen} indexed of {scanned} scanned, {sink.count} chunks, "
        f"{len(refs)} unique URLs")
    return refs


def index_refs(sink, refs):
    """Fetch every collected URL in parallel and index the extracted text."""
    urls = sorted(refs)
    if not urls:
        return
    log(f"fetching {len(urls)} external references")
    ok = empty = bad = 0
    with concurrent.futures.ThreadPoolExecutor(FETCH_WORKERS) as pool:
        futures = {pool.submit(fetch_ref, u): u for u in urls}
        for done in concurrent.futures.as_completed(futures):
            url = futures[done]
            try:
                title, text = done.result()
            except Exception as exc:
                bad += 1
                log(f"  fetch failed {url}: {exc or type(exc).__name__}")
                continue
            if not text or not text.strip():
                empty += 1
                continue
            ok += 1
            host = (urllib.parse.urlsplit(url).hostname or "").lower()
            cited = sorted(refs[url])
            pieces = chunk(text)
            for i, body in enumerate(pieces):
                sink.add(doc_id("external", url, i), {
                    "kind": "external",
                    "content": body,
                    "url": url,
                    "host": host,
                    "title": title or url,
                    "referenced_by": cited,
                    "chunk": i,
                    "chunks": len(pieces),
                    "indexed_at": now(),
                })
    sink.flush()
    log(f"external refs: {ok} indexed, {empty} empty or skipped, {bad} failed")


# Open WebUI re-chunks and re-embeds whatever it is given, so the collection is scoped to
# things a person would actually ask about in a chat. Machine-generated JSON (attestations,
# scan output, inventories) is thousands of near-identical records: it belongs in the
# Elasticsearch index, where it is searchable, but would swamp a knowledge collection.
# Name the directories holding yours in CODE_INDEX_KNOWLEDGE_SKIP_DIRS.
KNOWLEDGE_EXTS = {
    ".md", ".txt", ".rego", ".tf", ".tfvars", ".hcl", ".sh", ".bash", ".zsh", ".ps1",
    ".yml", ".yaml", ".toml", ".ini", ".cfg", ".py", ".js", ".mjs", ".ts", ".html",
    ".css", ".scss", ".json", ".tsv", ".csv", ".example", ".sql", ".dockerfile",
}
KNOWLEDGE_SKIP_DIRS = env_set("CODE_INDEX_KNOWLEDGE_SKIP_DIRS", "")


def knowledge_worthy(rel, ext):
    if ext not in KNOWLEDGE_EXTS:
        return False
    if ext == ".json" and KNOWLEDGE_SKIP_DIRS.intersection(
            p.lower() for p in rel.split(os.sep)):
        return False
    return True


def flat_name(project, rel):
    """Flatten a repo-relative path into one filename that still shows its provenance.

    Open WebUI dedupes and cites by filename, so uploading three thousand files named
    README.md or record.json would collide and cite uselessly. Slashes are dropped because
    the filename lands in a storage path.
    """
    name = (project + os.sep + rel).replace(os.sep, "__")
    if len(name) > 180:
        digest = hashlib.sha1(name.encode()).hexdigest()[:8]
        name = name[:88] + "--" + digest + "--" + name[-80:]  # 88 + 12 + 80 == 180
    return name


def ow_api(path, payload=None, body=None, content_type=None, timeout=300):
    token = os.environ.get("OPEN_WEBUI_TOKEN")
    if not token:
        sys.exit("OPEN_WEBUI_TOKEN is not set (Settings -> Account -> API keys)")
    headers = {"Authorization": "Bearer " + token}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    elif body is not None:
        data = body
        headers["Content-Type"] = content_type
    req = urllib.request.Request(OPEN_WEBUI + path, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)


def ow_list(payload):
    """Unwrap a list endpoint. v0.11.3 paginates as {items, total}; older builds return a
    bare list, so both shapes are accepted."""
    return payload.get("items", []) if isinstance(payload, dict) else payload


def ow_multipart(filename, blob):
    boundary = "----code-index-%d" % os.getpid()
    head = (
        '--%s\r\nContent-Disposition: form-data; name="file"; filename="%s"\r\n'
        "Content-Type: text/plain\r\n\r\n" % (boundary, filename)
    )
    body = head.encode() + blob + ("\r\n--%s--\r\n" % boundary).encode()
    return body, "multipart/form-data; boundary=" + boundary


def collect_knowledge_files():
    """Return [(flat_name, abs_path)] for the documents worth putting in the collection."""
    out = []
    for root in ROOTS:
        if not os.path.isdir(root):
            continue
        project = os.path.basename(root)
        skip = ignored_paths(root)
        for path in walk(root):
            if path in skip:
                continue
            rel = os.path.relpath(path, root)
            ext = os.path.splitext(path)[1].lower()
            if not knowledge_worthy(rel, ext):
                continue
            if read_text(path) is None:
                continue
            out.append((flat_name(project, rel), path))
    return out


def wire_knowledge(name=KNOWLEDGE_NAME, dry=False):
    """Create or top up an Open WebUI knowledge collection from the same corpus."""
    files = collect_knowledge_files()
    log(f"{len(files)} documents eligible for knowledge collection {name!r}")
    if dry:
        for flat, _ in files[:10]:
            log(f"  would upload {flat}")
        log("  ...")
        return

    found = [k for k in ow_list(ow_api("/api/v1/knowledge/")) if k.get("name") == name]
    if found:
        collection = found[0]
        known = collection_names(collection["id"])
        log(f"collection exists with {len(known)} file(s) attached")
    else:
        # access_control must be sent explicitly. Omitting it yields a collection whose
        # write_access is false, and then batch/add returns 200 while silently attaching
        # nothing. null means private to the owner.
        collection = ow_api("/api/v1/knowledge/create", {
            "name": name,
            "description": "source trees indexed by code-index.py: "
                           + ", ".join(os.path.basename(r) for r in ROOTS),
            "access_control": None,
        })
        known = set()
        log(f"created collection {name!r}")

    pending = [(flat, path) for flat, path in files if flat not in known]
    log(f"{len(pending)} to upload ({len(files) - len(pending)} already present)")
    added = failed = 0
    batch = []
    for flat, path in pending:
        try:
            with open(path, "rb") as fh:
                blob = fh.read()
            body, ctype = ow_multipart(flat, blob)
            batch.append(ow_api("/api/v1/files/", body=body, content_type=ctype)["id"])
        except Exception as exc:
            failed += 1
            if failed <= 10:
                log(f"  upload failed {flat}: {exc}")
            continue
        if len(batch) >= OW_BATCH:
            added += attach_when_ready(collection["id"], batch)
            batch = []
            log(f"  attached {added}/{len(pending)}")
    if batch:
        added += attach_when_ready(collection["id"], batch)
    # batch/add returns 200 even when it quietly drops files, so trust the server's count
    # rather than the number we sent.
    final = collection_names(collection["id"])
    log(f"knowledge {name!r}: sent {added}, {failed} upload failures, "
        f"collection now holds {len(final)}")
    short = [flat for flat, _ in pending if flat not in final]
    if short:
        log(f"  {len(short)} sent but not attached, e.g. {short[:3]}")
    return collection["id"]


def wait_processed(file_ids, timeout=600):
    """Block until uploaded files finish embedding. Returns (completed, unfinished).

    Uploads are processed asynchronously (ENABLE_ASYNC_EMBEDDING), and batch/add silently
    drops any file that is still 'pending' while returning 200. Attaching straight after
    upload therefore loses whichever files had not caught up yet, which is nondeterministic
    and hits big files hardest.
    """
    done, pending = [], list(file_ids)
    deadline = time.time() + timeout
    while pending and time.time() < deadline:
        still = []
        for fid in pending:
            status = (ow_api("/api/v1/files/%s" % fid).get("data") or {}).get("status")
            if status == "completed":
                done.append(fid)
            elif status != "failed":
                still.append(fid)
        pending = still
        if pending:
            time.sleep(1)
    return done, pending


def attach(collection_id, file_ids):
    """Attach uploaded files to a collection, which is what triggers embedding.

    v0.11.3 wants a list of objects here: {"file_ids": [...]} 422s with "Input should be a
    valid list", and a bare list of id strings 422s with "Input should be a valid
    dictionary".
    """
    ow_api("/api/v1/knowledge/%s/files/batch/add" % collection_id,
           [{"file_id": fid} for fid in file_ids])
    return len(file_ids)


def attach_when_ready(collection_id, file_ids):
    ready, stuck = wait_processed(file_ids)
    if stuck:
        log(f"  {len(stuck)} file(s) never finished processing, not attached")
    return attach(collection_id, ready) if ready else 0


def collection_names(collection_id):
    """Filenames currently attached to a collection.

    GET /knowledge/{id} reports files as null in v0.11.3 regardless of membership, so
    reading it would make every re-run look empty and re-upload the whole corpus. The
    dedicated files endpoint is the only view that reports the truth, and unlike
    /api/v1/files/ (hard-capped at 50, silently ignoring limit) it returns all of them.
    """
    entries = ow_list(ow_api("/api/v1/knowledge/%s/files?limit=100000" % collection_id))
    names = set()
    for entry in entries:
        name = entry.get("filename") or (entry.get("meta") or {}).get("name")
        if name:
            names.add(os.path.basename(name))
    return names


def search(text, size=10):
    vec = embed([text], prefix=QUERY_PREFIX)[0]
    # knn and query scores add, which gives hybrid ranking without an RRF retriever
    # (that needs a paid license tier).
    body = {
        "size": size,
        "knn": {"field": "vector", "query_vector": vec, "k": size * 2,
                "num_candidates": 200},
        "query": {"match": {"content": {"query": text}}},
        "_source": ["kind", "title", "path", "url", "repo", "project", "chunk", "content"],
    }
    res = es(f"/{INDEX}/_search", data=body)
    for hit in res["hits"]["hits"]:
        src = hit["_source"]
        where = src.get("url") or f"{src.get('project')}/{src.get('path')}"
        snippet = " ".join(src["content"].split())[:220]
        print(f"\n[{hit['_score']:.3f}] {where}#{src.get('chunk')}\n  {snippet}")


# ---------------------------------------------------------------------------- checks


def self_check():
    body = "".join(f"line {i} " + "x" * 60 + "\n" for i in range(120))
    pieces = chunk(body)
    assert len(pieces) > 1, "long input must split"
    assert all(len(p) <= CHUNK_CHARS for p in pieces), "chunk exceeded budget"
    assert "line 0" in pieces[0] and "line 119" in pieces[-1], "lost content at the edges"
    joined = "".join(pieces)
    for i in range(120):
        assert f"line {i} " in joined, f"line {i} vanished"

    wide = chunk("z" * (CHUNK_CHARS * 3))
    assert all(len(p) <= CHUNK_CHARS for p in wide), "long line not hard-split"
    assert "".join(wide) == "z" * (CHUNK_CHARS * 3), "hard split lost bytes"
    assert chunk("   \n\n  \n") == [], "whitespace-only input must yield nothing"

    assert normalize_url("https://github.com/o/r.git/") == "https://github.com/o/r"
    assert normalize_url("https://slsa.dev/spec.").startswith("https://slsa.dev/spec")
    assert normalize_url("https://a.io/x#frag") == "https://a.io/x"
    for bad in ("https://github.com/${ORG}/r", "http://localhost:9200/x",
                "https://example.com/y", "https://ghes.example/z", "notaurl",
                "https://x-access-token:tok@ghes.example/a", "https://nodot/x",
                "https://api.example/v1", "https://github.example.com/o/r",
                "https://avatars.githubusercontent.com/u/1"):
        assert normalize_url(bad) is None, f"should reject {bad}"

    # github_api is host-agnostic: any host routed here gets the GHES /api/v3 prefix unless
    # it is github.com itself.
    route = github_api("https://ghe.internal/ORG/workflows/blob/main/a/b.md")
    assert route[0] == ("https://ghe.internal/api/v3/repos/ORG/workflows"
                        "/contents/a/b.md?ref=main"), route
    assert route[2] == "blob"
    assert github_api("https://github.com/o/r")[0].startswith("https://api.github.com/")
    assert github_api("https://github.com/o/r")[2] == "readme"
    assert github_api("https://github.com/o/r/issues/12")[0].endswith("/issues/12")
    assert github_api("https://github.com/o/r/pull/34")[2] == "issue"
    assert github_api("https://api.github.com") is None
    assert github_api("https://github.com/o/r/settings/actions") is None

    parser = TextExtractor()
    parser.feed("<html><title>T</title><body><nav>skipme</nav>"
                "<script>junk()</script><p>keep this</p></body></html>")
    out = parser.text()
    assert parser.title == "T" and "keep this" in out, out
    assert "skipme" not in out and "junk" not in out, out

    a, b = doc_id("file", "/p", 0), doc_id("file", "/p", 1)
    assert a != b and a == doc_id("file", "/p", 0), "ids must be stable and distinct"

    assert flat_name("proj", "org-policy/README.md") == "proj__org-policy__README.md"
    deep = flat_name("proj", "/".join(f"seg{i}" for i in range(40)) + "/record.json")
    assert len(deep) <= 180 and deep.endswith("record.json"), deep
    a = flat_name("proj", "a/" + "x" * 300 + "/f.md")
    b = flat_name("proj", "b/" + "x" * 300 + "/f.md")
    assert a != b, "truncated names must stay distinct"
    assert knowledge_worthy("docs/a.md", ".md")
    assert not knowledge_worthy("x/diagram.png", ".png")
    assert knowledge_worthy(os.path.join("org-policy", "orgs.json"), ".json")
    global KNOWLEDGE_SKIP_DIRS
    KNOWLEDGE_SKIP_DIRS = {"evidence"}
    assert not knowledge_worthy(os.path.join("evidence", "o", "record.json"), ".json")
    assert knowledge_worthy(os.path.join("evidence", "notes.md"), ".md"), "only JSON is cut"
    KNOWLEDGE_SKIP_DIRS = set()
    assert knowledge_worthy(os.path.join("evidence", "o", "record.json"), ".json")

    roots = resolve_roots([HERE, os.path.join(HERE, "no-such-dir")])
    assert roots == [HERE], roots
    assert resolve_roots([HERE, os.path.dirname(HERE)]) == [os.path.dirname(HERE)], \
        "a nested root must be dropped in favour of its parent"

    # An explicit GH_BIN wins outright; a bogus one yields None rather than silently
    # falling back to the PATH shim it was set to avoid.
    os.environ["GH_BIN"] = __file__
    assert gh_binary() == __file__
    os.environ["GH_BIN"] = os.path.join(HERE, "no-such-gh")
    assert gh_binary() is None, "a missing GH_BIN must not fall back to PATH"
    del os.environ["GH_BIN"]
    found = gh_binary()
    assert found is None or os.path.exists(found), found

    body, ctype = ow_multipart("a__b.md", b"hello")
    assert b'filename="a__b.md"' in body and b"hello" in body
    assert ctype.startswith("multipart/form-data; boundary=")
    assert ow_list({"items": [1, 2], "total": 2}) == [1, 2]
    assert ow_list([1, 2]) == [1, 2]
    assert ow_list({"total": 0}) == []
    print("self-check ok")


def main():
    ap = argparse.ArgumentParser(
        description=__doc__.splitlines()[0],
        epilog="Directories can also come from $CODE_INDEX_ROOTS. With neither, you are "
               "prompted for them. See the module docstring for every setting.")
    ap.add_argument("roots", nargs="*", metavar="DIR",
                    help="directories to index (globs and ~ are expanded)")
    ap.add_argument("--dry-run", action="store_true", help="crawl and count, no writes")
    ap.add_argument("--no-refs", action="store_true", help="skip external references")
    ap.add_argument("--refs-only", action="store_true", help="only external references")
    ap.add_argument("--query", help="search the existing index")
    ap.add_argument("--self-check", action="store_true", help="run offline assertions")
    ap.add_argument("--knowledge", action="store_true",
                    help="upload the corpus to an Open WebUI knowledge collection")
    ap.add_argument("--knowledge-name", default=KNOWLEDGE_NAME,
                    help="collection name (default: %(default)s)")
    args = ap.parse_args()

    if args.self_check:
        self_check()
        return
    if args.query:
        search(args.query)
        return

    global ROOTS
    ROOTS = resolve_roots(args.roots)
    log("indexing: " + ", ".join(ROOTS))

    if args.knowledge:
        wire_knowledge(args.knowledge_name, dry=args.dry_run)
        return
    if not args.dry_run:
        ensure_index()

    started = time.time()
    sink = Sink(dry_run=args.dry_run)
    if args.refs_only:
        refs = {}
        for root in ROOTS:
            skip = ignored_paths(root)
            for path in walk(root):
                if path in skip:
                    continue
                text = read_text(path)
                if text is None:
                    continue
                for match in URL_RE.findall(text):
                    url = normalize_url(match)
                    if url:
                        refs.setdefault(url, set()).add(path)
        log(f"collected {len(refs)} unique URLs")
    else:
        refs = index_files(sink)
    if not args.no_refs:
        index_refs(sink, refs)
    if not args.dry_run:
        es(f"/{INDEX}/_refresh", method="POST")
        total = es(f"/{INDEX}/_count")["count"]
        log(f"index {INDEX} now holds {total} chunks")
    log(f"done in {time.time() - started:.0f}s ({sink.count} chunks, {sink.failed} failed)")


if __name__ == "__main__":
    main()
