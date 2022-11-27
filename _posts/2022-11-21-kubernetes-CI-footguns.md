---
title: "Containerized CI at an Enterprise Scale"
date: 2022-11-21
categories:
  - blog
tags:
  - CI
  - kubernetes
classes: wide
excerpt: "What happens to container security and reliability when continuous integration is shoved in too!"
---

This post is slides + commentary from a talk I gave at Cloud Native Colorado on November 21st, 2022 about some of the weird ways you can blow up your cluster and your sanity once continuous integration jobs are added into Kubernetes, lessons learned in how to avoid these problems, and why it's _still_ worth all the effort to containerize your build system ([slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2022-11-21_Cloud-Native-CO.pdf)).  Kubernetes saves a ton of time and heartache maintaining a shared build infrastructure, but here's a few ways it's not your average application.  (links to skip ahead if you'd like)

- [Nested Virtualization](#nested-virtualization)
- [Privileged Pods](#privileged-pods)
- [Ephemerality](#ephemerality)
- [Conclusion](#conclusion)
- [Resources](#resources)

![slide-01](/assets/graphics/2022-11-21-cloud-native/slide-01.jpg)

![slide-02](/assets/graphics/2022-11-21-cloud-native/slide-02.jpg)

Hi!  I'm Natalie and I talk a lot about making the lives of enterprise admins easier, especially in heavily-regulated environments.  It's continually fascinating how in the very places that need automation the most to make systems safer and faster and more reliable, it can be so much harder to pull it off successfully.  You can find me online at my website, [some-natalie.dev](https://some-natalie.dev), or on GitHub [@some-natalie](https://github.com/some-natalie).

I've made some pretty ~~monumental~~ fun mistakes out of hubris and I'm here to talk to you about some of them I made in my first grown-up, not-a-lab, real users are on this thing(!!!) use of Kubernetes.  I got a chance to design and build a system for [GitHub Actions](https://github.com/features/actions) for the self-hosted environment I led for thousands of users.  The problems I faced turn out to be pretty common, so here's a couple hard-earned lessons.

![slide-03](/assets/graphics/2022-11-21-cloud-native/slide-03.jpg)

([link to the gif](https://media.giphy.com/media/JJhiRdcYfcokU/giphy.gif) that didn't survive turning the slide into a picture)

In working as a sysadmin, my first introduction to systems that build/deploy/maintain code was a series of scripts that ran on a cron job - checking out, building, and updating code on a web server nightly.  It was fun to watch devops transform the idea of "devs make" and "ops execute" into a more unified idea of software _ownership_ - because every system I worked with that followed this pattern was terrifyingly fragile and pretty much everything that came later was an improvement on it.

As these systems scaled, I found myself adjacent to a huge shared Jenkins installation kept in line by _dozens_ of Puppet modules.  In wanting to avoid tons of configuration management code in the form of Puppet with the new system using GitHub Actions, I instead went down the path of tons of environment creation code in the form of Docker files.  Still not sure how much of an improvement this represents on the code-management front, but the power of ephemeral and version controlled envirnoments saved a phenemonal amount of administration overhead (my time) and developer time by creating reproducible builds.

![slide-04](/assets/graphics/2022-11-21-cloud-native/slide-04.jpg)

I have some biases, so let's get those out in the open before we go on.  

First is that people time is almost always more valuable than machine time.  Assuming an average developer in the United States costs approximately $150k per year[^1], that's roughly $75 an hour.  If they're held up on a requested item or support ticket or a [long build](https://some-natalie.dev/blog/waiting-on-bulids/) for a couple hours, this cost adds up fast and is hard to account for.  Even harder to calculate is the retention cost of frustration on slow, heavyweight processes.  Like many in our profession, I have a pretty low tolerance for [toil work](https://cloud.google.com/blog/products/management-tools/identifying-and-tracking-toil-using-sre-principles).  (source linked from the slide [here](https://newsletter.pragmaticengineer.com/p/linkedin-engineering-efficiency))

Next is that simple solutions are better than complex ones, but complex solutions are better than complicated ones.  The source for this is Python's [PEP 20](https://peps.python.org/pep-0020/) - even if I chose a complicated approach to this problem (Kubernetes), at least it was thought through.  It turns out that having a bunch of teams with different dependencies share a system to build their code securely, reliably, and quickly is hard and that makes what "simple" is a sliding scale.  This challenge is at the heart of the anti-pattern we'll visit a couple times throughout the evening.

Much of my career so far has been in a business's _cost center_ - like internal IT departments that cost money and don't bring in any money.  As such, expenditures from software purchases to headcount is a bit of a fight to justify.  The systems I'm describing are typically the responsibility of a team empowering developers, which usually falls into that "cost center" category.  This means that avoiding toil work by automating as much as possible has an outsized impact to quality of life for administrators and for developers.

![slide-05](/assets/graphics/2022-11-21-cloud-native/slide-05.jpg)

(pictured - the appropriate reaction to seeing 800 packages listed on `yum update`)

Lack of investment or institutional interest doesn't mean this problem is worth ignoring though.  If every company is a software company[^2], how that software is built becomes critical to the business.

A build environment is like a kitchen.  You can make all sorts of food in a kitchen, not the one dish that you want at any given time.  With a simple set of tools and time, a dish can transport you anywhere in the world.  If it's just you and some reasonable roommates, you can all agree to a shared standard of cleanliness.  The moment one unreasonable houseguest cooks for the team and leaves a mess, it's a bunch of work to get things back in order (broken builds).  There could also be food safety issues (code safety issues) when things are left to get fuzzy and gross.

Imagine being able to snap your fingers and get a brand new identical kitchen at every meal - that's the power of **ephemeral build environments**.  Now imagine being able to track changes to those tools in that kitchen to ensure the knives are sharp and produce is fresh every single time anyone walks into it - that's putting your build environment in some sort of **version-controlled, infrastructure-as-code solution**.

Without routine maintenance and some supply chain management, most shared build systems eventually end up on the sysadmin's equivalent of _Kitchen Nightmares_.  Sadly, no charismatic know-how shows up to fix everything - but Kubernetes does!

---

### Nested Virtualization

![slide-06](/assets/graphics/2022-11-21-cloud-native/slide-06.jpg)

The first set of problems revolve around nested virtualization - think "Russian nesting doll", but with containers and (hopefully invisible to the users) virtual machines.

![slide-07](/assets/graphics/2022-11-21-cloud-native/slide-07.jpg)

First, let's take a moment to make sure we're all on the same page about terms and such.  This image is from the official Kubernetes docs ([link](https://kubernetes.io/docs/concepts/overview/#going-back-in-time)) and it's well worth the read, since we're here and not in a room together.  On the left is where that system working from a cron job would be, then in the middle would be the system using Jenkins + Puppet on VMs that I'd hoped to improve on, then on the right was what I was hoping for.

The challenge here is that when visibility only goes one-way, resource management gets exponentially more important with each additional layer of abstraction.  A virtual machine hypervisor can see some load and other statistics from each VM it's running and schedule accordingly in the cluster or move it around as needed to balance load across disks/CPUs/etc.  The virtual machine cannot see other VMs running on the same hypervisor.  

The same is (mostly) true of pods in Kubernetes.  Pods don't share awareness of all other pods, but the Kubernetes scheduler has an understanding of the resource requirements of tasks and resource utilization of nodes.  However, the Kubernetes scheduler is running within a VM and that isn't talking to the hypervisor and what it wants to put on that shared hardware.

![slide-08](/assets/graphics/2022-11-21-cloud-native/slide-08.jpg)

This is important because in my experience, on-premises clusters tend to look like this :point_up:.  I didn't have dedicated hardware, but added this to co-tenanted VMs in a hypervisor, meaning that the architecture diagram I ended up with looked more nested than first drawn out.  It's possible that as the Kubernetes scheduler is moving pods around to balance across the nodes, the hypervisor's load-balancing logic might also be trying to do the same - moving nodes around within the servers.  There's great security reasons for keeping this isolation, but I accidentally DDoS'd some other production services with [vMotion](https://www.vmware.com/products/vsphere/vmotion.html) until I learned to set the affinity correctly.

What's not in this picture is equally important - what's the network path for a request from a container, outbound to the internet?

1. Container
1. Container runtime
1. Node OS
1. Hypervisor
1. Host machine
1. < insert your company's whole network security stack here >
1. Internet, maybe?

Then all the way back upwards to get back, for each and every packet.

![slide-09](/assets/graphics/2022-11-21-cloud-native/slide-09.jpg)

Taking a step back to our network fundamentals, at each of the steps above to get from container to network, some amount of packet headers are coming off and getting added to route to that next step.  Each of those steps has a maximum size that it's able to handle, called the [maximum transmission unit](https://en.wikipedia.org/wiki/Maximum_transmission_unit) (MTU).  In my handy diagram above, I drew a red line representing some size past which packets can't continue.  To make matters more fun, not _all_ packets will get dropped, making it a difficult problem to identify and troubleshoot.

![slide-10](/assets/graphics/2022-11-21-cloud-native/slide-10.jpg)

In theory, this _really_ shouldn't be as much of a problem as it is.  There's not one, but two, fantastic ways to address the maximum packet size.  They don't always work as expected in this case.

The first is Path MTU Discovery, codified by [RFC 1191](https://datatracker.ietf.org/doc/rfc1191/).  This relies on the point along the packet's journey that it gets dropped due to excess size to send an [Internet Control Message Protocol](https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol) (ICMP) message back to the sending application saying "hey, this is too big, send me something smaller next time".  A really cool writeup of how this works from Cloudflare is [here](https://blog.cloudflare.com/path-mtu-discovery-in-practice/).  Without that message, the container (and thus the user) has no feedback or way to decrease packet size - just frustration.  The reason it often doesn't work as anticipated is that most large companies will have pretty much everything in the network configured to silently drop all ICMP messages, feeling that network security has improved through obscurity.

The second is TCP MTU Probing, with the latest revision in draft with [RFC 8899](https://datatracker.ietf.org/doc/rfc8899/).  This works based on "getting the hint" that the packet is too big because it fails, then sends incrementally larger packets until the correct max size is deduced.  Red Hat's developer blog has a fantastic writeup explaining how this works and how to set it up [here](https://developers.redhat.com/articles/2022/05/23/plpmtud-delivers-better-path-mtu-discovery-sctp-linux#commands_to_set_options_for_path_mtu_discovery).  This usually works, but has the drawback of being slow - because each pod is ephemeral, each pod and each user's job goes through this process at every run.  Additionally, while some processes will tolerate this negotiation until it finds the right size, others silently hang/fail.  Since the pods are ephemeral, the process that the user wanted never gets a chance to work.

To counter this, I recommend setting the maximum MTU size explicitly in your cluster (and pod, for that matter).  I'd love to show you a simple code snippet of how to do this with the correct sizing, but there's about a million variables based on what else is in your network and what CI tool you're using.

> **Note**
>
> Specific to GitHub Actions in Kubernetes, [actions-runner-controller](https://github.com/actions-runner-controller/actions-runner-controller) has some guidance on setting the MTU size explicitly [here](https://github.com/actions-runner-controller/actions-runner-controller/blob/master/TROUBLESHOOTING.md#outgoing-network-action-hangs-indefinitely).

![slide-11](/assets/graphics/2022-11-21-cloud-native/slide-11.jpg)

Managed services, such as Azure's [AKS](https://azure.microsoft.com/en-us/products/kubernetes-service/) or Amazon's [EKS](https://aws.amazon.com/eks/), make a lot of these problems disappear.  Specifically, a lot of the problems related to managing your hardware, hypervisor, and VMs that host/run Kubernetes.  It also takes away resource allocation problems, allowing you to scale as needed instantly.

On a self-managed cluster, if it thinks it has 100 virtual CPUs for worker nodes, but in truth, you've used some fancy hypervisor setting to overallocate - this'll be good until it actually needs to use everything it thinks it has but can't provision it.  The Kubernetes scheduler is only as smart as what it can see.  A managed service handles scaling for you invisibly.

That's not without a cost though.  Cost planning and optimization for managed services is an entirely different exercise than owning/operating datacenters.  You should contact the account team of the service(s) you're looking at for a better understanding of how charges are incurred because that's way outside the scope of this talk! :grinning:

![slide-12](/assets/graphics/2022-11-21-cloud-native/slide-12.jpg)

A managed service or a commercial "off-the-shelf" Kubernetes distribution will also provide at least some opinionated guidance on all the choices to make in standing up and running a cluster.  The picture to the right is a snapshot of the Cloud Native Computing Foundation's landscape ([link](https://landscape.cncf.io/)) and that's a fraction of the decisions to make in going from 0 to k8s, assuming what's needed and not is even known going into it.  It's daunting (and exhilarating).

![slide-13](/assets/graphics/2022-11-21-cloud-native/slide-13.jpg)

Once the basic infrastructure decisions are made, there's one more thing to think through that drove the large difference between the resource requests and limits for the runners that I recommend for hosting on-premises. Predicting the resource usage of any particular job/task/build/whatever is pretty hard when you have a ton of different ones.  One of the benefits to this large delta is that the quick little tasks that don't require a lot of compute can go anywhere, while the heavy usage pods can be moved around on the nodes by the scheduler to optimize longer-running jobs.  I also set the deployments that handle build jobs as `BestEffort` or `Burstable`, allowing them to be evicted when more important tasks in the cluster come up[^3].

If you're using Kubernetes within a VM infrastructure, the worker nodes can be moved around as needed to make the best use of the physical compute. When this goes wrong, it can cause all manner of cryptic error messages so make it a habit to always check resource utilization first.

![slide-14](/assets/graphics/2022-11-21-cloud-native/slide-14.jpg)

In summary, here's a few things to keep in mind - first is that :sparkles: containers are not VMs :sparkles: and using them like VMs sometimes reveals fun edge cases to explore in a river of user tears.

This guide on [anti-patterns of cloud applications](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/) is helpful.  I specifically run into the following frequently:

- Noisy neighbors (for self-hosted clusters)
- Extraneous fetching (pods are ephemeral, so lots of network traffic)
- No caching (making sure the pods are always configured to use the caches you have is frequently overlooked)

The two decisions to make around audience size versus pod size - big pods or lots of deployments of small pods - are going to be discussed more in the section on [ephemerality](#ephemerality), but each work well technically and can struggle depending on the "people and process" aspect of engineering depending on how the team works.  There's also an ever-increasing number of people and processes that become stakeholders to manage, adding to the fun.

---

### Privileged Pods

![slide-15](/assets/graphics/2022-11-21-cloud-native/slide-15.jpg)

Now that we're up and running, let's talk about ways the word "privilege" comes up with user requests.  As mentioned earlier, :sparkles: containers are not VMs :sparkles:, so the same security postures we had for VMs don't apply equally here.

:lock: Kubernetes security is one of those topics we can spend _hours_ on and maybe one day, we will but today I'm going to leave you with an overview and some things to think about for this use case, as well as the amazing [documentation](https://kubernetes.io/docs/concepts/security/).

![slide-16](/assets/graphics/2022-11-21-cloud-native/slide-16.jpg)

The first point is that a privileged pod does not always mean that a process has `root` or `sudo` access - and vice versa!  It might mean that it's easier to obtain one given the other though.  For the rest of this talk, we're going use the convention that "privileged" means the pod's security context is set to [Privileged](https://kubernetes.io/docs/concepts/security/pod-security-standards/#privileged) - meaning that system-wide trusted workloads are run by trusted users.  Likewise "rootful" will mean that the entrypoint script/command, build job, configured user, etc. either is root or has `sudo` access.

There's a decent amount of overlap in how these two concepts are used in practice, adding to the confusion.  To help mitigate potential escalations and untrusted workloads, it's helpful to keep [defense in depth](https://csrc.nist.gov/glossary/term/defense_in_depth) in mind, layering controls and allowing minimal permissions to prevent container escapes and other security incidents.

![slide-17](/assets/graphics/2022-11-21-cloud-native/slide-17.jpg)

We're going to need to know a bit about how the Linux kernel handles permissions.  Containers are not a kernel primative, but a combination of a regular process and some special guardrails.  This means that Kubernetes is scheduling processes for multiple projects on shared hardware _without_ the isolation of a virtual machine because :sparkles: containers are not VMs :sparkles:.

This isn't the end of the world, but our toolbox has changed compared to managing virtual machines.  Let's take a quick look at some of those tools.

1. [Capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html) define what a process is allowed to _do_.  Rather than an all-or-nothing approach of being root or not, capabilities allow users to selectively escalate processes with scoped permissions such as bind a service to a port below 1024 (`CAP_NET_BIND_SERVICE`) or read the kernel's audit log (`CAP_AUDIT_READ`).  We'll talk a little bit more about `CAP_SYS_ADMIN`, a special one that comes up frequently with debuggers or older build tools later.
1. [Namespaces](https://man7.org/linux/man-pages/man7/namespaces.7.html) are resources the process is allowed to _see_, and they're defined by syscalls.  Common namespaces are `time` or `uts`, defining the system time and hostname respectively, as well as a few more defined in the linked documentation.  More importantly, `cgroups` are defined here.
1. [Cgroups](https://man7.org/linux/man-pages/man7/cgroups.7.html) (short for "control groups") define what the process is allowed to _have_ via a weird filesystem.  There's two different versions to be aware of here, but the differences between them are way outside the scope of this talk.  The big takeaway here is this is how the kernel knows to limit a process to only have so much memory or CPU time.
1. [Overlayfs](https://docs.kernel.org/filesystems/overlayfs.html) is that stacking filesystem that containers use.  Important to note these are mounts and get a little weird later on in this talk.
1. Mandatory Access Control implementations like SELinux or AppArmor play a huge part in security too, but that's a huge topic we'll have to save for another day.  (Just don't disable it, okay?)

> **NOTE**
>
> A "namespace" in Kubernetes is an abstraction to provide some permissions isolation and resource usage quota within a cluster (such as deployments, secrets, etc.). It's commonly used to divide a cluster among several applications.  A kernel namespace is a low-level concept that wraps system resources in such a way that they are shared but appear dedicated.

:warning: This change means users migrating from VMs that _assume_ their jobs have root access might not "just work" in this new system without some changes.  This is okay - we're gaining reproducibility and more control over the software that goes into these build systems, but might have to spend some time messing with permissions and dependencies to allow their code to compile.

![slide-18](/assets/graphics/2022-11-21-cloud-native/slide-18.jpg)

(text on d-in-d)

![slide-19](/assets/graphics/2022-11-21-cloud-native/slide-19.jpg)

(text on hardware enablement)

![slide-20](/assets/graphics/2022-11-21-cloud-native/slide-20.jpg)

(text on cap_sys_admin)

![slide-21](/assets/graphics/2022-11-21-cloud-native/slide-21.jpg)

(text on firecrackers)

![slide-22](/assets/graphics/2022-11-21-cloud-native/slide-22.jpg)

(text on kata, et al)

![slide-23](/assets/graphics/2022-11-21-cloud-native/slide-23.jpg)

(text on scaling VMs)

---

### Ephemerality

![slide-24](/assets/graphics/2022-11-21-cloud-native/slide-24.jpg)

(last big hurdle was the switch from persistent managed state thru declarative daemons like puppet or salt to stateless, disposable containers)

![slide-25](/assets/graphics/2022-11-21-cloud-native/slide-25.jpg)

(text)

![slide-26](/assets/graphics/2022-11-21-cloud-native/slide-26.jpg)

(text about big pods - anaconda is something like 1.5-2 GB now ...)

---

### Conclusion

![slide-27](/assets/graphics/2022-11-21-cloud-native/slide-27.jpg)

I'll never get tired of saying that :sparkles: containers are not VMs :sparkles:, yet it seems like most of this evening has been all about a "lift and shift" of legacy VM infrastructure into containers.  And it has!

big pods are okay even if they aren't ideal, getting your feet under you with k8s is okay, and when you have hundreds of teams with discrete tech stacks, starting out by writing a hundred different containers to orchestrate is daunting.  but starting out with a couple big deployments of giant pods, then iterating and letting teams develop their own expertise and change their pipeline is immensely valuable - first economically by allowing admins to scale themselves without compromising security, but more importantly by empowering teams to own their build systems and have more control over what goes into it.  this is a journey, not a thanos-snap for most of your existing CI pipelines.

![slide-28](/assets/graphics/2022-11-21-cloud-native/slide-28.jpg)

(the scissor lift picture)

---

### Resources

These are the resources linked in the slides at the end of the full deck.

- Antipatterns of Cloud Applications, Microsoft Azure documentation.  [link](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/)
- Jérôme Petazzoni, "Do not use Docker in Docker for CI", September 2015, [link](https://jpetazzo.github.io/2015/09/03/do-not-use-docker-in-docker-for-ci/).  There's tons of info on Docker-in-Docker from [@jpetazzo](https://github.com/jpetazzo), but this post in particular is great for outlining _why_ the `--privileged` was created and why it might not be a good use for CI.
- Containers from Scratch, a fantastic [repo](https://github.com/lizrice/containers-from-scratch) and [talk](https://www.youtube.com/watch?v=MHv6cWjvQjM) showing how containers work without an abstraction like Docker
- Deep Dive into firecrackerd-containerd (DockerCon 2019), [talk](https://www.youtube.com/watch?v=0wEiizErKZw)
- Ian Lewis, "The almighty pause container", October 2017, [link](https://www.ianlewis.org/en/almighty-pause-container)

Resources specific to GitHub Actions

- [actions-runner-controller](https://github.com/actions-runner-controller/actions-runner-controller), the community project providing a Kubernetes controller for GitHub Actions.
- [kubernoodles](https://github.com/some-natalie/kubernoodles), my take on how to manage actions-runner-controller at a human scale in the enterprise.

---

### Footnotes

[^1]: 2022 Stack Overflow Survey, [link](https://survey.stackoverflow.co/2022/#salary-united-states)
[^2]: David Kirkpatrick in "Now Every Company Is A Software Company", Forbes magazine, November 2011, [link](https://www.forbes.com/sites/techonomy/2011/11/30/now-every-company-is-a-software-company)
[^3]: All about node-pressure evictions in Kubernetes in the docs [here](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/#pod-selection-for-kubelet-eviction)
