#!/bin/bash
#
# This script pulls all images for the container escapes workshop.

images=(
    "docker.io/library/ubuntu:24.04"
    "docker.io/redhat/ubi9:9.6"
    "ghcr.io/some-natalie/some-natalie/whoami:latest"
    "cgr.dev/chainguard/python:latest"
    "cgr.dev/chainguard/curl:latest"
    "docker.io/library/nginx:latest"
    "ghcr.io/some-natalie/some-natalie/secret-example:latest"
    "ghcr.io/some-natalie/some-natalie/cowsay:latest"
    "ghcr.io/some-natalie/some-natalie/command-injection:latest"
    "ghcr.io/some-natalie/some-natalie/command-injection-noshell:latest"
    "ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:latest"
)

for image in "${images[@]}"; do
    echo "Pulling $image..."
    docker pull "$image"
done

# pull a few for podman too
podman pull docker.io/library/ubuntu:24.04
podman pull docker.io/redhat/ubi9:9.6
