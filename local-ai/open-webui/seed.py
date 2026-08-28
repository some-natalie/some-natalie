#!/usr/bin/python3
"""Seed Open WebUI workspaces from the workspaces/ directory.

Layout, all optional except skills/:

  workspaces/<name>/skills/*.md        frontmatter keys: id, name, description, tags
  workspaces/<name>/knowledge/*        uploaded into a knowledge collection named <name>
  workspaces/<name>/model.json         custom model payload, see workspaces/model.json.example
  workspaces/<name>/tool-servers.json  posted verbatim to /api/v1/configs/tool_servers

model.json and tool-servers.json are captured from an instance you configured by hand, so
their shape always matches your Open WebUI version:

  GET /api/v1/models/export
  GET /api/v1/configs/tool_servers

Replace the generated ids in that JSON with ${knowledge:<collection>} and ${skill:<skill id>}
placeholders. They are substituted with real ids at seed time, wherever they appear, so this
script does not need to know which field holds them.

Usage:
  ./seed.py --dry-run                        parse and validate everything, no network
  OPEN_WEBUI_TOKEN=<api key> ./seed.py [base-url]
"""

import json
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "workspaces")
BASE = "http://localhost:3080"
TOKEN = ""


def api(path, payload=None, body=None, content_type=None):
    headers = {"Authorization": "Bearer " + TOKEN}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    elif body is not None:
        data = body
        headers["Content-Type"] = content_type
    req = urllib.request.Request(BASE.rstrip("/") + path, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def parse_skill(path):
    text = open(path).read()
    if not text.startswith("---\n"):
        raise SystemExit("%s: missing frontmatter" % path)
    front, body = text[4:].split("\n---\n", 1)
    meta = {}
    for line in front.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip()
    missing = {"id", "name", "description"} - set(meta)
    if missing:
        raise SystemExit("%s: frontmatter missing %s" % (path, ", ".join(sorted(missing))))
    tags = [t.strip() for t in meta.get("tags", "").strip("[]").split(",") if t.strip()]
    return {
        "id": meta["id"],
        "name": meta["name"],
        "description": meta["description"],
        "content": body.strip() + "\n",
        "meta": {"tags": tags},
        "is_active": True,
    }


def resolve(obj, refs):
    if isinstance(obj, str):
        for placeholder, value in refs.items():
            obj = obj.replace(placeholder, value)
        return obj
    if isinstance(obj, list):
        return [resolve(v, refs) for v in obj]
    if isinstance(obj, dict):
        return {k: resolve(v, refs) for k, v in obj.items()}
    return obj


def multipart(path):
    boundary = "----seed-%d" % os.getpid()
    head = (
        '--%s\r\nContent-Disposition: form-data; name="file"; filename="%s"\r\n'
        "Content-Type: application/octet-stream\r\n\r\n" % (boundary, os.path.basename(path))
    )
    with open(path, "rb") as fh:
        body = head.encode() + fh.read() + ("\r\n--%s--\r\n" % boundary).encode()
    return body, "multipart/form-data; boundary=" + boundary


def existing_filenames(collection):
    names = set()
    for entry in collection.get("files") or []:
        name = entry.get("filename") or (entry.get("meta") or {}).get("name")
        if name:
            names.add(os.path.basename(name))
    return names


def seed_knowledge(name, paths, dry):
    if dry:
        print("  knowledge %r: %d file(s) %s" % (name, len(paths), [os.path.basename(p) for p in paths]))
        return "dry-run-knowledge-id"
    found = [k for k in api("/api/v1/knowledge/") if k.get("name") == name]
    if found:
        collection = api("/api/v1/knowledge/%s" % found[0]["id"])
        known = existing_filenames(collection)
        print("  knowledge %r exists (%d file(s) already attached)" % (name, len(known)))
    else:
        collection = api("/api/v1/knowledge/create", {"name": name, "description": "Seeded from %s" % name})
        known = set()
        print("  knowledge %r created" % name)

    new = [p for p in paths if os.path.basename(p) not in known]
    file_ids = []
    for path in new:
        body, content_type = multipart(path)
        file_ids.append(api("/api/v1/files/", body=body, content_type=content_type)["id"])
        print("    uploaded %s" % os.path.basename(path))
    if file_ids:
        api("/api/v1/knowledge/%s/files/batch/add" % collection["id"], {"file_ids": file_ids})
    return collection["id"]


def seed_skill(skill, dry):
    if dry:
        print("  skill %s (%d chars, tags=%s)" % (skill["id"], len(skill["content"]), skill["meta"]["tags"]))
        return skill["id"]
    try:
        api("/api/v1/skills/create", skill)
        print("  skill %s created" % skill["id"])
    except urllib.error.HTTPError as err:
        if err.code != 400:
            raise
        api("/api/v1/skills/id/%s/update" % skill["id"], skill)
        print("  skill %s updated" % skill["id"])
    return skill["id"]


def seed_model(path, refs, dry):
    payload = resolve(json.load(open(path)), refs)
    for field in ("user_id", "created_at", "updated_at"):
        payload.pop(field, None)
    leftover = [s for s in json.dumps(payload).split('"') if "${" in s]
    if leftover:
        raise SystemExit("%s: unresolved placeholder(s): %s" % (path, ", ".join(sorted(set(leftover)))))
    if dry:
        print("  model %s ready (%d top-level keys)" % (payload.get("id"), len(payload)))
        return
    try:
        api("/api/v1/models/create", payload)
        print("  model %s created" % payload["id"])
    except urllib.error.HTTPError as err:
        if err.code != 400:
            raise
        # ponytail: no update path. /models/model/update and /models/import have unverified
        # semantics on this version, so re-seeding an existing model is a manual delete.
        print("  model %s exists, skipped (delete it in the UI to re-seed)" % payload["id"])


def seed(name, dry):
    ws = os.path.join(ROOT, name)
    print("%s:" % name)
    refs = {}

    knowledge_dir = os.path.join(ws, "knowledge")
    if os.path.isdir(knowledge_dir):
        paths = [os.path.join(knowledge_dir, f) for f in sorted(os.listdir(knowledge_dir)) if not f.startswith(".")]
        if paths:
            refs["${knowledge:%s}" % name] = seed_knowledge(name, paths, dry)

    skills_dir = os.path.join(ws, "skills")
    for filename in sorted(os.listdir(skills_dir)) if os.path.isdir(skills_dir) else []:
        if filename.endswith(".md"):
            skill = parse_skill(os.path.join(skills_dir, filename))
            refs["${skill:%s}" % skill["id"]] = seed_skill(skill, dry)

    servers = os.path.join(ws, "tool-servers.json")
    if os.path.isfile(servers):
        payload = json.load(open(servers))
        if dry:
            print("  tool servers: %d configured" % len(payload.get("TOOL_SERVER_CONNECTIONS", payload)))
        else:
            api("/api/v1/configs/tool_servers", payload)
            print("  tool servers posted")

    model = os.path.join(ws, "model.json")
    if os.path.isfile(model):
        seed_model(model, refs, dry)
    else:
        print("  no model.json, skipped (see %s)" % os.path.join("workspaces", "model.json.example"))


def main():
    global BASE, TOKEN
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry = "--dry-run" in sys.argv[1:]
    if args:
        BASE = args[0]
    if not dry:
        TOKEN = os.environ.get("OPEN_WEBUI_TOKEN", "")
        if not TOKEN:
            raise SystemExit("set OPEN_WEBUI_TOKEN (Open WebUI: Settings -> Account -> API keys) or pass --dry-run")

    names = sorted(n for n in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, n)))
    if not names:
        raise SystemExit("no workspaces found in %s" % ROOT)
    for name in names:
        seed(name, dry)
    print("\n%s %d workspace(s)" % ("validated" if dry else "seeded", len(names)))


if __name__ == "__main__":
    main()
