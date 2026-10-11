#!/bin/bash
# =============================================================================
# Load Ollama Model on Disconnected System
# =============================================================================
# Usage: ./disconnected-setup.sh
# Environment Variables:
#   MODEL_ARTIFACT_DIR - Path to the artifact directory (default: current dir)
#   OLLAMA_MODEL_NAME  - Name to give the model in ollama (default: my-model)
# =============================================================================
set -euo pipefail

MODEL_ARTIFACT_DIR="${MODEL_ARTIFACT_DIR:-.}"
OLLAMA_MODEL_NAME="${OLLAMA_MODEL_NAME:-my-model}"
OLLAMA_MODELS="${OLLAMA_MODELS:-${HOME}/.ollama/models}"

echo "=========================================="
echo "Loading Ollama Model"
echo "=========================================="
echo ""
echo "Artifact directory: ${MODEL_ARTIFACT_DIR}"
echo "Model name: ${OLLAMA_MODEL_NAME}"
echo "Ollama store: ${OLLAMA_MODELS}"
echo ""

# Step 1: Verify artifact exists
if [ ! -d "${MODEL_ARTIFACT_DIR}" ]; then
  echo "ERROR: Artifact directory not found: ${MODEL_ARTIFACT_DIR}"
  echo "Please download the artifact first using:"
  echo "  oras pull <oci-ref> -o ./model-artifact"
  exit 1
fi

# Step 2: Setup Ollama directories
echo "=== Step 1: Setting up Ollama directories ==="
mkdir -p "${OLLAMA_MODELS}/blobs"
mkdir -p "${OLLAMA_MODELS}/manifests"
echo "Ollama models: ${OLLAMA_MODELS}"
echo ""

# Step 3: Copy blobs
echo "=== Step 2: Copying model data ==="
if [ -d "${MODEL_ARTIFACT_DIR}/ollama-blobs" ]; then
  echo "Copying blobs..."
  find "${MODEL_ARTIFACT_DIR}/ollama-blobs" -type f -exec cp {} "${OLLAMA_MODELS}/blobs/" \;
  BLOB_COUNT=$(find "${OLLAMA_MODELS}/blobs" -type f | wc -l)
  echo "Total blobs: ${BLOB_COUNT}"
else
  echo "Warning: No ollama-blobs directory found"
fi

# Step 4: Copy manifests
if [ -d "${MODEL_ARTIFACT_DIR}/ollama-manifests" ]; then
  echo "Copying manifests..."
  cp -r "${MODEL_ARTIFACT_DIR}/ollama-manifests"/* "${OLLAMA_MODELS}/manifests/" 2>/dev/null || true
  echo "Done"
fi

# Step 5: Start Ollama if needed
echo ""
echo "=== Step 3: Starting Ollama ==="
if pgrep -x ollama > /dev/null 2>&1; then
  echo "Ollama is already running"
else
  echo "Starting ollama..."
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
echo "=== Step 4: Verifying model ==="
ollama list

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To use the model:"
echo "  ollama run ${OLLAMA_MODEL_NAME}"
echo ""
echo "Or via API:"
echo "  curl http://localhost:11434/api/generate -d '{\"model\": \"${OLLAMA_MODEL_NAME}\", \"prompt\": \"Hello\"}' "