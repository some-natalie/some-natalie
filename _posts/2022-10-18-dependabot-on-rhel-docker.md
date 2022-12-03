---
title: "Dependabot on Red Hat Enterprise Linux using Docker"
date: 2022-10-18
categories:
  - blog
tags:
  - security
  - dependabot
  - on-premises
  - rhel
  - linux
classes: wide
excerpt: "How to run Dependabot on-premises using Red Hat Enterprise Linux"
---

GitHub makes some assumptions about the container execution environment for Actions that aren't always true for self-hosted environments.  This is frustrating if you need or want to stay within one Linux ecosystem on-premises.  Here's how to get Dependabot working with self-hosted GitHub Actions runners and Docker in the latest minor releases of RHEL 7, 8, and 9 - 7.9, 8.6, and 9.0 as of October 2022.

First, leave SELinux alone.  I know the first thing we all do when something doesn't work is disable it, but really - let it work!  I promise it isn't the problem.

```console
$ sudo getenforce
Enforcing
```

_(For RHEL 8 and 9 only)_ Next, let's check `firewalld` settings for what the firewall backend is.  We need it to be using `iptables`, which isn't the default for all versions of RHEL - so let's change that with a little bit of `sed` magic.[^1]

```console
$ sudo cat /etc/firewalld/firewalld.conf | grep FirewallBackend
# FirewallBackend
FirewallBackend=nftables

$ sudo sed -i 's/FirewallBackend=nftables/FirewallBackend=iptables/g' /etc/firewalld/firewalld.conf

$ sudo cat /etc/firewalld/firewalld.conf | grep FirewallBackend
# FirewallBackend
FirewallBackend=iptables
```

Now let's install the latest version of Docker Community Edition.  More about using Docker and not Podman [below](#why-not-podman).

```console
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install docker-ce -y
sudo systemctl enable docker --now
sudo usermod -aG docker azureuser
```

> :information_source: Yes, that's the CentOS repository, not RHEL.  Docker only publishes official RPMs for RHEL for the IBM z platform (`s390x` CPU architecture) - which coincidentally, GitHub does not publish a runner agent for.  The `x86_64` binaries work just fine in RHEL.

Now let's reboot for both the new firewall backend and for the new user group to take effect.  Log back in and test that Docker is working.

```console
$ docker run hello-world
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
2db29710123e: Pull complete
Digest: sha256:18a657d0cc1c7d0678a3fbea8b7eb4918bba25968d3e1b0adebfa71caddbc346
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
```

Start the GitHub runner agent with the "dependabot" label and enjoy successful workflows.  You can read more about using and running Dependabot on-premises in the [documentation](https://docs.github.com/en/enterprise-server@latest/admin/github-actions/enabling-github-actions-for-github-enterprise-server/managing-self-hosted-runners-for-dependabot-updates).

Here's how this looks if you start the agent in the foreground.  To use the runner agent as a service, follow [these directions](https://docs.github.com/en/enterprise-server@latest/actions/hosting-your-own-runners/configuring-the-self-hosted-runner-application-as-a-service).

```console
$ ./run.sh

√ Connected to GitHub

Current runner version: '2.293.0'
2022-10-17 15:00:01Z: Listening for Jobs
2022-10-17 15:00:21Z: Running job: dependabot
2022-10-17 15:03:28Z: Job dependabot completed with result: Succeeded
```

:tada: Now let Dependabot do its magic, taking the chore out of updating your dependencies.

![dependabot-prs](/assets/graphics/2022-10-18-dependabot-prs.png)

### Why not Podman?

It's not feasible to use rootless Podman here.  The [github/dependabot-action](https://github.com/github/dependabot-action) creates two containers for the duration of each run that need to talk to each other and to the internet, which isn't Podman's default.  It's possible to try and intercept each run and connect them to the network successfully, but that's not automatic.  The Action assumes container networking works similar to Docker, where containers can talk to each other and outbound by default.

### Ephemerality

It's possible, but not advisable, to use [ephemeral self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/autoscaling-with-self-hosted-runners#using-ephemeral-runners-for-autoscaling) for Dependabot.  The [github/dependabot-action](https://github.com/github/dependabot-action) pulls approximately 4 GB of Docker images if those images aren't already present on the runner.  This drives up your bandwidth usage and can possibly get your IP address space rate-limited.

---

#### Footnotes

[^1]: It's probably possible to get the Docker Engine using `nftables` instead, but according to the [official documentation](https://docs.docker.com/network/iptables/), it's assuming `iptables`.
