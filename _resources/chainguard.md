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
  # private images
  echo "---- private images ----"
  chainctl img repos list --parent $privateorg -o json |\
    jq -r '.items[].name' |\
    fzf --filter="${1}" |\
    sort
  # public images
  echo "---- public images ----"
  chainctl img repos list --public -o json |\
    jq -r '.items[].name' |\
    fzf --filter="${1}" |\
    sort
}
```

### Export a list of images to a text file

```shell
function cgr-list {
  if [ "${1}" = "-h" ]; then
    echo "Usage: chainguard-list [outputfile]"
    echo "Export a list of images to a text file."
    return
  fi
  if [ "${1}" = "" ]; then
    echo "Output file required."
    return
  fi
  # set org name and export the list
  local privateorg="chainguard-private" # edit to your private registry
  chainctl img repos list --parent $privateorg -o json |\
    jq -r '.items[].name' |\
    sort > $1
  # get length of images
  local count=$(wc -l $1 | awk '{print $1}')
  echo "List of $count images in $privateorg written to $1."
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
