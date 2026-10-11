"""Exercise publisher shell steps and offline restore without network access."""

import json
import os
from pathlib import Path
import re
import signal
import subprocess
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/ollama-model-publish.yaml"
SETUP = ROOT / "scripts/disconnected-setup.sh"
MODEL = "test-owner/tiny:latest"
MANIFEST = Path("manifests/registry.ollama.ai/test-owner/tiny/latest")

MOCK_COMMAND = """#!/usr/bin/env python3
import json
import os
from pathlib import Path
import shutil
import signal
import sys

command = Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ["TEST_CALLS"], "a") as log:
    log.write(json.dumps([command, *args]) + "\\n")

if command == "curl":
    ready_file = os.environ.get("TEST_READY_FILE")
    sys.exit(1 if os.environ.get("TEST_CURL_FAIL") or
             (ready_file and not Path(ready_file).exists()) else 0)
if command == "sleep":
    sys.exit(0)
if command == "ollama":
    if args[0] == os.environ.get("TEST_OLLAMA_FAIL"):
        sys.exit(1)
    store = Path(os.environ["OLLAMA_MODELS"])
    def manifest(name):
        path, separator, tag = name.partition(":")
        if "/" not in path:
            path = "library/" + path
        return store / "manifests/registry.ollama.ai" / path / (tag or "latest")
    if args[0] == "pull":
        source = Path(os.environ["TEST_PULL_SOURCE"])
        for directory in ("blobs", "manifests"):
            shutil.copytree(source / directory, store / directory,
                            dirs_exist_ok=True)
    elif args[0] == "show":
        sys.exit(0 if manifest(args[1]).is_file() else 1)
    elif args[0] == "cp":
        destination = manifest(args[2])
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(manifest(args[1]), destination)
    elif args[0] == "serve":
        Path(os.environ["TEST_SERVER_PID"]).write_text(str(os.getpid()))
        Path(os.environ["TEST_READY_FILE"]).touch()
        signal.pause()
elif command == "oras":
    if args[0] == os.environ.get("TEST_ORAS_FAIL"):
        sys.exit(1)
    if args[0] == "login":
        sys.stdin.read()
    elif args[0] == "push":
        index = 2
        while index < len(args):
            if args[index] in ("--artifact-type", "--annotation"):
                index += 2
                continue
            path, separator, media_type = args[index].rpartition(":")
            if not separator or media_type != "application/octet-stream":
                sys.exit("Incorrect file syntax")
            if not Path(path).is_file():
                sys.exit("Missing file: " + path)
            index += 1
"""


def workflow_script(name):
    """Extract a named literal run block; actionlint validates the YAML itself."""
    workflow = WORKFLOW.read_text()
    start = re.search(r"^      - name: " + re.escape(name) + r"$",
                      workflow, re.MULTILINE)
    if start is None:
        raise AssertionError("Missing workflow step: " + name)
    step = workflow[start.end():].split("\n      - name:", 1)[0]
    return textwrap.dedent(step.split("        run: |\n", 1)[1])


class OllamaPublishTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="ollama test ")
        self.directory = Path(self.temporary.name)
        self.bin = self.directory / "bin"
        self.bin.mkdir()
        for command in ("ollama", "oras", "curl", "sleep"):
            executable = self.bin / command
            executable.write_text(MOCK_COMMAND)
            executable.chmod(0o755)
        self.bundle = self.directory / "source bundle"
        (self.bundle / "blobs").mkdir(parents=True)
        (self.bundle / "blobs/sha256-weights").write_bytes(b"portable weights")
        (self.bundle / "blobs/sha256-config").write_bytes(b"configuration")
        (self.bundle / MANIFEST).parent.mkdir(parents=True)
        (self.bundle / MANIFEST).write_text('{"schemaVersion": 2}\n')
        (self.bundle / "info.txt").write_text("model=" + MODEL + "\n")
        self.calls_file = self.directory / "calls.jsonl"
        self.runner = self.directory / "runner temp"
        self.runner.mkdir()
        self.environment = dict(
            os.environ,
            PATH=str(self.bin) + os.pathsep + os.environ["PATH"],
            TEST_CALLS=str(self.calls_file),
            TEST_PULL_SOURCE=str(self.bundle),
            TEST_SERVER_PID=str(self.directory / "server.pid"),
            MODEL_ARTIFACT_DIR=str(self.bundle),
            MODEL_NAME=MODEL,
            ARTIFACT_NAME="Tiny-Model",
            REGISTRY="ghcr.io",
            GITHUB_REPOSITORY="Some-Owner/Some-Repo",
            GITHUB_ACTOR="test-actor",
            GHCR_TOKEN="test-token",
            GITHUB_WORKSPACE=str(ROOT),
            GITHUB_ENV=str(self.directory / "github.env"),
            GITHUB_STEP_SUMMARY=str(self.directory / "summary.md"),
            RUNNER_TEMP=str(self.runner),
            OLLAMA_MODELS=str(self.directory / "target store"),
            OLLAMA_HOST="127.0.0.1:11435",
        )
        self.environment.pop("OLLAMA_MODEL_NAME", None)

    def tearDown(self):
        pid_file = self.directory / "server.pid"
        if pid_file.exists():
            try:
                os.kill(int(pid_file.read_text()), signal.SIGTERM)
            except ProcessLookupError:
                pass
        self.temporary.cleanup()

    def run_shell(self, script):
        # Files let an intentionally backgrounded server outlive the setup shell.
        with tempfile.TemporaryFile(mode="w+") as stdout, \
                tempfile.TemporaryFile(mode="w+") as stderr:
            result = subprocess.run(
                ["bash", "-e", "-o", "pipefail", "-c", script],
                cwd=ROOT, env=self.environment, stdout=stdout, stderr=stderr,
                timeout=15,
            )
            stdout.seek(0)
            stderr.seek(0)
            return subprocess.CompletedProcess(
                result.args, result.returncode, stdout.read(), stderr.read(),
            )

    def step(self, name):
        return self.run_shell(workflow_script(name))

    def restore(self):
        return self.run_shell('bash "$GITHUB_WORKSPACE/scripts/disconnected-setup.sh"')

    def calls(self):
        if not self.calls_file.exists():
            return []
        return [json.loads(line) for line in self.calls_file.read_text().splitlines()]

    def prepare(self):
        result = self.step("Prepare artifact")
        self.assertEqual(result.returncode, 0, result.stderr)
        for line in Path(self.environment["GITHUB_ENV"]).read_text().splitlines():
            key, value = line.split("=", 1)
            self.environment[key] = value

    def test_native_publish_uses_one_complete_artifact(self):
        self.prepare()
        self.assertEqual(self.environment["OLLAMA_MODELS"],
                         self.environment["ARTIFACT"])
        for name in ("Pull and verify model", "Export model files",
                     "Add disconnected script", "Push to GHCR", "Summary"):
            result = self.step(name)
            self.assertEqual(result.returncode, 0, name + ": " + result.stderr)
        self.assertEqual(self.environment["OCI_REF"],
                         "ghcr.io/some-owner/some-repo/tiny-model:latest")
        artifact = Path(self.environment["ARTIFACT"])
        for path in ("blobs/sha256-weights", "blobs/sha256-config", MANIFEST,
                     "info.txt"):
            self.assertEqual((artifact / path).read_bytes(),
                             (self.bundle / path).read_bytes())
        calls = self.calls()
        self.assertIn(["ollama", "pull", MODEL], calls)
        pushes = [call for call in calls if call[:2] == ["oras", "push"]]
        self.assertEqual(len(pushes), 1)
        pushed_files = {Path(arg.rsplit(":", 1)[0]) for arg in pushes[0]
                        if arg.endswith(":application/octet-stream")}
        self.assertEqual(pushed_files,
                         {path.relative_to(artifact) for path in artifact.rglob("*")
                          if path.is_file()})
        summary = Path(self.environment["GITHUB_STEP_SUMMARY"]).read_text()
        self.assertIn(self.environment["OCI_REF"], summary)

    def test_dispatch_inputs_are_validated_without_shell_evaluation(self):
        sentinel = self.directory / "injected"
        self.environment["MODEL_NAME"] = 'tiny"; touch "' + str(sentinel) + '"; #'
        self.assertNotEqual(self.step("Prepare artifact").returncode, 0)
        self.assertFalse(sentinel.exists())
        self.environment["MODEL_NAME"] = MODEL
        self.environment["ARTIFACT_NAME"] = "not/a/component"
        self.assertNotEqual(self.step("Prepare artifact").returncode, 0)

    def test_native_pull_failure_is_fatal(self):
        self.prepare()
        self.environment["TEST_OLLAMA_FAIL"] = "pull"
        self.assertNotEqual(self.step("Pull and verify model").returncode, 0)
        self.assertNotIn(["ollama", "show", MODEL], self.calls())

    def test_export_requires_model_data(self):
        self.prepare()
        self.assertNotEqual(self.step("Export model files").returncode, 0)

    def test_registry_push_failure_is_fatal(self):
        self.prepare()
        self.environment["TEST_ORAS_FAIL"] = "push"
        result = self.step("Push to GHCR")
        self.assertNotEqual(result.returncode, 0)

    def test_registry_login_failure_prevents_push(self):
        self.prepare()
        self.environment["TEST_ORAS_FAIL"] = "login"
        self.assertNotEqual(self.step("Push to GHCR").returncode, 0)
        self.assertFalse(any(call[:2] == ["oras", "push"] for call in self.calls()))

    def test_restore_preserves_model_and_never_pulls(self):
        result = self.restore()
        self.assertEqual(result.returncode, 0, result.stderr)
        store = Path(self.environment["OLLAMA_MODELS"])
        self.assertEqual((store / MANIFEST).read_bytes(),
                         (self.bundle / MANIFEST).read_bytes())
        self.assertEqual((store / "blobs/sha256-weights").read_bytes(),
                         b"portable weights")
        self.assertIn(["ollama", "show", MODEL], self.calls())
        self.assertFalse(any(call[:2] in (["ollama", "pull"], ["ollama", "serve"])
                             for call in self.calls()))

    def test_restore_creates_alias_locally(self):
        self.environment["OLLAMA_MODEL_NAME"] = "offline-tiny:latest"
        result = self.restore()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(["ollama", "cp", MODEL, "offline-tiny:latest"], self.calls())
        self.assertIn(["ollama", "show", "offline-tiny:latest"], self.calls())

    def test_restore_rejects_missing_data_and_metadata(self):
        for path in ("blobs", "manifests", "info.txt"):
            with self.subTest(path=path):
                original = self.bundle / path
                hidden = self.bundle / (path + ".hidden")
                original.rename(hidden)
                try:
                    self.assertNotEqual(self.restore().returncode, 0)
                finally:
                    hidden.rename(original)
        self.assertFalse(Path(self.environment["OLLAMA_MODELS"]).exists())

    def test_restore_fails_if_model_is_not_visible(self):
        self.environment["TEST_OLLAMA_FAIL"] = "show"
        result = self.restore()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("server must use", result.stderr)

    def test_restore_starts_server_with_configured_store(self):
        self.environment["TEST_READY_FILE"] = str(self.directory / "ready")
        result = self.restore()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(["ollama", "serve"], self.calls())
        self.assertIn(["ollama", "show", MODEL], self.calls())

    def test_restore_fails_if_server_cannot_start(self):
        self.environment["TEST_CURL_FAIL"] = "1"
        self.environment["TEST_OLLAMA_FAIL"] = "serve"
        result = self.restore()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("failed to become ready", result.stderr)

    def test_publisher_fails_if_server_cannot_start(self):
        self.prepare()
        self.environment["TEST_CURL_FAIL"] = "1"
        self.environment["TEST_OLLAMA_FAIL"] = "serve"
        result = self.step("Start Ollama")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("failed to become ready", result.stderr)


if __name__ == "__main__":
    unittest.main()

