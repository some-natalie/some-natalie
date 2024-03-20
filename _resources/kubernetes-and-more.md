---
title: "Container stuff"
excerpt: "Kubernetes, Docker, Helm, and other container things"
---

## Helm

[helm docs](https://helm.sh/docs/)

### List unique images

```shell
function helm-ls-images {
  if [ "${1}" = "-h" ]; then
    echo "Usage: helm-images [chart]"
    echo "List of unique images used in Helm chart."
    return
  fi
  if [ "${1}" = "" ]; then
    echo "Chart name required."
    return
  fi
  helm template "${1}" | grep -oE 'image: .+' | cut -d' ' -f2 | sort | uniq
}
```

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
