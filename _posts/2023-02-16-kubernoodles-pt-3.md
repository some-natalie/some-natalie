---
title: "What are your users really doing within GitHub Actions?"
date: 2023-02-16
categories:
  - blog
tags:
  - kubernetes
  - kubernoodles
  - actions-runner-controller
  - observability
classes: wide
excerpt: "(Kubernoodles, part 3 of ?) - eBPF + actions-runner-controller = 💖 pure o11y love 💖"
---

One of the first questions to answer when building out GitHub Actions compute on premises is "how do I know what my users are doing?"

In an old-school persistent-machine setup, this isn't a problem _at all_ - for Actions or any other system.  Install the company's anti-virus program, endpoint protection stuff, logging stack, etc. like literally every other machine on the network and everyone is good to go.  Likewise, if continuous integration is already a service, a lot of that risk is already handled for you by that SaaS provider.  Once we combine putting these jobs into ephemeral containers **and** self-hosting this platform, the question gets a lot harder to answer.

![dodgy-users](../../assets/graphics/2023-02-16-kubernoodles-pt-3/dodgy-users.png)

> I'm far more offended by `curl -k | bash` than at any attempt of container escape.  Disabling SSL verification is never the answer.

This is a difficult situation for an actions-runner-controller setup due to several compounding factors.

1. The jobs are run in ephemeral containers ... so they go away after each and every job.  It prevents job cross-contamination _and_ makes logs hard to gather after the fact.  Even if you capture the pod logs, it isn't a definitive source of everything that was done - only what was printed to `STDOUT` and `STDERR` from the pod.
1. GitHub Actions isn't built for _that_ kind of observability.  It's fundamentally a tool to run jobs and will print logs out that can be used for task-level debugging, etc. but not give you deep visibility into the infrastructure that job is run on or broad understanding of all jobs being run.  Given the huge variety of stuff that an agent can be installed on, it's an impossible problem to solve for within itself.
1. Because this is (usually) a co-tenanted Kubernetes cluster - meaning that several teams within a company are sharing resources - keeping everyone in the boundaries of their cozy pod is important for the security and integrity of the entire build system.
1. And privileged pods are very common running build jobs in Kubernetes for reasons [covered previously](../securing-ghactions-with-arc/#cluster-settings), making it easier to escape and do silly things. :clown_face:

Some information from our infrastructure to create a complete picture of who's doing what.  In the cluster setup ([part 1](../kubernoodles-pt-1)), we added a custom container network interface and installed [Cilium](https://cilium.io/) and Hubble to start our journey on Kubernetes observability.  Now we're going to use those, plus [Tetragon](https://github.com/cilium/tetragon), to get a customizable look at what users are really doing inside of our runners.  We can know things like

- Process starts, arguments, exits and exit codes
- File opens/closes, reads and writes
- Network connections established
- Capability escalations
- Syscalls made from within the container
- [and so much more](https://github.com/cilium/tetragon/tree/main/crds)

## Installing Tetragon

First, install [Tetragon](https://github.com/cilium/tetragon) into your cluster.  Continuing from our previous parts, it's only the command below as we've already installed Cilium's helm repository.

```console
# Install tetragon
helm install tetragon cilium/tetragon -n kube-system
```

## Install the tetra CLI

Tetragon will output raw JSON just fine - and if you already know this just needs to be shipped into your SIEM, there's probably not much need for looking at things locally.  To get the pretty stuff at the CLI, we need the local CLI utility.  Go to the link below, download the latest release for your architecture, and install.

[https://github.com/cilium/tetragon/releases/latest](https://github.com/cilium/tetragon/releases/latest)

Next, on a Mac, tell it to let you launch it.

```shell
xattr -dr com.apple.quarantine /usr/local/bin/tetra
```

## Figure out what you want to know

I'm rolling with the defaults, plus privileged access and TCP network connectivity.  There's tons of other examples to use [here](https://github.com/cilium/tetragon/tree/main/crds/examples) - for the sake of simplicity and not _too_ much in the logs for a proof of concept, I'm going to omit file access.  I think trying to understand every read/write, open, and close of every file could get uniquely noisy in build jobs too, versus other uses of containers.

This configuration will tell me the following

- Which processes are run, with what arguments, and their exit codes
- Which network connections are established and where
- If any pods are executing in a privileged namespace

Let's turn on privileged access by following [these directions](https://github.com/cilium/tetragon/tree/main#privileged-execution).  Then, enable network logging with the following CRD.

```console
# TCP network connectivity CRD
kubectl apply -f https://raw.githubusercontent.com/cilium/tetragon/main/crds/examples/tcp-connect.yaml

# Open DNS requests CRD
kubectl apply -f https://raw.githubusercontent.com/cilium/tetragon/main/examples/tracingpolicy/open_dnsrequest.yaml
```

## Dodgy users are up to no good

Start streaming the logs into `stdout` and pipe them into the Tetra CLI for the `runners` namespace.

```console
kubectl logs -n kube-system -l app.kubernetes.io/name=tetragon -c export-stdout -f | tetra getevents -o compact --namespace runners
```

Start the job we created in [part 2](../kubernoodles-pt-2/#leave-the-runner-up-for-inbound-connection) that creates an idle pod for an hour to do random fun stuff inside.  Now, let's `exec` in and do some shifty shenanigans!

```shell
kubectl exec -i -t -n runners defaults-xh5cc-runner-8w4hb -c runner -- sh -c "clear; (bash || ash || sh)"
```

And here's the output of some fun commands _within_ the pod.

```console
root@defaults-xh5cc-runner-8w4hb:/actions-runner# whoami
root

root@defaults-xh5cc-runner-8w4hb:/actions-runner# ls -la /
total 80
drwxr-xr-x   1 root root 4096 Feb 16 22:11 .
< ... lots more stuff got truncated ... >
drwxr-xr-x   1 root root 4096 Feb  8 13:00 var

root@defaults-xh5cc-runner-8w4hb:/actions-runner# mount /dev/sda2
mount: /dev/sda2: can't find in /etc/fstab.
```

And here's what's streamed to the logs immediately - our presence has been noted! :bangbang:

```console
🚀 process runners/defaults-xh5cc-runner-8w4hb /bin/sh -c "clear; (bash || ash || sh)"
🚀 process runners/defaults-xh5cc-runner-8w4hb /usr/bin/clear
💥 exit    runners/defaults-xh5cc-runner-8w4hb /usr/bin/clear  0
🚀 process runners/defaults-xh5cc-runner-8w4hb /bin/bash
📤 sendmsg runners/defaults-xh5cc-runner-8w4hb /actions-runner/bin/Runner.Worker tcp 10.0.5.240:0 -> 13.107.42.16:443 bytes 35
🧹 close   runners/defaults-xh5cc-runner-8w4hb /actions-runner/bin/Runner.Worker tcp 10.0.5.240:0 -> 13.107.42.16:443
🧹 close   runners/defaults-xh5cc-runner-8w4hb /actions-runner/bin/Runner.Worker tcp 10.0.5.240:0 -> 13.107.42.16:443
🚀 process runners/defaults-xh5cc-runner-8w4hb /usr/bin/whoami
💥 exit    runners/defaults-xh5cc-runner-8w4hb /usr/bin/whoami  0
📤 sendmsg runners/defaults-xh5cc-runner-8w4hb /actions-runner/bin/Runner.Listener tcp 10.0.5.240:62695 -> 13.107.42.16:443 bytes 2370
📤 sendmsg runners/defaults-xh5cc-runner-8w4hb /actions-runner/bin/Runner.Listener tcp 10.0.5.240:1256 -> 13.107.42.16:443 bytes 2533
🚀 process runners/defaults-xh5cc-runner-8w4hb /bin/ls -la /
💥 exit    runners/defaults-xh5cc-runner-8w4hb /bin/ls -la / 0
📤 sendmsg runners/defaults-xh5cc-runner-8w4hb /actions-runner/bin/Runner.Worker tcp 10.0.5.240:0 -> 13.107.42.16:443 bytes 35
🧹 close   runners/defaults-xh5cc-runner-8w4hb /actions-runner/bin/Runner.Listener tcp 10.0.5.240:0 -> 13.107.42.16:443
🚀 process runners/defaults-xh5cc-runner-8w4hb /bin/mount /dev/sda2
💥 exit    runners/defaults-xh5cc-runner-8w4hb /bin/mount /dev/sda2 1
```

The full log, if you're interested, is [here](../../assets/logs/kubernoodles-log1.txt).

## Next

Automating our runner deployments to make development easier - [part 4](../kubernoodles-pt-4)
