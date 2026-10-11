# Ollama Model Publishing Scripts

This directory contains scripts for publishing Ollama models to GitHub Packages and using them on disconnected systems.

## Scripts

### `disconnected-setup.sh`

A script to restore a published model without contacting Ollama's registry.
It copies the complete native Ollama store, verifies the model locally, and
optionally creates a local alias.

**Environment Variables:**
- `MODEL_ARTIFACT_DIR` - Path to the extracted artifact (default: current directory)
- `OLLAMA_MODEL_NAME` - Optional local alias (default: the model name in `info.txt`)
- `OLLAMA_MODELS` - Store used by the target Ollama server (default: `~/.ollama/models`)
- `OLLAMA_HOST` - Target Ollama server (default: `127.0.0.1:11434`)

`OLLAMA_MODELS` must match the store used by an already-running server. Setting
it for this script does not reconfigure that server. The standard Linux installer
uses `/usr/share/ollama/.ollama/models`; supply that path and sufficient write
permissions when restoring into its system service. The script starts a server
with the configured store if the API is not already available.

**Example:**
```bash
# On the target, if it can reach GHCR; otherwise use a connected transfer system
oras pull ghcr.io/owner/repo/model:latest -o ./model-artifact

# Transfer the entire model-artifact directory if necessary.

# On the target, using a user-owned Ollama store
MODEL_ARTIFACT_DIR=./model-artifact bash ./model-artifact/disconnected-setup.sh
```

## GitHub Actions Workflow

The main workflow is in `.github/workflows/ollama-model-publish.yaml`.

### Publishing a Model

1. Go to Actions → "Publish Ollama Model to GHCR" → Run Workflow
2. Provide a downloadable local `model_name` (e.g., `llama3.2:latest`) and
   `artifact_name` (e.g., `my-llama-model`). Cloud-only models cannot run offline.
   The artifact name must be a single repository component, not a path or tag;
   the workflow normalizes it to lowercase.

The workflow will:
- Install Ollama using `curl -fsSL https://ollama.com/install.sh | sudo bash`
- Start an isolated Ollama server with a runner-owned store
- Pull and verify the model using native `ollama pull` and `ollama show`
- Export all blobs and manifests, preserving their native directory structure
- Push every file together as one OCI artifact at `ghcr.io/owner/repo/artifact:latest`
- Upload the artifact for download

The bundle contains `blobs/`, `manifests/`, `info.txt`, and
`disconnected-setup.sh`. The blobs include weights, configuration, templates,
licenses, and any other layers downloaded for the requested model tag.
Required download, export, and publishing failures fail the workflow.
Models download directly into the bundle to avoid a second copy of large
weight files on the GitHub-hosted runner. Available runner disk space still
limits which model tags can be published.

### Architecture portability

Ollama's model files are not CPU-specific container images. One complete pull
of a model tag provides the same model data for ARM64 and x86-64 targets; there
is no separate CPU-platform variant to download. This does not download every
model size, quantization, or tag. Publish those separately if needed.

The bundle does **not** include Ollama executables or GPU libraries. Install
an Ollama runtime compatible with each target's OS, CPU, hardware, and model
before restoring the bundle. Use the same Ollama release as the publisher,
or a newer compatible release.

### Using on a Disconnected System

1. Download the artifact:
   ```bash
   oras pull ghcr.io/owner/repo/my-llama-model:latest -o ./model-artifact
   ```

2. Transfer to the disconnected system

3. Run the setup script:
   ```bash
   MODEL_ARTIFACT_DIR=./model-artifact bash ./model-artifact/disconnected-setup.sh
   ```

   To restore into the standard Linux system service's store:
   ```bash
   sudo env MODEL_ARTIFACT_DIR="$PWD/model-artifact" \
     OLLAMA_MODELS=/usr/share/ollama/.ollama/models \
     bash ./model-artifact/disconnected-setup.sh
   ```

   For an optional local alias, add `OLLAMA_MODEL_NAME=my-llama-model` to the
   setup command. The GHCR artifact name does not rename the Ollama model.

4. Use the original model name, or the alias you explicitly created:
   ```bash
   ollama run llama3.2:latest
   ```

No `ollama pull` is needed on the target.

## Requirements

- A compatible Ollama runtime installed on the target system
- `curl` and Bash on the target for the setup script
- `oras` on whichever system downloads the OCI artifact
- GHCR read access for private packages (`oras login ghcr.io`)
- GitHub token with `packages: write` permission (in the workflow)

## Local validation

```bash
actionlint .github/workflows/ollama-model-publish.yaml
shellcheck scripts/disconnected-setup.sh
python3 -m unittest discover -s scripts/tests -v
```

The tests use temporary stores and mocked Ollama, ORAS, and HTTP commands.
They do not download model weights, access a real registry, or modify an
existing Ollama installation.
