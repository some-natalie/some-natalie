---
title: "Container stuff"
excerpt: "Kubernetes, Docker, Helm, and other container things"
layout: post
---

- [Crane](#crane)
- [Docker](#docker)
- [Grype](#grype)
- [Helm](#helm)
- [Kubectl](#kubectl)

---

## Crane

[crane docs](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md)

### List tags available

```shell
function img-tags {
    if [ "${1}" = "-h" ]; then
        echo "Usage: imgtags cgr.dev/reponame/imagename]"
        echo "List tags for an OCI-compliant image, omitting digests, using crane."
        return
    fi
    if [ "${1}" = "" ]; then
        echo "Image name required."
        return
    fi
    crane ls ${1} --omit-digest-tags
}
```

## Docker

### Clean up all the things

The "nuke it from orbit" approach that removes all stopped containers, dangling images, build cache, and volumes.  I use this one a lot.

```shell
function docker-cleanup {
  if [ "${1}" = "-h" ]; then
    echo "Usage: docker-cleanup"
    echo "Remove all stopped containers and dangling images, build cache, volumes, and more."
    return
  fi
  # remove all stopped containers, networks, images
  docker system prune -af
  # remove all unused volumes, not just anonymous ones
  docker volume prune -af
}
```

### Return size in human-readable format

{% raw %}
```shell
function docker-size {
  if [ "${1}" = "-h" ]; then
    echo "Usage: docker-size [image]"
    echo "Inspect the size of a Docker image and return it in human-readable format."
    return
  fi
  if [ "${1}" = "" ]; then
    echo "Image name required."
    return
  fi
  docker inspect -f "{{ .Size }}" ${1} | numfmt --to=si
}
```
{% endraw %}

---

## Grype

### Summarize Grype results

This prints out a markdown table to copy/paste into another system.

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
  echo "Total = $(cat grype.json | jq  '.matches[].vulnerability.severity' | uniq -c | awk '{sum += $1} END {print sum}')"
  echo ""
  echo "| Count | Severity |"
  echo "|-------|----------|"
  echo "| $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Critical') | critical |"
  echo "| $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'High') | high |"
  echo "| $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Medium') | medium |"
  echo "| $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Low') | low |"
  echo "| $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Negligible') | negligible |"
  echo "| $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Unknown') | unknown |"
  rm grype.json
}
```

Outputs something like this:

```shell-session
Total = 164

| Count | Severity |
|-------|----------|
| 2 | critical |
| 14 | high |
| 34 | medium |
| 4 | low |
| 76 | negligible |
| 34 | unknown |
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
