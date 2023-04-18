#!/bin/bash
set -e

# Open the workspace
code /workspaces/some-natalie/.code-workspace

# Start jekyll
bundle exec jekyll serve --livereload
