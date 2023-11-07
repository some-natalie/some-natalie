---
title: "Kubernoodles"
classes: wide
permalink: /kubernoodles/
order: 4
icon: fa-solid fa-user-astronaut
---

[Kubernoodles](https://github.com/some-natalie/kubernoodles) is a reference architecture to demonstrate a lot of "how to devops" things, mostly for [actions-runner-controller](https://github.com/actions/actions-runner-controller) within a larger business.  With all the new work GitHub has put into the project, the opinionated guidance is no longer valid or got totally deprecated by shiny new features.  Add in my newfound desire to explore observability in Kubernetes, I decided to rip it out and start new.  In documenting the rebuild, hopefully it'll make life easier for others in more tangible ways than my prior writings on [self-hosted architecture](../blog/arch-guide-to-selfhosted-actions/), considerations on [containerizing CI at scale](../blog/kubernetes-for-enterprise-ci/), and [securely using actions-runner-controller](../blog/securing-ghactions-with-arc/).

Here's what has been done and where we're going.

- [Part 1](../blog/kubernoodles-pt-1) - Initial cluster setup, [cilium](https://github.com/cilium/cilium) and [hubble](https://github.com/cilium/hubble) to power observability, [actions-runner-controller](https://github.com/actions/actions-runner-controller) and default runners with the new runner scale set architecture.
- [Part 2](../blog/kubernoodles-pt-2) - Create a few Actions to test, scale, and debug our self-hosted runners.
- [Part 3](../blog/kubernoodles-pt-3) - Dive into understanding what's really being run in our self-hosted GitHub Actions runners with [tetragon](https://github.com/cilium/tetragon).
- [Part 4](../blog/kubernoodles-pt-4) - Setup the Kubernetes cluster, GitHub, and actions-runner-controller to work together, then make a GitHub Actions workflow to create and remove test deployments from a Helm chart.
- [Part 5](../blog/kubernoodles-pt-5) - How to build your own custom images for actions-runner-controller!
- [Part 6](../blog/kaniko-in-arc) - Using [Kaniko](https://github.com/GoogleContainerTools/kaniko) in actions-runner-controller to build containers without privileged pods.
- [Part 7](../blog/kubernoodles-pt-7) - CI for your CI, or how to test your custom runner images on each change.
- [Part 8](../blog/testing-runner-containers) - Test your enterprise CI images with the same rigor as your other software.

Coming soon:

- Rebuilding and releasing custom runners on a schedule
- Log streaming
- More fun with [eBPF](https://ebpf.io)
- Private registries
- File caching

> My environment uses Azure services.  They're currently "free" for me and I'll try to call out using vanilla k8s as much as possible for portability.
{: .prompt-info }
