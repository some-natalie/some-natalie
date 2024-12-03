---
date: 2024-12-03
title: "Skopeo can inspect container image configuration"
tags:
- containers
- skopeo
visibility: public
---

[Skopeo](https://github.com/containers/skopeo) can also inspect the configuration of a container, not just what's in the OCI manifest.  It's great to get a handle on the default environment variables, working directory, and other defaults.  Use the `--config` flag to get the configuration of an image as a big JSON file.

```shell
skopeo inspect --config --override-os="linux" --override-arch="amd64" docker://python:3.12
```

I also needed to specify the OS and CPU architecture I wanted to inspect.  Skopeo defaults to what's detected on the host and I'm on an ARM-based Mac.  This returns something that's easy to pipe through JQ for just what I need - in this case, the default environment variables of the Python:3.12 image for Intel-based Linux systems.

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
