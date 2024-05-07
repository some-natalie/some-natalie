---
title: "Chainguard command line tools"
excerpt: "chainctl, melange, and other public tools"
layout: post
---

## Chainctl

[chainctl docs](https://edu.chainguard.dev/chainguard/chainctl/chainctl-docs/chainctl/)

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
  chainctl iam organizations list -o json | jq '.items[] | select(.name == '\"${1}\"') | .id'
}
```
