#!/bin/bash
# Generate disconnected setup script for ollama model

cat << 'SCRIPT'
#!/bin/bash
# =============================================================================
# Load Ollama Model on Disconnected System
# =============================================================================
set -euo pipefail

# Configuration (set via environment variables)
MODEL_ARTIFACT_DIR="${MODEL_ARTIFACT_DIR:-.}"
OLLAMA_MODEL_NAME="${OLLAMA_MODEL_NAME:-my-model}"
OLLAMA_MODELS="${OLLAMA_MODELS:-${HOME}/.ollama/models}"

echo "=========================================="
echo "Loading Ollama Model"
echo "=========================================="
echo ""
echo "Artifact directory: ${MODEL_ARTIFACT_DIR}"
echo "Model name: ${OLLAMA_MODEL_NAME}"
echo ""

# Step 1: Verify artifact exists
if [ ! -d "${MODEL_ARTIFACT_DIR}" ]; then
  echo "ERROR: Artifact directory not found"
  echo "Please download the artifact first"
  exit 1
fi

# Step 2: Setup Ollama directories
echo "=== Setup ==="
mkdir -p "${OLLAMA_MODELS}/blobs"
mkdir -p "${OLLAMA_MODELS}/manifests"
echo "Ollama models: ${OLLAMA_MODELS}"
echo ""

# Step 3: Copy blobs
echo "=== Copying Model Data ==="
if [ -d "${MODEL_ARTIFACT_DIR}/blobs" ]; then
  echo "Copying blobs..."
  find "${MODEL_ARTIFACT_DIR}/blobs" -type f -exec cp {} "${OLLAMA_MODELS}/blobs/" \;
  BLOB_COUNT=$(find "${OLLAMA_MODELS}/blobs" -type f | wc -l)
  echo "Total blobs: ${BLOB_COUNT}"
else
  echo "Warning: No blobs directory found"
fi

# Step 4: Copy manifests
if [ -d "${MODEL_ARTIFACT_DIR}/manifests" ]; then
  echo "Copying manifests..."
  cp -r "${MODEL_ARTIFACT_DIR}/manifests"/* "${OLLAMA_MODELS}/manifests/" 2>/dev/null || true
  echo "Done"
fi

# Step 5: Start Ollama if needed
echo ""
echo "=== Starting Ollama ==="
if pgrep -x ollama > /dev/null 2>&1; then
  echo "Ollama is already running"
else
  echo "Starting Ollama..."
  ollama serve &
  sleep 5
  
  # Wait for ollama to be ready
  for i in {1..30}; do
    if curl -sf http://localhost:11434/api/version > /dev/null 2>&1; then
      echo "Ollama is ready"
      break
    fi
    sleep 1
  done
fi

# Step 6: Verify
echo ""
echo "=== Installed Models ==="
ollama list

echo ""
echo "=========================================="
echo "Done! Use with: ollama run ${OLLAMA_MODEL_NAME}"
echo "=========================================="
SCRIPT

chmod +x