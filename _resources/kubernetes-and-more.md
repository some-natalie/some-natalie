---
title: "Container stuff"
excerpt: "Kubernetes, Docker, Helm, and other container things"
layout: post
---

- [Chainctl](#chainctl)
- [Grype](#grype)
- [Helm](#helm)
- [Kubectl](#kubectl)

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

---

## Grype

### Summarize Grype results

```shell
function grype-summary () {
  if [ "${1}" = "-h" ]; then
    echo "Usage: grype-summary [path]"
    echo "Summarize vulnerabilities found by Grype."
    return
  fi
  if [ "${1}" = "" ]; then
    echo "Path or image name required."
    return
  fi
  grype ${1} -o json --file grype.json -q
  cat grype.json | jq  '.matches[].vulnerability.severity' | sort | uniq -c
  rm grype.json
}
```

Outputs something like this:

```shell-session
ᐅ grype-summary nginx:1
   2 "Critical"
  14 "High"
   4 "Low"
  34 "Medium"
  72 "Negligible"
  20 "Unknown"
```

### Multi-image Grype summarization

I wrote a [Python script](https://github.com/some-natalie/dotfiles/blob/main/scripts/grype-table.py) that takes a newline-delimited text file to summarize multiple Grype results into a pretty console table.

```shell-session
ᐅ ./grype-table.py test-list.txt
Analyzing nginx:1...
Analyzing registry.access.redhat.com/ubi9/ubi-init:9.3...
Analyzing cgr.dev/chainguard-private/nginx-fips:1...
+----------------------------------------------+----------+------+--------+-----+------------+---------+
|                    Image                     | Critical | High | Medium | Low | Negligible | Unknown |
+----------------------------------------------+----------+------+--------+-----+------------+---------+
|                   nginx:1                    |    2     |  14  |   34   |  4  |     72     |   20    |
| registry.access.redhat.com/ubi9/ubi-init:9.3 |    0     |  1   |   32   | 143 |     0      |    4    |
|   cgr.dev/chainguard-private/nginx-fips:1    |    0     |  0   |   0    |  0  |     0      |    0    |
+----------------------------------------------+----------+------+--------+-----+------------+---------+
```

To make life easier, it's symlinked into `/usr/local/bin`.

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
  helm template "${1}" | grep -oE 'image: .+' | cut -d' ' -f2 | sort | uniq | tr -d '"'
}
```

---

## Kubectl

### Export a specific context

```shell
kubectl config view --minify --flatten --raw --context=CONTEXTNAME
```

### List all images running in a cluster

Does exactly what the title says it does.  I usually redirect output into a text file, then run [the Python script above](#multi-image-grype-summarization) on it for a quick table of vulnerability count by images in a cluster.

```shell
function k-ls-images {
  if [ "${1}" = "-h" ]; then
    echo "Usage: k-ls-images"
    echo "List all images running in a cluster, using the current context."
    return
  fi
  if [ "${1}" = "-c" ]; then
    echo "Returning count of pods running each image as well."
    echo " ... any `uniq` arguments work here ... "
  fi
  kubectl get pods --all-namespaces \
    -o jsonpath="{.items[*].spec['initContainers', 'containers'][*].image}" |\
  tr -s '[[:space:]]' '\n' |\
  sort |\
  uniq ${1}
}
```
