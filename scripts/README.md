# Ollama Model Publishing Scripts

This directory contains scripts for publishing Ollama models to GitHub Packages and using them on disconnected systems.

## Scripts

### `disconnected-setup.sh`

A script to load a published model on a disconnected system.

**Environment Variables:**
- `MODEL_ARTIFACT_DIR` - Path to the extracted artifact (default: current directory)
- `OLLAMA_MODEL_NAME` - Name to give the model in ollama (default: my-model)
- `OLLAMA_MODELS` - Path to ollama models directory (default: ~/.ollama/models)

**Example:**
```bash
# On a connected system
oras pull ghcr.io/owner/repo/model:latest -o ./model-artifact

# Transfer to disconnected system
# ...

# On the disconnected system
cd model-artifact
MODEL_ARTIFACT_NAME=my-model ./disconnected-setup.sh
```

## GitHub Actions Workflow

The main workflow is in `.github/workflows/ollama-model-publish.yaml`.

### Publishing a Model

1. Go to Actions → "Publish Ollama Model to GHCR" → Run Workflow
2. Provide `model_name` (e.g., `llama3.2:latest`) and `artifact_name` (e.g., `my-llama-model`)

The workflow will:
- Install Ollama using `curl -fsSL https://ollama.com/install.sh | sudo bash`
- Start Ollama and wait for it to be ready
- Pull the model from Ollama's registry
- Export the model files (blobs and manifests)
- Push to GHCR as an OCI artifact
- Upload the artifact for download

### Using on a Disconnected System

1. Download the artifact:
   ```bash
   oras pull ghcr.io/owner/repo/my-llama-model:latest -o ./model-artifact
   ```

2. Transfer to the disconnected system

3. Run the setup script:
   ```bash
   MODEL_ARTIFACT_DIR=./model-artifact MODEL_ARTIFACT_NAME=my-llama-model ./disconnected-setup.sh
   ```

4. Use the model:
   ```bash
   ollama run my-llama-model
   ```

## Requirements

- Ollama installed on target system
- `oras` for OCI operations
- GitHub token with `packages: write` permission (in the workflow)