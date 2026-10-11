#!/bin/bash
# =============================================================================
# Load Ollama Model on Disconnected System
# =============================================================================
# Usage: ./disconnected-setup.sh
# Environment Variables:
#   MODEL_ARTIFACT_DIR - Path to the artifact directory (default: current dir)
#   OLLAMA_MODEL_NAME  - Optional local alias (default: published model name)
#   OLLAMA_MODELS      - Store used by the target Ollama server
#   OLLAMA_HOST        - Target Ollama server (default: 127.0.0.1:11434)
# =============================================================================
set -euo pipefail

MODEL_ARTIFACT_DIR="${MODEL_ARTIFACT_DIR:-.}"
export OLLAMA_MODELS="${OLLAMA_MODELS:-${HOME}/.ollama/models}"
export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"

if [ ! -d "${MODEL_ARTIFACT_DIR}" ]; then
  echo "ERROR: Artifact directory not found: ${MODEL_ARTIFACT_DIR}" >&2
  echo "Download it first with: oras pull <oci-ref> -o ./model-artifact" >&2
  exit 1
fi

for directory in blobs manifests; do
  if [ ! -d "${MODEL_ARTIFACT_DIR}/${directory}" ] ||
     [ -z "$(find "${MODEL_ARTIFACT_DIR}/${directory}" -type f -print -quit)" ]; then
    echo "ERROR: Missing or empty ${directory} directory in artifact" >&2
    exit 1
  fi
done

if [ ! -f "${MODEL_ARTIFACT_DIR}/info.txt" ]; then
  echo "ERROR: Missing info.txt model metadata" >&2
  exit 1
fi
MODEL_NAME=""
while IFS= read -r line; do
  if [[ "$line" == model=* ]]; then
    MODEL_NAME="${line#model=}"
    break
  fi
done < "${MODEL_ARTIFACT_DIR}/info.txt"
OLLAMA_MODEL_NAME="${OLLAMA_MODEL_NAME:-$MODEL_NAME}"
for name in "$MODEL_NAME" "$OLLAMA_MODEL_NAME"; do
  if [[ ! "$name" =~ ^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$ ]]; then
    echo "ERROR: Invalid or missing model name" >&2
    exit 1
  fi
done

echo "Loading ${MODEL_NAME} from ${MODEL_ARTIFACT_DIR}"
echo "Ollama store: ${OLLAMA_MODELS}"
mkdir -p "${OLLAMA_MODELS}/blobs"
mkdir -p "${OLLAMA_MODELS}/manifests"
cp -R "${MODEL_ARTIFACT_DIR}/blobs/." "${OLLAMA_MODELS}/blobs/"
cp -R "${MODEL_ARTIFACT_DIR}/manifests/." "${OLLAMA_MODELS}/manifests/"

OLLAMA_URL="${OLLAMA_HOST%/}"
if [[ "$OLLAMA_URL" != http://* && "$OLLAMA_URL" != https://* ]]; then
  OLLAMA_URL="http://${OLLAMA_URL}"
fi
ollama_ready() {
  curl -fsS --connect-timeout 2 --max-time 5 "${OLLAMA_URL}/api/version" > /dev/null 2>&1
}

if ollama_ready; then
  echo "Ollama is already running"
else
  echo "Starting Ollama..."
  ollama serve &
  OLLAMA_PID=$!
  READY=false
  for _ in {1..30}; do
    if ollama_ready; then
      READY=true
      break
    fi
    if ! kill -0 "$OLLAMA_PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  if [ "$READY" != true ]; then
    kill "$OLLAMA_PID" 2>/dev/null || true
    echo "ERROR: Ollama failed to become ready at ${OLLAMA_URL}" >&2
    exit 1
  fi
fi

if ! ollama show "$MODEL_NAME" > /dev/null; then
  echo "ERROR: Restored model is not visible. The server must use ${OLLAMA_MODELS}." >&2
  exit 1
fi
if [ "$OLLAMA_MODEL_NAME" != "$MODEL_NAME" ]; then
  ollama cp "$MODEL_NAME" "$OLLAMA_MODEL_NAME"
  ollama show "$OLLAMA_MODEL_NAME" > /dev/null
fi
ollama list
echo "Setup complete. No pull from Ollama's registry is required."
echo "Run the model: ollama run ${OLLAMA_MODEL_NAME}"
