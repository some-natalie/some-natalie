---
permalink: /speaking/
title: "Speaking"
layout: single
classes: wide
---

## 2023

**Securing Self-Hosted GitHub Actions with Kubernetes and Actions-Runner-Controller**  (1 Feb) at [CloudNativeSecurityCon North America](https://events.linuxfoundation.org/cloudnativesecuritycon-north-america/) is a deep dive into the security considerations of running self-hosted GitHub Actions compute with [actions-runner-controller](https://github.com/actions/actions-runner-controller).

<details>
<summary>Abstract</summary>
Self-hosted GitHub Actions runners and Kubernetes are a natural fit, but there's not a lot of guidance on how to put the two together. The leading solution is actions-runner-controller, an open-source community project which provides a controller for autoscaling, ephemeral, and version-controlled compute. It does not, unfortunately, show off how to design and deploy it securely. Natalie leverages her experience building, securing, and advising others in regulated environments to highlight key places where security can be compromised unwittingly. Natalie will overview typical deployment architectures, then cover 3 distinct places where security risk and ease of use collide with insight and resources for navigating these design choices. First the cluster settings are examined to show methods to limit the "blast radius" of a potential bad actor and provide insight into the why and how of using privileged pods. Next, the controller settings are reviewed for how to scope runner deployments and grant permissions within GitHub to provide least-privilege. Lastly, the runner pod is taken apart to show how to build supply chain security into the image and the software it builds for you.
</details>

- [Slides](https://some-natalie.dev/blog/securing-ghactions-with-arc/), with writeup and links
- [YouTube](https://youtu.be/Ax4VPm2KrqQ)

## 2022

**Containerized CI at an Enterprise Scale** (21 Nov) at [Colorado Kubernetes & Cloud Native](https://www.meetup.com/colorado-kubernetes-cloud-native/) summarizes what to think about as an enterprise moving continuous integration into containers - everything from the benefits and drawbacks of nested virtualization to the how and why of privileged pods - from the perspective of having done the thing a few times over!

- [Slides](https://some-natalie.dev/blog/kubernetes-for-enterprise-ci/), with writeup and links

**Linux Software Packaging, maybe in a nutshell** (8 Sept) at the [Boulder Linux/Unix User Group](https://www.meetup.com/Boulder-Linux-Unix-User-Group/) is a quick tour through the history of packaging software in Linux - moving from compiling it at each computer using it, to RPM and DEB packages, to snaps/flatpaks and containers on the desktop.  This was a very interactive demo/talk at about an hour and the conclusion changes every time, but it's sadly unrecorded.

- [Slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2022-09-08_BLUG-Linux-Software-Packaging.pdf)
- [Makefile example](https://github.com/beagleboard/linux/blob/master/Makefile) for going through a modestly complex Makefile
- [RPM file example](https://koji.fedoraproject.org/koji/buildinfo?buildID=2058325) walking through the process of building RPMs from the source RPM
- [DEB file example](https://packages.debian.org/buster/libopenscap8) walking through the contents and process of building DEBs from a source tarball

## 2021

**Goobernetes**, or building GitHub Actions compute on-premises without (many) tears (14 Oct) at the [Boulder Linux/Unix User Group](https://www.meetup.com/Boulder-Linux-Unix-User-Group/)

- [Video](https://vimeo.com/637158846)
- [Slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2021-10-14_Goobernetes.pdf)
- [Source code](https://github.com/boozallen/goobernetes)

> **NOTE**
> The above source code repository isn't maintained.  Please look to [kubernoodles](https://github.com/some-natalie/kubernoodles) for a newer take on the same problem.

## 2020

**Getting Started in DevSecOps in a Regulated Environment** at [DevSecOps Days Denver 2020](https://www.devsecopsdays.com/2020-devsecops-days-denver)

- [Video](https://www.youtube.com/watch?v=ugDaAnXDp1Q)
- [Slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2020-10-29_Getting-Started-w-DevSecOps-Regulated-Environment.pdf)
