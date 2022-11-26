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

This post is slides + commentary from a talk I gave at Cloud Native Colorado on November 21st, 2022 about some of the weird ways you can blow up your cluster and your sanity once continuous integration jobs are added into Kubernetes, lessons learned in how to avoid these problems, and why it's _still_ worth all the effort to containerize your build system.  Once I got the hang of it, it saved me a ton of time and heartache maintaining a shared build infrastructure.

The full deck is [here](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2022-11-21_Cloud-Native-CO.pdf), but we're going to go over it slide-by-slide with more in-depth info and links than possible in an hour of talking.

![slide-01](/assets/graphics/2022-11-21-cloud-native/slide-01.jpg)

![slide-02](/assets/graphics/2022-11-21-cloud-native/slide-02.jpg)

Hi!  I'm Natalie and I talk a lot about making the lives of enterprise admins easier, especially in heavily-regulated environments.  It's continually fascinating how in the very places that need automation the most to make systems safer and faster and more reliable, it can be so much harder to pull it off successfully.  You can find me online at my website, [some-natalie.dev](https://some-natalie.dev), or on GitHub [@some-natalie](https://github.com/some-natalie).

I've made some pretty ~~monumental~~ fun mistakes out of hubris and I'm here to talk to you about some of them I made in my first grown-up, not-a-lab, real users are on this thing(!!!) use of Kubernetes.  I got a chance to design and build a system for [GitHub Actions](https://github.com/features/actions) for the self-hosted environment I led for thousands of users.  The problems I faced turn out to be pretty common, so here's a couple hard-earned lessons.

![slide-03](/assets/graphics/2022-11-21-cloud-native/slide-03.jpg)

([link to the gif](https://media.giphy.com/media/JJhiRdcYfcokU/giphy.gif) that didn't survive turning the slide into a picture)

In working as a sysadmin, my first introduction to systems that build/deploy/maintain code was a series of scripts that ran on a cron job - checking out, building, and updating code on a web server nightly.  It was fun to watch devops transform the idea of "devs make" and "ops execute" into a more unified idea of software _ownership_ - because every system I worked with that followed this pattern was terrifyingly fragile and pretty much everything that came later was an improvement on it.

As these systems scaled, I found myself adjacent to a huge shared Jenkins installation that was kept in line by _dozens_ of Puppet modules.  In wanting to avoid tons of configuration management code in the form of Puppet with the new system using GitHub Actions, I instead went down the path of tons of environment creation code in the form of Docker files.  Still not completely sure how much of an improvement this represents on the code-management front, but the power of ephemeral and version controlled envirnoments saved a phenemonal amount of administration overhead (my time) and developer time by creating reproducible builds.

![slide-04](/assets/graphics/2022-11-21-cloud-native/slide-04.jpg)

I have some biases and want to get those out in the open before we go on.  

First is that people time is almost always more valuable than machine time.  Assuming an average developer in the United States costs approximately $150k per year[^1], that's roughly $75 an hour.  If they're held up on a requested item or support ticket or a [long build](https://some-natalie.dev/blog/waiting-on-bulids/) for a couple hours, this cost adds up fast and is hard to account for.  Even harder to calculate is the retention cost of frustration on slow, heavyweight processes.  Like many in our profession, I have a pretty low tolerance for [toil work](https://cloud.google.com/blog/products/management-tools/identifying-and-tracking-toil-using-sre-principles).  (source linked from the slide [here](https://newsletter.pragmaticengineer.com/p/linkedin-engineering-efficiency))

Next is that simple solutions are better than complex ones, but complex solutions are better than complicated ones.  The source for this is Python's [PEP 20](https://peps.python.org/pep-0020/) - even if I chose a complicated approach to this problem (Kubernetes), at least it was thought through.  It turns out that having a bunch of teams with wildly different dependencies share a system to build their code securely, reliably, and quickly is hard and that makes what "simple" is a sliding scale.  This challenge is at the heart of the anti-pattern we'll visit a couple times throughout the evening.

Much of my career so far has been spent in a business's _cost center_ - things like internal IT departments that cost money and don't bring in any money.  As such, expenditures from software purchases to headcount is a bit of a fight to justify.  The systems I'm describing are typically the responsibility of a team empowering developers, which usually falls into that "cost center" category.  This means that avoiding toil work by automating as much as possible has an outsized impact to quality of life for administrators and for developers.

![slide-05](/assets/graphics/2022-11-21-cloud-native/slide-05.jpg)

(pictured - the reaction to seeing 800 packages listed on `yum update`)

Lack of investment or institutional interest doesn't mean this problem is worth ignoring though.  If every company is a software company[^2], how that software is built becomes critical to the business.

A build environment is like a kitchen.  You can make all sorts of food in a kitchen, not just the one dish that you want at any given time.  With a simple set of tools and time, a dish can transport you anywhere in the world.  If it's just you and some reasonable roommates, you can all agree to a shared standard of cleanliness.  The moment one unreasonable houseguest cooks for the team and leaves a mess, it's a bunch of work to get things back in order (broken builds).  There could also be food safety issues (code safety issues) when things are left to get fuzzy and gross.

Imagine being able to snap your fingers and get a brand new identical kitchen at every meal - that's the power of **ephemeral build environments**.  Now imagine being able to track changes to those tools in that kitchen to ensure the knives are sharp and produce is fresh every single time anyone walks into it - that's putting your build environment in some sort of **version-controlled, infrastructure-as-code solution**.

Without routine maintenance and some supply chain management, most shared build systems eventually end up on the sysadmin's equivalent of _Kitchen Nightmares_.  Sadly, no charismatic know-how shows up to fix everything - but Kubernetes does!

![slide-06](/assets/graphics/2022-11-21-cloud-native/slide-06.jpg)

The first set of problems revolve around nested virtualization - think "Russian nesting doll", but with containers and (hopefully invisible to the users) virtual machines.

![slide-07](/assets/graphics/2022-11-21-cloud-native/slide-07.jpg)

First, let's take a moment to make sure we're all on the same page about terms and such.  This image is from the official Kubernetes docs ([link](https://kubernetes.io/docs/concepts/overview/#going-back-in-time)) and it's well worth the read, since we're here and not in a room together.  On the left is where that system working from a cron job would be, then in the middle would be the system using Jenkins + Puppet on VMs that I'd hoped to improve on, then on the right was what I was hoping for.

The challenge here is that when visibility only goes one-way, resource management gets exponentially more important with each additional layer of abstraction.  A virtual machine hypervisor can see some load and other statistics from each VM it's running and schedule accordingly in the cluster or move it around as needed to balance load across disks/CPUs/etc.  The virtual machine cannot see other tasks running on the cluster machine.  

The same is (mostly) true of pods in Kubernetes.  Pods don't share awareness of all other pods, but the Kubernetes scheduler has an understanding of the resource requirements of tasks and resource utilization of nodes.  However, the Kubernetes scheduler is running within a VM and that isn't talking to the hypervisor and what it wants to put on that shared hardware.  There's great security reasons for keeping this isolation, but I accidentally DDoS'd some other production services with vMotion in the process.

![slide-08](/assets/graphics/2022-11-21-cloud-native/slide-08.jpg)

This is important because fundamentally, on-premises clusters tend to look like this :point_up:.  I didn't have dedicated hardware, but co-tenanted VMs in a hypervisor, meaning that the architecture diagram I ended up with looked more nested than first drawn out.

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
