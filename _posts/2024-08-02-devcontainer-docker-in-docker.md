---
title: "Securing Devcontainers (part 3) - Docker-in-Docker"
date: 2024-08-02
excerpt: "Let's make some dangerous choices safer inside a devcontainer.  Sometimes it just isn't possible to do things 'the right way'.  In hindsight it wasn't possible to avoid 🐳 Docker-in-Docker 🐳, was it?"
tags:
- security
- containers
- devcontainers
- questionable-ideas
---

> Let's make some dangerous choices safer inside a devcontainer.  Sometimes it just isn't possible to do things 'the right way'.  In hindsight it wasn't possible to avoid 🐳 Docker-in-Docker 🐳, was it?
>
> 🚢 The end product is a devcontainer running rootful Docker-in-Docker.  Check out the finished [Dockerfile](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/docker-in-docker/Dockerfile), [startup.sh](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/docker-in-docker/startup.sh) script, and [devcontainer.json](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/docker-in-docker/devcontainer.json) file.
{: .prompt-tip }

## Why this exists

There's one more common devcontainer pattern to consider - using it to define what's more like an easy-to-reset virtual machine instead.  This allows users to modify software, build and run containers, and otherwise do local development activities within a privileged container specifically for this use case.  Granting flexibility to users is critical when the requirements are still vague and fast-moving.

## Dockerfile

Let's start with building the container (to run more containers in), then becoming `root` to install the necessary software.

```dockerfile
FROM cgr.dev/chainguard/wolfi-base:latest

USER root
RUN apk update \
  && apk add --no-cache \
  posix-libc-utils \
  libstdc++ \
  bash \
  git \
  git-lfs \
  curl \
  dumb-init \
  docker-dind \
  fuse-overlayfs \
  && ldconfig
```
{: file='~/.devcontainer/Dockerfile' }

In order, the software installed accomplishes a couple of things.

- `posix-libc-utils` and `libstdc++` are needed for [VS Code's server](https://code.visualstudio.com/docs/remote/vscode-server), responsible for allowing connectivity between the container and VS Code.
- `bash` is a personal preference over `sh`.  A shell is a shell until it isn't and I'll need bash.
- `git` and `git-lfs` are for version control.  Not _strictly_ necessary for a devcontainer, but needed to use git to pull/commit/push code.
- `curl` is for downloading files (and all the other tasks that can be done with curl).
- `dumb-init` provides a lightweight init script to run as `PID 1`.  More on why that's needed in a moment.
- `docker-dind` provides the daemon to run containers.
- `fuse-overlayfs` provides the layering filesystem needed for containers to run.

This package selection seems minimal without impacting basic functionality.  Change the packages as needed to fit the workflow needed.

The last command, `ldconfig`, reloads the dynamic links in the container.  This is necessary to make sure the new libraries (`posix-libc-utils` and `libstdc++`) are usable by VS Code server.

```dockerfile
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

ENTRYPOINT ["dumb-init", "--", "./startup.sh"]
```
{: file='~/.devcontainer/Dockerfile' }

Now copy in a startup script to be run from the init system as an entrypoint.

## Init systems in containers

I add an init system to containers used for devcontainers.  Since a container is, by definition, still a process, any of the child processes can become [zombies processes](https://en.wikipedia.org/wiki/Zombie_process) and take up memory or threaten stability of the host.  It seems counter-intuitive to have one inside of what's usually considered "single use" container, devcontainers are both long-running and may have multiple processes inside of it.  By running as `PID 1`, the init system allows for failed processes inside the container without the host beliving the entire container failed (and perhaps terminating your session's devcontainer or entire build).

We added one during build called [`dumb-init`](https://github.com/Yelp/dumb-init) and use it as our entrypoint script.  This allows us to start any number of other processes or scripts and allow it to reap anything that's completed.

```shell-session
bash-5.2# ps aux
PID   USER     TIME  COMMAND
    1 root      0:00 dumb-init -- ./startup.sh
    7 root      0:00 /bin/bash
    8 root      0:00 dockerd
   19 root      0:00 containerd --config /var/run/docker/containerd/containerd.
  285 root      0:00 ps aux
```
{: file='running processes in our devcontainer' }

## Startup script

The startup script allows users to chain multiple "startup" tasks together without relying on shell operators in a long `ENTRYPOINT` statement.  In this case, we're starting the Docker daemon (`dockerd`), then opening a bash terminal.  Depending on the use case, you can source other scripts and add much more here.

```bash
#!/bin/bash

echo "Starting dockerd"
dockerd >> /dev/null 2>&1 &

# start a shell by default in the CMD
exec "/bin/bash"
```
{: file='~/.devcontainer/startup.sh' }

## Defining our devcontainer

Lastly, there's a few extra settings in our devcontainer to add.  First, even if we chose to use rootless Docker instead, nested containerization must run privileged.

```jsonc
{
    "name": "docker-in-docker",
    "build": {
        "dockerfile": "Dockerfile",
        "args": {}
    },
    "runArgs": ["--privileged"],
    "postStartCommand": "if ! pgrep -x dockerd > /dev/null; then dockerd > /dev/null 2>&1 & sleep 5; fi"
}
```
{: file='~/.devcontainer/devcontainer.json' }

That last entry, `postStartCommand`, starts the Docker daemon.  I found some devcontainer-based "cloud developer environment" products which didn't reliably have the docker daemon running between suspend/resume cycles, so this should cover that case.  This command is completely harmless if it's already running and will attempt to start it if it got overlooked.

## Security isn't gone

I promise you - security isn't completely gone.  No wait, hear me out!

This container is running as privileged, with root access to modify the software inside, and a shell to make it easy.

But under the hood, many of these "cloud developer environments" (both self-hosted and SaaS) are using virtual machines for isolation around that container.  This is usually something like [Firecracker microVMs](https://firecracker-microvm.github.io/).  Meaning all this Dockerfile business is really only defining a virtual machine like we did ~~in the days of yore~~ for many years with thin clients or virtual desktop infrastructure.

Our threat model is substantially different than typical container uses, so our controls are adjusted accordingly for security.  Escaping from a container isn't hard ([some examples](../containers-and-gravy/#demo-time)), but escaping from a reasonably configured virtual machine into the host is substantially more difficult.

> It's a portable container, usually in a VM for safety, defined as repeatable and reviewable code.  What's not to love?
{: .prompt-tip }

---

## Disclosure

I work at Chainguard as a solutions engineer at the time of writing this.  All opinions are my own.
