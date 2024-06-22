#!/bin/bash
set -e

# This script doesn't run or get called by anything anymore.
# There's no additional repositories to clone on creation.

# Get the list of other repositories from devcontainer.json using jq
REPOS=$(jq -r '.customizations.codespaces.repositories' .devcontainer/devcontainer.json | jq -r 'keys[]')

# Clone the other repos
for repo in $REPOS; do
    repo_name=$(echo "$repo" | cut -d'/' -f2) # split the repo name from owner
    git clone https://github.com/"$repo".git /workspaces/"$repo_name"
done
