---
title: "Speaking"
order: 7
icon: fas fa-fw fa-microphone
---

Natalie is a principal solutions engineer at Chainguard serving the public sector market. She spent years designing, building, and leading complex systems in regulated environments at a major systems integrator, but has also taken her career in many other directions - including detours into project management, systems engineering, and teaching.  

She's passionate about diversity in technology and empowering engineers to build better.

🎤 [Sessionize profile](https://sessionize.com/some-natalie/)

---

## 2024

### Whodunnit?  A Git Repository Mystery

![bsides-boulder-2024](/assets/graphics/speaking/bsides-boulder-2024.png){: .w-50 .right .shadow .rounded-10}

[BSides Boulder](https://bsidesboulder.org) (14 June) - With all the recent focus on software supply chain security, let's look at the very far left of this process - **how does git know who did what, when, where, and why?** ([Abstract](https://sessionize.com/s/some-natalie/whodunnit-git-repository-mysteries/93884) on Sessionize)

It seems straightforward to assume that you have all of this information in a git repository, but that's probably not the case.  In this talk, we'll walk through how to determine the answers to each of these questions, edge cases and technical gotchas to watch out for, and why each are important to your company's security posture.

Slides with expanded write-up ([as presented](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2024-06-14_Bsides-Boulder-Git-Audit-Whodunnit.pdf))

  1. [Introduction](../blog/git-code-audits), threat model, and biases I have
  1. [Configuration matters](../blog/git-config-audits) to consider
  1. [Identity is hard](../blog/git-identity) to demonstrate, especially distributed
  1. [Tips for auditing changes in git](../blog/git-what-changed) - some common ways to not prove what happened and other weird conversations
  1. [Time is meaningless](../blog/git-time) and other terrible misunderstandings about how git understands time

### A Gentle Intro to Container Escapes and No-Clump Gravy

[PancakesCon 5](https://pancakescon.com/2024-conference-information/) (24 March) - Lots of security and sysadmin courses talk about a "container escape", but what is that _really_?  We'll go over what a container is, demonstrate how to escape from it, and why that's not a good thing.  Then we'll talk about common ways to prevent this exploit.

Next, stop ruining your gravy, pan sauces, etc. with clumpy flour or adding so much it becomes solid.  Learn how to balance fat and flour for perfect pan gravy, then a couple techniques on how to recover just in case it wasn't right the first time. 👩🏻‍🍳

- [Slides](../blog/containers-and-gravy/), with writeup and links
- [YouTube](https://youtu.be/Mj29HnlrraY)

## 2023

### Threat Modeling the GitHub Actions Ecosystem

![bsides-boulder-2023](/assets/graphics/speaking/bsides-boulder-2023.JPG){: .w-50 .right .shadow .rounded-10}

[BSides Boulder](https://bsidesboulder.org) (23 June) - A tour through the four questions outlined in the [Threat Modeling Manifesto](https://www.threatmodelingmanifesto.org/) to provide an enterprise-ready threat model for implementing GitHub Actions securely.  GitHub Actions is one of the most popular CI tools in use today. If you need or want to use it for business, though, there are a lot of choices to make that have huge implications to the information security and compliance posture of your organization. These questions get harder with more users and projects, moving faster and not prioritizing security.

In this talk, we'll dive deep into what an Action really is, what goes into an Action out of the marketplace, and how each of the three types of Action can be exploited with a demonstration. With each exploit, a few control strategies will be discussed to counter it.

- Abstract on [Sessionize](https://sessionize.com/s/some-natalie/threat-modeling-the-github-actions-ecosystem/68736)
- [Slides](../blog/threat-modeling-actions), with writeup and links
- [YouTube](https://youtu.be/Bk8KpeLs8Mo)

### Securing Self-Hosted GitHub Actions with Kubernetes and Actions-Runner-Controller

![cncf-cnsc2023](/assets/graphics/speaking/cncf-cnsc2023.JPG){: .w-50 .right .shadow .rounded-10}

[CNCF CloudNativeSecurityCon North America](https://events.linuxfoundation.org/cloudnativesecuritycon-north-america/) (1 Feb) - A deep dive into the security considerations of running self-hosted GitHub Actions compute with [actions-runner-controller](https://github.com/actions/actions-runner-controller).  We'll review typical deployment architectures, then cover 3 distinct places where security risk and ease of use collide with insight and resources for navigating these design choices. First the cluster settings are examined to show methods to limit the "blast radius" of a potential bad actor and provide insight into the why and how of using privileged pods. Next, the controller settings are reviewed for how to scope runner deployments and grant permissions within GitHub to provide least-privilege. Lastly, the runner pod is taken apart to show how to build supply chain security into the image and the software it builds for you.

- [Slides](../blog/securing-ghactions-with-arc/), with writeup and links
- [YouTube](https://youtu.be/Ax4VPm2KrqQ)

---

## 2022

### Containerized CI at an Enterprise Scale

[Colorado Kubernetes & Cloud Native](https://www.meetup.com/colorado-kubernetes-cloud-native/) (21 Nov) - Let's summarize what to think about as an enterprise moving continuous integration workloads into containers orchestrated with Kubernetes - everything from the benefits and drawbacks of nested virtualization to the how and why of privileged pods - from the perspective of having done the thing a few times over!

- [Slides](../blog/kubernetes-for-enterprise-ci/), with writeup and links

### Linux Software Packaging, maybe in a nutshell

[Boulder Linux/Unix User Group](https://www.meetup.com/Boulder-Linux-Unix-User-Group/) (8 Sept) - A quick tour through the history of packaging software in Linux - moving from compiling it at each computer using it, to RPM and DEB packages, to snaps/flatpaks and containers on the desktop.  This was a very interactive demo/talk at about an hour and the conclusion changes every time, but it's sadly unrecorded.

- [Slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2022-09-08_BLUG-Linux-Software-Packaging.pdf)
- [Makefile example](https://github.com/beagleboard/linux/blob/master/Makefile) for going through a modestly complex Makefile
- [RPM file example](https://koji.fedoraproject.org/koji/buildinfo?buildID=2058325) walking through the process of building RPMs from the source RPM
- [DEB file example](https://packages.debian.org/buster/libopenscap8) walking through the contents and process of building DEBs from a source tarball

---

## 2021

### Goobernetes

... or building GitHub Actions compute on-premises without (many) tears (14 Oct) at the [Boulder Linux/Unix User Group](https://www.meetup.com/Boulder-Linux-Unix-User-Group/)

- [Video](https://vimeo.com/637158846)
- [Slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2021-10-14_Goobernetes.pdf)
- [Source code](https://github.com/boozallen/goobernetes)

> The above source code repository isn't maintained.  Please look to [kubernoodles](../kubernoodles) for a newer take on the same problem.
{: .prompt-info }

---

## 2020

### Getting Started in DevSecOps in a Regulated Environment

[DevSecOps Days Denver 2020](https://www.devsecopsdays.com/2020-devsecops-days-denver) (29 Oct) - Natalie has worked with a great number of teams within system integrators as they've integrated security into their software engineering processes. Given the opportunity to work with such a diverse group of teams, she's found a couple of common traits in teams that thrive in delivering secure software in a regulated environment.

- [Video](https://www.youtube.com/watch?v=ugDaAnXDp1Q)
- [Slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2020-10-29_Getting-Started-w-DevSecOps-Regulated-Environment.pdf)
