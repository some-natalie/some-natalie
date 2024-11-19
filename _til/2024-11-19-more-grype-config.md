---
date: 2024-11-19
title: "Grype can use an image pull policy"
tags:
- grype
- containers
visibility: public
---

One more saved-my-bacon tip:  If you're prone to having a ton of images cached locally, you may _need_ to scan the latest build of that tag.  It can always pull the latest image, similar to setting `ImagePullPolicy: Always` in Kubernetes.

```yaml
default-image-pull-source: registry
```
{: file='~/.grype.yaml' }
