---
date: 2024-12-11
title: "Print the platforms of a multi-architecture container from the manifest"
tags:
- containers
- jq
visibility: public
---

I needed to find and script a little around the platforms of a multi-architecture container image.  This is what I came up with:

```shell
docker manifest inspect path-to/image:tag |\
jq -r '.manifests[].platform | select(.os != "unknown" and .architecture != "unknown") | "\(.os)-\(.architecture)"' |\
sort |\
uniq
```

It omits any `unknown` entries as they're frequently attestations or signatures.  It outputs a lovely list as follows:

```text
linux-386
linux-amd64
linux-arm
linux-arm64
linux-ppc64le
linux-s390x
windows-amd64
```

The full shell wrapper, which includes a help message and only needs the image name as an argument, is [here](../grimoire/kubernetes-and-more/#return-a-list-of-architectures-for-a-multi-arch-image).
