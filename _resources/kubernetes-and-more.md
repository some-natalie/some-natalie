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
- [Skopeo](#skopeo)

---

## Crane

crane [docs](https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md) and [recipes](https://github.com/google/go-containerregistry/blob/main/cmd/crane/recipes.md)

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

### Return a list of architectures for a multi-arch image

```shell
function docker-arch {
  if [ "${1}" = "-h" ]; then
    echo "Usage: docker-arch [image]"
    echo "List the architectures for a multi-arch image."
    return
  fi
  if [ "${1}" = "" ]; then
    echo "Image name required."
    return
  fi
  docker manifest inspect ${1} |\
    jq -r '.manifests[].platform | select(.os != "unknown" and .architecture != "unknown") | "\(.os)-\(.architecture)"' |\
    sort |\
    uniq
}
```

---

## Grype

### Config file

Some helpful configs in `~/.grype.yaml`:

```yaml
# sometimes the hotel wifi is awful and yesterday's data is good enough
check-for-app-update: false
db:
  auto-update: false

# always pull the latest image from the registry
default-image-pull-source: registry
```

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
  echo "| Count | Severity    |"
  echo "|-------|-------------|"
  printf "| %-5s | %-11s |\n" $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Critical') "critical"
  printf "| %-5s | %-11s |\n" $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'High') "high"
  printf "| %-5s | %-11s |\n" $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Medium') "medium"
  printf "| %-5s | %-11s |\n" $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Low') "low"
  printf "| %-5s | %-11s |\n" $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Negligible') "negligible"
  printf "| %-5s | %-11s |\n" $(cat grype.json | jq  '.matches[].vulnerability.severity' | grep -c 'Unknown') "unknown"
  rm grype.json
}
```

Outputs something like this:

```shell-session
Total = 558

| Count | Severity    |
|-------|-------------|
| 38    | critical    |
| 170   | high        |
| 298   | medium      |
| 43    | low         |
| 0     | negligible  |
| 9     | unknown     |
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

## Skopeo

### Inspect container image configuration

[Skopeo](https://github.com/containers/skopeo) can inspect the configuration of a container, not just what's in the OCI manifest.  It's great to get a handle on the default environment variables, working directory, and other defaults.  Use the `--config` flag to get the configuration of an image as a big JSON file.

```shell
skopeo inspect --config --override-os="linux" --override-arch="amd64" docker://python:3.12
```

I also needed to specify the OS and CPU architecture I wanted to inspect.  Skopeo defaults to what's detected on the host and I'm on an ARM-based Mac.  This returns something that's easy to pipe through `jq` for just what I need - in this case, the default environment variables of the Python:3.12 image for Intel-based Linux systems.

```shell-session
ᐅ skopeo inspect  --config --override-os="linux" --override-arch="amd64" docker://python:3.12 | jq '.config.Env'
[
  "PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
  "LANG=C.UTF-8",
  "GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305",
  "PYTHON_VERSION=3.12.7",
  "PYTHON_SHA256=24887b92e2afd4a2ac602419ad4b596372f67ac9b077190f459aba390faf5550"
]
```
