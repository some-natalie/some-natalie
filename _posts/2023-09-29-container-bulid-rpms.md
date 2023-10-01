---
title: "Building RPMs in containers"
date: 2023-09-29
classes: wide
excerpt: "Building RPM files in containers because version-controlled build environments are amazing!"
categories:
  - blog
tags:
  - linux
  - CI
  - github-actions
---

## Why?

Not everything ships as a container!

![docker-was-made](/assets/graphics/memes/docker.jpeg){: .w-50 .right}

Building software to distribute as RPMs is still really important for a lot of folks - and quite possibly the compute your containers run on.  It’s the basis of Red Hat Enterprise Linux and derivatives, such as [Fedora](https://fedoraproject.org/) and [Amazon Linux](https://docs.aws.amazon.com/linux/al2023/ug/compare-with-al2.html#building-on-fedora).  Lastly, putting your RPM builds into a container allows all sorts of flexibility to use any number of build services and underlying compute more or less agnostically - it’s the same promise as _running_ your applications in a container, but now for building them instead.

I started doing this because GitHub's hosted compute for Actions is all Ubuntu for Linux.  My little open-source project, [fedora-acs-override](https://github.com/some-natalie/fedora-acs-override), builds the kernel as an RPM.  While it’s _technically_ possible that I could do it without a container, Debian-based distributions are pretty bad at RPM stuff for a few reasons.

- different build tools and package management tools
- different system file locations (LSB[^l] tried to fix this, but was abandoned in 2015 or so - Debian never joined but continues to support FHS[^f])
- many spec files are written with dependencies in mind from Red Hat and those package names don’t always translate to Debian

Rather than get caught up in the minutia of file systems and package manager differences to make Ubuntu do something it never intended to do, let’s use containers!

## Building the build container

While [buildah](https://buildah.io/), [podman](https://podman.io/), and [skopeo](https://github.com/containers/skopeo) are all on the default Ubuntu image ([link](https://github.com/actions/runner-images/blob/main/images/linux/Ubuntu2204-Readme.md#tools)) for Actions, I just use Docker because that's what's assumed.  This should work with perhaps only minimal modifications to use the Red Hat container stack instead.

First, a design decision to make - are you building for **idempotency** or are you building for **transience**?  

Idempotent builds are a best practice with a side effect of forcing an explicitly pinned version of each RPM.  This (usually) means that no matter who builds it, where, and when - the resulting software is the same every time.  This has a small downside of _maintaining_ the dependencies that you pin.  This isn’t a problem for single-purpose build containers, as there aren’t many dependencies to update.  At scale, this can be difficult to keep up with.

Transient builds change by design.  In this case, I want to build whatever the latest kernel is every time it's run by another orchestration tool.  To do this, leave all dependencies unpinned.

In either case, this container builds RPMs, so let’s start from a well-established base and then install the things you know about up front.  Here’s an example ([link](https://github.com/some-natalie/fedora-acs-override/blob/main/fc38-action/Dockerfile)):

```dockerfile
FROM fedora:38

# Add RPM Fusion repository for build dependencies
RUN dnf install -y \
    https://download1.rpmfusion.org/free/fedora/rpmfusion-free-release-"$(rpm -E %fedora)".noarch.rpm \
    https://download1.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-"$(rpm -E %fedora)".noarch.rpm \
    && dnf clean all

# Update dnf, see note below!
RUN dnf update -y && dnf clean all

# Install build dependencies for your project(s)
RUN dnf install -y fedpkg fedora-packager rpmdevtools ncurses-devel pesign \
    bpftool bc bison dwarves elfutils-devel flex gcc gcc-c++ gcc-plugin-devel \
    glibc-static hostname m4 make net-tools openssl openssl-devel perl-devel \
    perl-generators python3-devel which kernel-rpm-macros \
    && dnf clean all

# Setup build directory
RUN rpmdev-setuptree

# Set up the entrypoint script, more on this below
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

It’s okay to have a “builder image” per project - and it’s preferable over having one giant container that can build all the projects you’d ever need.  This pattern of smaller build images helps decouple projects packaging RPMs from each other's dependencies while allowing them to share compute.  It makes both the builder image and the software it exists to build easier to understand and control dependencies separately too.[^p]

Add your internal repositories to the boring base, if needed.  It’s okay to prefer open repositories - the mirroring infrastructure that Fedora uses is reliably good at finding the closest and fastest mirror.  By default, these images also have good security defaults out of the box such as requiring signed packages with pre-trusted keys from the project and only using HTTPS for transit.

## Writing your entrypoint script

This script is going to do all the wonderful things for a repeatable build, each step labelled with a comment.  This script is downloading, editing the build file to add a new patch, then building the finished packages.  The first command is only needed for GitHub Actions.  This passes the RPM's semantic version out of the container so we can label the build artifacts with it.

```bash
#!/bin/bash

# Set environment variable
echo "kernel-version=$(dnf list kernel | grep -Eo '[0-9]\.[0-9]+\.[0-9]+-[0-9]+')" >> $GITHUB_OUTPUT

# Download the latest kernel source RPM
koji download-build --arch=src kernel-"$(dnf list kernel | grep -Eo '[0-9]\.[0-9]+\.[0-9]+-[0-9]+.fc[0-9][0-9]')".src.rpm

# Install the latest kernel source RPM
rpm -Uvh kernel-"$(dnf list kernel | grep -Eo '[0-9]\.[0-9]+\.[0-9]+-[0-9]+.fc[0-9][0-9]')".src.rpm

# Install the build dependencies
cd ~/rpmbuild/SPECS/ && dnf builddep kernel.spec -y

# Download the ACS override patch
curl -o ~/rpmbuild/SOURCES/add-acs-override.patch https://raw.githubusercontent.com/some-natalie/fedora-acs-override/main/acs/add-acs-override.patch 

# Edit the spec file with some sed magics
sed -i 's/# define buildid .local/%define buildid .acs/g' ~/rpmbuild/SPECS/kernel.spec
sed -i '/^Patch1:*/a Patch1000: add-acs-override.patch' ~/rpmbuild/SPECS/kernel.spec
sed -i '/^ApplyOptionalPatch patch-*/a ApplyOptionalPatch add-acs-override.patch' ~/rpmbuild/SPECS/kernel.spec

# Build the things!
cd ~/rpmbuild/SPECS && rpmbuild -bb kernel.spec --without debug --without debuginfo --target x86_64 --nodeps
```

Lastly, don't forget to tag and publish your image for reuse.

## Running the container

Next, let's run the container, more or less like so 👇

```shell
podman run -v ~/RPMs:~/rpmbuild/RPMs builder-image-name:tag
```

If all the dependencies are pinned and/or omitted the `yum update` in the entrypoint script, the same container should build the exact same software every single time. 🎉

The volume mount is needed to get the finished RPMs out and onto the host.  This bit isn’t needed if you’re running this via GitHub Actions (and probably other CI systems), as it takes care of bind-mounting container volumes for you.

Substituting `docker` in instead should be simple here too.  This can vary based on your CI system.  There's not much to worry about with GitHub Actions because it passes in a ton of environment variables in automatically for you.  Be deliberate with them elsewhere to have same experience.  From here, those RPM files can be moved into a yum repository server or do whatever else needs to be done.

## Now make it a custom GitHub Action

So we put our builds in a container - now let's shove it into some free compute.  This whole part is completely optional - building RPMs in containers works without any orchestration.

First, create a file called `action.yml` to tell it to build and run that container we've defined.  Since all the inputs and outputs are handled by the container, this can be a very simple file.

```yaml
name: "Build ACS kernel"

description: "Build Fedora 38 kernel RPMs with ACS override patch"

outputs:
  kernel-version:
    description: "The version of the kernel RPMs"

runs:
  using: "docker"
  image: "Dockerfile"
```

Next, use that custom Action in a workflow to build the RPMs and upload them as build artifacts (to later do whatever you need with them).

```yaml
jobs:
  build-fc38:
    runs-on: ubuntu-latest
    name: Build Fedora 38 kernel with ACS override patch
    steps:
      - name: Checkout this repo
        uses: actions/checkout@v4

      - name: Build the Fedora 38 RPMs
        id: build-rpms
        uses: ./fc38-action # wherever that action.yml file is in your repo

      - name: Upload the RPMs as artifacts
        uses: actions/upload-artifact@v3
        with:
          name: kernel-${{ steps.build-rpms.outputs.kernel-version }}-fc38-acs-override-rpms
          path: |
            /home/runner/work/_temp/_github_home/rpmbuild/RPMS/x86_64/
            !/home/runner/work/_temp/_github_home/rpmbuild/RPMS/x86_64/*debug*.rpm
```

This final step happened because I am too ~~lazy~~ busy to maintain my own local build infrastructure for [fedora-acs-override](https://github.com/some-natalie/fedora-acs-override) and don't want to lock my own computer up for hours building either.  I don't want to run servers, don't care how long the build takes, and now my build process is `click button, wait, receive files` - can't get easier than that! 🍹

---

### Footnotes

A much easier path, should I care to run my own infrastructure, would have been to use a Fedora/etc machine with the runner agent on it, then not bother with containers.  I don't want to run my own stuff at home in my free time. 😇

[^l]: Linux Standard Base (LSB), [Linux Standard Base](https://en.wikipedia.org/wiki/Linux_Standard_Base)
[^f]: Filesystem Hierarchy Standard (FHS), [Filesystem Hierarchy Standard](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
[^p]: I still have nightmares about using and instantiating the RHEL [Software Collections](https://access.redhat.com/documentation/en-us/red_hat_software_collections/3/html/packaging_guide/sect-enabling_the_software_collection) per automated node via Puppet before builds on shared VMs.
