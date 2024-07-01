---
title: "Chainguard command line tools"
excerpt: "chainctl, melange, and other public tools"
layout: post
---

## Chainctl

[chainctl docs](https://edu.chainguard.dev/chainguard/chainctl/chainctl-docs/chainctl/)

### Find if an image is available using fuzzy search

```shell
function cgr-find {
  if [ "${1}" = "-h" ]; then
    echo "Usage: chainguard-search [image]"
    echo "Search for an image by name with fzf."
  return
  fi
  if [ "${1}" = "" ]; then
    echo "Image name required."
    return
  fi
  # set orgs
  local privateorg="chainguard-private" # edit to your private registry
  local publicorg="chainguard" # public images registry
  # private images
  echo "---- private images ----"
  chainctl img repos list --parent $privateorg -o json |\
    jq -r '.items[].name' |\
    fzf --filter="${1}" |\
    sort
  # public images
  echo "---- public images ----"
  chainctl img repos list --parent $publicorg -o json |\
    jq -r '.items[].name' |\
    fzf --filter="${1}" |\
    sort
}
```

### Get the Chainguard group ID of a given domain

```shell
function chainctl-id {
  if [ "${1}" = "-h" ]; then
    echo "Usage: chainctl-id [domain]"
    echo "Get the Chainguard group ID of a given domain."
    return
  fi
  if [ "${1}" = "" ]; then
    echo "Domain name required."
    return
  fi
  echo "Getting group ID for domain ${1} ..."
  chainctl iam organizations list -o json |\
    jq '.items[] | select(.name == '\"${1}\"') | .id'
}
```
