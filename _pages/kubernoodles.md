---
title: "Kubernoodles"
classes: wide
permalink: /kubernoodles/
---

[Kubernoodles](https://github.com/some-natalie/kubernoodles) is a reference architecture to demonstrate a lot of "how to devops" things, mostly for [actions-runner-controller](https://github.com/actions/actions-runner-controller) within a larger business.  With all the new work GitHub has put into the project, the opinionated guidance is no longer valid or got totally deprecated by shiny new features.  Add in my newfound desire to explore observability in Kubernetes, I decided to rip it out and start new.  In documenting the rebuild, hopefully it'll make life easier for others in more tangible ways than my prior writings on [self-hosted architecture](../blog/arch-guide-to-selfhosted-actions/), considerations on [containerizing CI at scale](../blog/kubernetes-for-enterprise-ci/), and [securely using actions-runner-controller](../blog/securing-ghactions-with-arc/).

Here's what has been done and where we're going.

- [Part 1](../blog/kubernoodles-pt-1) - Initial cluster setup, [cilium](https://github.com/cilium/cilium) and [hubble](https://github.com/cilium/hubble) to power observability, [actions-runner-controller](https://github.com/actions/actions-runner-controller) and default runners with the new runner scale set architecture.

Coming soon:

- Some basic GitHub Actions workflows to test and debug runners
- Tetragon setup!
- Log streaming
- Private registries
- File caching
- k8s jobs

:information_source: My environment uses Azure services.  They're currently "free" for me and I'll try to call out using vanilla k8s as much as possible for portability.
