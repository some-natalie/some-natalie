---
title: "Kubernoodles"
permalink: /kubernoodles/
order: 3
icon: fa-solid fa-user-astronaut
---

[Kubernoodles](https://github.com/some-natalie/kubernoodles) is a reference architecture to demonstrate a lot of "how to _securely_ devops" things, mostly for [actions-runner-controller](https://github.com/actions/actions-runner-controller) within a larger business.  This is how I've built and maintain my demo environment.

Why I've made certain design choices is based on experiences shared below:

- Thoughts on [self-hosted architecture](../blog/arch-guide-to-selfhosted-actions/)
- Considerations on [containerizing CI at an enterprise scale](../blog/kubernetes-for-enterprise-ci/)
- [Securely using actions-runner-controller](../blog/securing-ghactions-with-arc/)

Here's what has been done and where we're going.

1. [Initial cluster setup](../blog/kubernoodles-pt-1) - Kubernetes cluster setup in a managed provider, installing [cilium](https://github.com/cilium/cilium) and [hubble](https://github.com/cilium/hubble) to power observability, and [actions-runner-controller](https://github.com/actions/actions-runner-controller) with default runners in a scaling set.
1. [Testing runner scalability](../blog/kubernoodles-pt-2) - Create a few Actions to test, scale, and debug our self-hosted runners.
1. [What are your users _really_ doing?](../blog/kubernoodles-pt-3) - Dive into understanding what's being run in our self-hosted GitHub Actions runners with [eBPF](https://ebpf.io) and [tetragon](https://github.com/cilium/tetragon).
1. [Continuous delivery for custom runners](../blog/kubernoodles-pt-4) - Setup the Kubernetes cluster, GitHub, and actions-runner-controller to work together, then make a GitHub Actions workflow to create and remove test deployments from a Helm chart.
1. [Building custom runner images](../blog/kubernoodles-pt-5) - How to build your own custom images for actions-runner-controller!
1. [Building containers in ARC with Kaniko](../blog/kaniko-in-arc) - Using [Kaniko](https://github.com/GoogleContainerTools/kaniko) in actions-runner-controller to build containers without privileged pods.
1. [Continuous integration for custom runner images](../blog/kubernoodles-pt-7) - CI for your CI, or how to test your custom runner images on each change.
1. [Writing tests for Actions runners](../blog/testing-runner-containers) - Test your enterprise CI images with the same rigor as your other software.
1. [Reducing your software vulnerabilities](../blog/reduce-cves-arc) - Reduce the number of CVEs in your runner images using [wolfi](https://github.com/wolfi-dev) to improve the security posture and eliminate many compliance headaches in regulated environments.
1. [Building multi-architecture runners](../blog/multiarch-runner-builds) - Why not use ARM too?  Adding extra CPU architectures to our runner image builds was easy.
1. [Signing and attesting the builds of your container images](../blog/signing-attesting-builds) - Proving the link between the code, builds, and artifacts of your CI that builds your code ... to then prove the link between code, build, and artifact. ♾️
1. Shrinking big container images - CI images can get big, but they don't have to be.  Let's unpack the relationship between image size, security, and the practices that can help.
    1. [the Where and Why of big containers](../blog/big-container-images) shows why these workloads have such large images to begin with.
    1. [Tidy up your container builds](../blog/tidy-big-builds) walks through how to shrink builds by tidying up your build process.
    1. [Squash builds are very effective and easy to implement](../blog/squash-big-builds), shrinking our runners by up to 20%.
    1. [Image “slimmers” aren't magic either](../blog/slim-big-builds) dives into how these tools work and some critical considerations when using them.

> Last updated in **January 2025** with the updated versions of Kubernetes, actions-runner-controller, etc. that I am currently using.
{: .prompt-info}

Maybe soon:

- Log streaming
- More fun with [eBPF](https://ebpf.io)
- File caching
- Fun with metrics!

> My environment uses mostly on-prem resources and now almost always is used to build _other_ software or demonstrate other parts of Kubernetes management.  I used to have more access to Azure services, so there's a lot of references there as well.  I'll try to call out using vanilla k8s as much as possible for portability.
{: .prompt-info }
