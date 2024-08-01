---
title: "Securing Devcontainers (part 1) - a simple setup with Ruby and Jekyll"
date: 2024-07-24
excerpt: "Securing our devcontainers is addictively easy.  Let's start at a straightforward Ruby and Jekyll workspace for static website development."
tags:
- security
- containers
- devcontainers
---

I work in [devcontainers](https://containers.dev) quite a lot.  It provides many of the benefits of a tool like Python's [virtual environments](https://docs.python.org/3/tutorial/venv.html), with the additional upsides of being version-controlled and portable across compute _and_ people.  It can be crucial to keeping as close to **consistent developer experience across domains**[^cdd].

Given the complex questions I’ve seen about **building them while minimizing cybersecurity risk**, this seems like a great topic to dive into.  Let's create a simple one together. 📚

> The end result of this walkthrough is a devcontainer for a simple use case - static website development with Ruby and [Jekyll](https://jekyllrb.com/).  We'll need to build the container and use the `devcontainer.json` file to configure it a bit more than the defaults.
>
> 🚢 Check out the finished [Dockerfile](https://github.com/some-natalie/some-natalie/blob/main/.devcontainer/Dockerfile) and [devcontainer.json](https://github.com/some-natalie/some-natalie/blob/main/.devcontainer/devcontainer.json) if you're impatient.
{: .prompt-tip }

## Security concerns slow adoption

I'll own my bias - **I love devcontainers.**

It's a repeatable way to predefine a development environment with ease-of-use as a priority.  It **defines everything as code** that can be reviewed and **eliminates configuration drift** on endpoints or VMs.  When anything gets messed up, it's incredibly fast to reset to a working state on any machine that can run a container.

However, adoption feels sluggish despite the benefits.  I frequently field security questions around using containers for developer environments from teams hesitant to try it out, even on self-hosted infrastructure.  It's true there are some security concerns to note, such as:

- allowing a user interactive access inside the container
- that user may be privileged or running as root, which is pretty common on base images
- that user may be able to modify software
- it could be possible to start network connections
- keeping it updated with security patches is still a thing that must be done - just like endpoints and VMs

These are all solvable problems. 🤔

## Writing our Dockerfile

We'll start with the latest development image for Ruby.  This image includes a shell and the ability to add some packages, which we'll need to get up and running.

```dockerfile
FROM cgr.dev/chainguard/ruby:latest-dev

# Environment variable for system
ENV GEM_HOME=/usr/local/vendor
ENV GEM_PATH=${GEM_PATH}:/usr/local/vendor
ENV PATH=${GEM_HOME}/bin:${PATH}
ENV LANG C.UTF-8
```
{: file='~/.devcontainer/Dockerfile' }

Now we'll add a few dependencies.

- `posix-libc-utils` and `libstdc++` are needed for [VS Code's server](https://code.visualstudio.com/docs/remote/vscode-server), responsible for allowing connectivity between the container and VS Code.
- `dumb-init` provides a lightweight init script to run as `PID 1`.  This allows you to have failed processes inside your container without the host beliving the entire container failed (and perhaps terminating your session's devcontainer).
- `git` and `git-lfs` are for version control.  Not _strictly_ necessary for a devcontainer, but needed to use git to pull/commit/push code.
- `curl` is for downloading files, which I need to do for making a static website.

The last command, `ldconfig`, reloads the dynamic links in the container.  This is necessary to make sure the new libraries (`posix-libc-utils` and `libstdc++`) are usable by VS Code server.

```dockerfile
# Switch to root
USER root

# Install vscode dependencies + git + curl, reload dynamic links
RUN apk update \
  && apk add --no-cache \
  posix-libc-utils \
  libstdc++ \
  dumb-init \
  git \
  git-lfs \
  curl \
  && ldconfig
```
{: file='~/.devcontainer/Dockerfile' }

Now we'll update and install the gems we need for Jekyll.  Once that's done, we’ll change the ownership of these directories to the `nonroot` user (default for this image) and switch to it.

```dockerfile
# Update gems
RUN echo "gem: --no-ri --no-rdoc" > ~/.gemrc
RUN yes | gem update --system && gem cleanup
RUN yes | gem install jekyll bundler && gem cleanup
RUN chown -R nonroot:nonroot /usr/local/vendor

# Switch back to non-root user
USER nonroot
```
{: file='~/.devcontainer/Dockerfile' }

## Creating our JSON file

With the container defined above, now we need to configure our devcontainer.  Below is the file with comments explaining each part.

```jsonc
{
  "name": "Jekyll website",
  // Use the Dockerfile in this folder to build every time
  "build": {
        "dockerfile": "Dockerfile",
        "args": {}
    },
  // If this is prebuilt and stored in an internal registry, use this instead
  // "image": "registry.company.us/jekyll-website:latest",
  //
  // Forward the website port
  "forwardPorts": [4000],
  "portsAttributes": {
    "4000": {
      "label": "Website"
    }
  },
  // Use the "nonroot" user, default for Chainguard images
  "remoteUser": "nonroot",
  // After it's created, run bundle to install dependencies
  "postCreateCommand": {
    "bundle": "bundle install --retry 5 --jobs 20"
  },
  // After it's launched and VS Code is attached, run Jekyll to serve the website
  "postAttachCommand": "bundle exec jekyll serve --host 0.0.0.0"
}
```
{: file='~/.devcontainer/devcontainer.json' }

The only decision here is whether the container is built once and runs the finished image or if it's built on demand each time. I chose the latter to keep my `Dockerfile` and dependencies at `latest`.  This is strictly personal preference.

For more users or more control over dependencies at runtime, it might make more sense to build once and pull each time. This also saves a bit on compute, as the container launches as fast as it can pull versus build. If that’s a priority, comment out the `build` section and use the `image` section to point to the internal container.

> Don't use the `--livereload` option with Jekyll in a GitHub Codespace because it seems to timeout on domain name resolution.  This makes previewing the site impossibly slow.  I haven't been able to reproduce this when running locally or on another container platform, so will assume it to be a random platform oddity. 🤷🏻‍♀️
{: .prompt-tip }

## Defaults improve experience without sacrificing security

🌸 **This devcontainer addresses all of these concerns.** 🌸

- it runs as a non-root user without any privileged access
- while it provides a shell, it can't modify other software via `apk` or `gem`
- it contains no known vulnerabilities[^count] (CVEs) to be exploited
- all exposed network ports are predefined
- it can be rebuilt with updated dependencies as needed by your team/company policy

There's no additional work to address the security objections beyond what's outlined here.  However, this is a really easy example - static site generators are simple, this is a single service without dependencies, and everything floats to `latest` by default.

> Now that we have the basics down, let's make it more ~~difficult~~ realistic by pinning some dependencies and using multiple services for our application in a devcontainer!
{: .prompt-info }

---

## Disclosure

I work at Chainguard as a solutions engineer at the time of writing this.  All opinions are my own.

## Footnotes

[^cdd]: Cross-domain developments.  I see it moving from unclassified to classified systems, but it's also common in industrial control systems and other private-sector networks.
[^count]: Using `grype 0.79.3` on 24 July 2024, there are 0 CVEs found on the image built by this Dockerfile and it's about 650 MB in size.  The previous container I'd used for this is Microsoft's [Ruby devcontainer base image](https://mcr.microsoft.com/en-us/product/devcontainers/ruby/tags) `mcr.microsoft.com/vscode/devcontainers/ruby:3-bullseye` with over 1200 CVEs (including 13 criticals), and is about 1.2 GB in size.
