#!/usr/bin/env bash
set -euo pipefail

REGISTRY="ghcr.io/some-natalie/some-natalie"

build_and_push() {
  local IMAGE="$1"
  local DOCKERFILE="$2"

  echo "==> Building ${IMAGE} from ${DOCKERFILE}"

  docker build --platform=linux/arm64 -f "${DOCKERFILE}" -t "${REGISTRY}/${IMAGE}:arm64-latest" .
  docker push "${REGISTRY}/${IMAGE}:arm64-latest"

  docker build --platform=linux/amd64 -f "${DOCKERFILE}" -t "${REGISTRY}/${IMAGE}:amd64-latest" .
  docker push "${REGISTRY}/${IMAGE}:amd64-latest"

  crane index append \
    -t "${REGISTRY}/${IMAGE}:latest" \
    -m "${REGISTRY}/${IMAGE}:amd64-latest" \
    -m "${REGISTRY}/${IMAGE}:arm64-latest"

  echo "==> Done: ${IMAGE}"
}

build_and_push "command-injection"                    "command-injection.Dockerfile"
build_and_push "command-injection-noshell"            "noshell-python.Dockerfile"
build_and_push "command-injection-noshell-noroot"     "noshell-noroot-python.Dockerfile"
build_and_push "command-injection-noshell-noroot-nopkgdb" "nopkgdb.Dockerfile"
