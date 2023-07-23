---
title: "Please stop saying 'Just use Firecracker' - do this instead"
date: 2023-07-21
categories:
  - blog
tags:
  - security
  - kubernetes
classes: wide
excerpt: "Using things for what they're meant for empowers teams at scale - and also, how to avoid death by a thousand cuts along the path of shoving VMs into systems designed for containers."
---

Please stop saying "just use [Firecracker](https://firecracker-microvm.github.io/)" when faced with a container security challenge.  It's a fabulously cool technology.  It's got great use cases - it's the foundation of AWS Lambda and it's on [GitHub](https://github.com/firecracker-microvm/firecracker) and written in 🦀 Rust 🦀 so it's super cool.  A whole herd of SaaS providers now offer it as a managed service as well.[^1]  We’re all glossing over two fundamental problems.

1. Not every container use case works well in a micro-VM out of the box. 🙊
2. Micro-VMs don’t solve all your container security problems. 😱

I've touched on this a few times when talking about [enterprise scale CI with Kubernetes](../kubernetes-for-enterprise-ci) and again at [CNCF CloudNativeSecurityCon 2023](../securing-ghactions-with-arc) - micro-VMs are fantastic, but probably _not_ what you're looking for to address the bulk of your continuous integration security problems.  Unless you're already dedicated, have teammates who _also_ want to go down this path, and are deeply familiar with virtualization technologies - you may end up in a big pit of despair due to the added complexity, especially on-premises.  As an example, here's a conversation that I’ve had pretty often lately.

> User - "So this whole GitHub Actions thing is great and since we self-host GitHub, we can put this in our existing Kubernetes cluster, right?"
>
> Me - Yep!  Here's some stuff to get you going.[^2]

:: several days later ::

> User - "We want to do Docker in Docker, because we _need_ it for `valid business case`, but we can't do privileged mode for `valid security concern` so we're at a standstill until we get Firecracker figured out.  We have `cryptic error message` and this is the 6th consecutive troubleshooting error we've gotten."
>
> Me - oh boy ...

There's a couple of common problems here, a few understated risks, and overlooked technologies that may offer more economical mitigating controls.  

> We're going to be mostly talking about Firecracker specifically, but many of the same points hold for [Kata containers](https://katacontainers.io/) or any other "container is a VM" technology.
{: .prompt-info}

Let's dive in 🪂

## How it works with Kubernetes

Firecracker manages (very tiny) VMs with a RESTful API using kernel virtual machines. That's more or less it - great manager, fantastic API, and all that jazz built on top of KVMs.

![chances-of-me-using-limits](/assets/graphics/2023-07-21-stop-saying-just-use-firecracker/limits-and-requests.jpeg){: .w-50 .right}

It can get weird when you try to "just" put container workloads in it without any modification.  There’s a lot that doesn’t need to be specified in a PodSpec and does to define a virtual machine.  A good example is vertical scaling of a workload.  Within Kubernetes, you can set resource requests and limits and rely on the scheduler to move workloads around _if_ needed.  A virtual machine _needs_ you to set CPU/memory up front.  Firecracker also allows you to oversubscribe your resources, giving you fun new ways to blow your cluster up if you're not careful.

Within Kubernetes, our pod’s lifecycle now looks something like this:

1. The scheduler is hanging out on the control plane and gets a request to start some sort of work. The scheduler sees an appropriate node with enough resources available and asks that node’s kubelet to do the thing! The kubelet works off the PodSpec that it gets from the scheduler and thinks [this](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) is how it manages the lifecycle of that pod.
2. So the kubelet talks to the container runtime on the node using the language they share, the [container runtime interface](https://kubernetes.io/docs/concepts/architecture/cri/), and asks it to start a new pod with whatever is in the PodSpec.
3. Usually, we’re near the end of the story here, but because this is a VM and not a container, we’ve got some extra stuff to do. CRI is implemented in a plugin to the runtime `containerd`, so now we’re going to bridge the next gap between what Kubernetes thinks is a container and a kernel VM that Firecracker creates.
4. This is where the next plugin comes into play, `firecracker-containerd` ([GitHub](https://github.com/firecracker-microvm/firecracker-containerd)). This adds another "translation" to what Kubernetes expects to what Firecracker can do.
5. Now we cross the boundary from container runtime into the firecracker microVM (and runc) and the work happens.  If there's any networking involved, CNI is also implemented with `firecracker-containerd`, so there's one more hop around the network for stuff to get done.
6. Once it’s done, now we need to reclaim this VM’s resources and tell the kubelet the process is done.

See how many extra handoffs happen? Firecracker is a **fabulously** cool thing, but it’s not a drop-in replacement for a container runtime that Kubernetes expects. I’d recommend browsing some of the open issues and discussions in their GitHub organization ([link](https://github.com/firecracker-microvm)) to get a handle on all the ways people who were told "just use firecrackers" had problems along this path to avoid the same ones, should this still be of interest.[^3]

## The risks

👏 Any particular technology isn’t **the** magic fix for a multi-faceted security problem. 👏

That's my biggest problem with this discussion about Firecracker that comes up - the sheer coolness of it obscures the practicalities of implementation for your use case and what problems it truly addresses.[^4]

The use of Kubernetes that I see the most is using it as [enterprise continuous integration](../kubernetes-for-enterprise-ci) systems.  It's great for this!  These loads tend to be "peaky" in intensity - acting like "spot instances", efficiently scheduling jobs that tend to not be time sensitive, is ideal.  This use also lends itself to Firecracker, as it was designed to execute untrusted user functions safely in a serverless environment.

Are there better, safer, faster, more economical places to establish trust on your team's inputs than at the very end of this process?

**Doing risky things in a VM is still risky.**  The isolation of a VM is great and I won't argue it's substantially better than a container.  Even better is how _much_ gets stripped out of micro-VMs - things like additional interfaces, much of the "sharing" ability of devices between host and VM, etc.  This all combines to dramatically shrink the surface area of things that could get squirrely, but doesn't make your cluster completely immune to all the things that could go wrong.  Here's a few things it won't do a thing to stop.

- **Network activity** isn't _that_ different here.  If you allow your VM-pod network access, it's still allowed the same network access your vanilla-container-pod would have had.  Example threats here would be downloading and executing arbitrary binaries, or reaching out for a command-and-control attack or crypto-mining service.
- **Contaminated container images** are still compromised, but the vector of escaping from the container to the host for more persistent naughtiness is (mostly) shut down.  This is particularly concerning for using containers to build your code, possibly adding the ability to persist _elsewhere_ where that built code is run.
- **Unsafe build steps** can still do naughty things, such as [upload your code somewhere else](https://about.codecov.io/security-update/) or bring in code from other (even internal) repositories that wasn't _supposed_ to be part of this build.
- **Shared storage** is still a compromise vector.  It's great that your compute is ephemeral, but if the persistent storage between them isn't, that's still a risk. 😇

**These are huge threats to build jobs, not addressed by the underlying virtualization technology.**  Privileged containers aren't great, but feeling safer than you really are is way more risky than it ever gets credit for.  😮

## Shifting trust left

As an industry, we talk a ton about "shifting `thing` left" - security, operations, testing, etc.  There's a huge value to maintaining tiny inner loops for fast failures and iterating into success quickly.  I want to propose one more thing to "shift left".

<div style="text-align:center"><p style="font-size: 20px"><b>
Shift trust left.
</b></p></div>

When your pipeline is code, **code review is the most effective guardrail.**  It shifts the trust of executing code out of the very end (runtime) and towards the people most familiar with the technology and business needs - your teammates. 💖

Looking critically at your workloads and reviewing their changes can catch all manner of security problems, such as:

- typo-squatting or known malicious images or dependencies
- reviewing dependencies of both builds and pipelines
- poor best practices, like not using your internal repository or creating a single stage build
- risky things, like disabling SSL certificate verification
- network calls - what's getting downloaded and from where, what's getting pushed where?
- sharing credentials unsafely

![lego-sisyphus](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/lego-sisyphus.gif){: .left}

If you have a dozen/hundred/thousand teams, maybe they can share _most_ of their infrastructure in a shared Kubernetes cluster for cost controls and governance.  Giving infrastructure teams room to manage edge cases with [boring technology](https://mcfunley.com/choose-boring-technology) allows for their bandwidth to be invested elsewhere.  I am not suggesting taking away all the guardrails further along - only balancing limited time and energy to deliver the best and most secure thing you can.  **Limiting complexity that may not be the most impactful to your security posture helps that goal.**

## Alternative approaches

Okay, so you definitely still do code review and you still _need_ to do something else to both enable the business and protect it from itself.  Other ways to solve this problem that might be simpler include:

- Using a regular virtual machine specifically for `privileged task`, usually with existing templates and configuration management tooling and relying on existing infrastructure isolation (e.g., one project/department = one VM pool)
- Another cluster used specifically for `privileged task`
- Using [eBPF](https://ebpf.io/) for kernel-level observability and enforcement ([like so](../kubernoodles-pt-3)) 🐝
- Moving these workloads into a rootless and sudoless (but still privileged) container, frequently used for Docker-in-Docker (example [Dockerfile](https://github.com/some-natalie/kubernoodles/blob/main/images/rootless-ubuntu-jammy.Dockerfile))
- Changing your workload's tools elsewhere if possible - e.g., use [Kaniko](https://github.com/GoogleContainerTools/kaniko) or [Buildah](https://buildah.io/) for container building, or using the [runner-with-k8s-jobs](https://github.com/actions/actions-runner-controller/blob/master/docs/deploying-alternative-runners.md#runner-with-k8s-jobs) for actions-runner-controller.

This could all still be true and Firecracker (or similar) is _still_ the best option for you.[^5]  Adding complexity to a system is completely appropriate if it's the best choice for the project.

Making mindful choices about technologies your team uses is what "just use `tech`" completely papers over.  Whatever you do, please stop saying "just use Firecracker". It robs us of an opportunity to have a multi-faceted discussion of the problems we face as technologists and the tools we use to address them.

---

### Footnotes

[^1]: I work with the super-duper regulated crowd and these SaaS solutions don't operate in that space, so I don't interact with their products much - it's bare metal k8s all day for me.  Your milage may vary here!
[^2]: Here's the resources I typically send for folks starting out on the self-hosted runner journey - the official [documentation](https://docs.github.com/en/enterprise-cloud@latest/actions/hosting-your-own-runners/managing-self-hosted-runners) and an [architecture guide to self-hosted GitHub Actions](https://some-natalie.dev/blog/arch-guide-to-selfhosted-actions/).  Most importantly, do what works best for your teams - everyone has a different custom implementation and that’s fine!
[^3]: `firecracker-containerd` has solved a **bunch** of these paper cuts over the past year or two, including shipping a CNI compatible network interface and the ability to have multiple containers in one VM.
[^4]: For the record, I adore Firecracker and want to play with it even more!
[^5]: <https://www.talhoffman.com/2021/07/18/firecracker-internals/> remains the best deep dive into the internals of Firecracker and how it works that I’ve ever read.
