#!/bin/bash
set -e

# Get the list of other repositories from devcontainer.json using jq
REPOS=$(jq -r '.customizations.codespaces.repositories' .devcontainer/devcontainer.json | jq -r 'keys[]')

# Open the other repos
for repo in $REPOS; do
    repo_name=$(echo "$repo" | cut -d'/' -f2) # split the repo name from owner
    code-insiders --add /workspaces/"$repo_name"
done
