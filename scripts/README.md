# Ollama Model Publishing Scripts

This directory contains scripts for publishing Ollama models to GitHub Packages and using them on disconnected systems.

## Scripts

### `ollama-model-publish.sh`

A standalone script to publish Ollama models to GHCR.

**Usage:**
```bash
./ollama-model-publish.sh <model-name> <artifact-name>
```

**Environment Variables:**
- `GITHUB_TOKEN` or `GHCR_TOKEN` - Authentication token for GHCR
- `GITHUB_REPOSITORY` - Repository name (owner/repo format)
- `GITHUB_ACTOR` - GitHub username (defaults to $USER)
- `OLLAMA_MODELS` - Path to ollama models directory

**Example:**
```bash
export GITHUB_TOKEN=ghp_...
export GITHUB_REPOSITORY=myorg/myrepo
./ollama-model-publish.sh llama3.2:latest my-llama-model
```

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

## Complete Workflow

### Publishing a Model

1. Run the publish script with the required environment variables:
   ```bash
   ./ollama-model-publish.sh llama3.2:latest my-llama-model
   ```

2. The script will:
   - Start Ollama if needed
   - Pull the model
   - Export the model files
   - Push to GHCR

### Using on a Disconnected System

1. Download the artifact (requires network access):
   ```bash
   oras pull ghcr.io/owner/repo/my-llama-model:latest -o ./model-artifact
   ```

2. Transfer to the disconnected system (USB, SCP, etc.)

3. Run the setup script:
   ```bash
   cd model-artifact
   MODEL_ARTIFACT_NAME=my-llama-model ./disconnected-setup.sh
   ```

4. Use the model:
   ```bash
   ollama run my-llama-model
   ```

## Requirements

- Ollama installed on both source and target systems
- `oras` installed for OCI operations (or Docker)
- GitHub token with `write:packages` permission