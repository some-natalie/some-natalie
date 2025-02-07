---
title: "Shrinking container images (part 3) - squash it"
date: 2025-01-09
excerpt: "Some containers are big, but reliably reducing their size isn't difficult or complicated.  Now that we know what goes into an image, let's take one easy step to ship only what's needed - the final product."
tags:
- kubernetes
- kubernoodles
- actions-runner-controller
- security
- containers
---

> Some containers are big, but reliably reducing their size isn't difficult or complicated.  Now that we know what goes into an image, let's take one easy step to ship only what's needed - the final product.
>
> 🌟 [Overview and contents here, if you missed it!](../big-container-images) 🌟
{: .prompt-info}

## What does "squashing" mean?

Rather than compressing every change that happened to get to what you'll actually see, **shipping only the end product is very effective at reducing image size.**  This single layer image is sometimes called a "squash build" as the flag for it used to be called `--squash`[^notquite].

Now, it's done with **multi-stage builds** and that's what I'm walking through here.

![squash-dark](/assets/graphics/charts/overlayfs/squash-dark.png){: .rounded-10 .right .dark}
![squash-light](/assets/graphics/charts/overlayfs/squash-light.png){: .rounded-10 .right .light}

The base image is (almost) never the largest part of the image.  Instead, for these "big container" use cases, it's the software that's added on top and how it's added that are responsible for the vast majority of the finished size.  Given the same set of example container images, **squashing into a single layer can reduce the final image size by about 5-20%.**

## How to ship a single layer image

Now that we've seen how good it can be, let's walk through converting a non-trivial container build into a multi-stage build.  The [full commit diff](https://github.com/some-natalie/kubernoodles/commit/f191b457ad3fdc95d0ab5f2fd7605cde840b081e#diff-4f394818d74220ca1ececef9d259f3a76755b732f1b9ca1c8355d541f0f63200) has all of the changes to all container files to browse.  Since the process is identical regardless of which one we look at, let's be generic.

### Before

The custom runner images we built together in [building custom runner images](../kubernoodles-pt-5/) and [reducing CVEs in actions-runner-controller images](../reduce-cves-arc/) look more or less like this. 👇

```dockerfile
FROM base-image:tag

ARG version=number
ARG diffsoftware=version-number
ENV buildtime=env-var

LABEL many.oci.labels="set"
LABEL yet.more="labels!"

RUN install lots of stuff

COPY in many files

ENV runtime=env-var

USER runner
```
{: file='an example dockerfile for a custom image'}

This produces an image that has many layers and varies between the 1 to 1.4 GB in finished size we started with.

### After

Squashing the build, our Dockerfile now looks like this:

```dockerfile
FROM base-image:tag AS build

ARG version=number
ARG diffsoftware=version-number
ENV buildtime=env-var

RUN install lots of stuff

# now to squish the end result!

FROM scratch AS final

LABEL many.oci.labels="set"
LABEL yet.more="labels!"

ENV runtime=env-var

USER runner

COPY --from=build / /
```
{: file='moving to a multi-stage build'}

Moving a single-stage build into a multi-stage one isn't terribly complicated, but you'll need to know a couple things first.

First, variables (`ENV`) and arguments (`ARG`, `WORKDIR`, `USER`) must to be defined in the stage they're needed at.  This means we need to know our build process and what's needed when.  I moved a few things that are only needed at runtime into the final stage.  Labels are also only needed for the final image, so they were moved down the file as well.

... and that's it.  I moved the order around a bit, but the process is the same.  The `COPY --from=build / /` line is what moves all files from the build stage to the (empty) final stage.  This is what makes the final image a single layer.  I used `scratch` as the base for the final image, meaning everything was copied into a completely blank layer.

## How much did it help?

| image | base size | final image size | size diff | cve count<br>total (crit/high/med+below) |
|---|---|---|---|---|
| ubuntu-jammy | 69 MB | 1.35 GB (before)<br>1.15 GB (squashed) | 200 MB<br>(-15%) | 180 (2/9/169) (before)<br>180 (2/9/169) (squashed) |
| ubuntu-numbat | 100 MB | 1.40 GB (before)<br>1.20 GB (squashed) | 200 MB<br>(-14%) | 97 (2/9/86) (before)<br>97 (2/9/86) (squashed) |
| wolfi | 13.5 MB | 1.39 GB (before)<br>1.14 GB (squashed) | 250 MB<br>(-18%) | 1 (0/1/0) (before)<br>1 (0/1/0) (squashed) |
| ubi8<br>(no container tools) | 245 MB | 996 MB (before)<br>938 MB (squashed) | 58 MB<br>(-6%) | 559 (0/7/552) (before)<br>559 (0/7/552) (squashed) |
| ubi9<br>(no container tools) | 260 MB | 1.01 GB (before)<br>920 MB (squashed | 90 MB<br>(-9%) | 551 (0/7/544) (before)<br>551 (0/7/554) (squashed) |

ℹ️ The `wolfi` image and the `ubuntu` images contain more software - specifically the Docker CLI and Docker Compose.  The `ubi` images do not contain a CLI for interacting with any container engine (remote or locally via nested containerization) on the assumption that folks are opinionated about which container stack to use within the Red Hat ecosystem and will add theirs to this as a base image.

## What is removed?

Taking another peek at the single-stage (multi-layer) image with [dive](https://github.com/wagoodman/dive), attention to the bottom-left corner shows us some interesting places where there's potential wasted space.  In this case, it's that we're using the Wolfi-native versions of .NET and Node, but the GitHub runner agent bundles both of them during install as well.  Here's that output, showing lots of 2 copies of files adding up to the 250 MB of wasted space:

```text
│ Image Details ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────

Image name: single-stage-wolfi-runner:latest
Total Image size: 1.4 GB
Potential wasted space: 389 MB
Image efficiency score: 82 %

Count   Total Space  Path
    2         96 MB  /home/runner/externals/node20/bin/node
    2         62 MB  /usr/share/icu/75.1/icudt75l.dat
    2         26 MB  /usr/share/dotnet/shared/Microsoft.NETCore.App/8.0.11/System.Private.CoreLib.dll
    2         18 MB  /usr/share/dotnet/shared/Microsoft.NETCore.App/8.0.11/System.Private.Xml.dll
    2         18 MB  /usr/share/dotnet/shared/Microsoft.NETCore.App/8.0.11/libcoreclr.so
    2        9.2 MB  /usr/share/dotnet/shared/Microsoft.NETCore.App/8.0.11/System.Linq.Expressions.dll
    2        6.6 MB  /usr/share/dotnet/shared/Microsoft.NETCore.App/8.0.11/libclrjit.so
    2        6.6 MB  /usr/share/dotnet/shared/Microsoft.NETCore.App/8.0.11/System.Data.Common.dll
    2        6.5 MB  /usr/share/dotnet/shared/Microsoft.NETCore.App/8.0.11/libmscordaccore.so
    2        5.1 MB  /usr/share/dotnet/shared/Microsoft.AspNetCore.App/8.0.11/Microsoft.AspNetCore.Server.Kestrel.Core.dll
```
{: file='dive output for the single-stage-wolfi-runner image'}

The final build stage command to copy everything from the finished one into the empty base image removes the multiple copies of each file that clutter up the image across each layer.  This is what reduces the final size of the image by 250 MB.

## What remained?

**There is no difference in the number of files or vulnerabilities between the single layer "squashed" image and the multi-layer image.**  This is good!  It means that the process didn't hinder the ability of a container scanner to understand what's inside the image.

```shell-session
~ ᐅ grype single-stage-wolfi-runner:latest
 ✔ Loaded image                               single-stage-wolfi-runner:latest
 ✔ Parsed image                    sha256:5d9a933cc092166f7c54f51a2691135d426b
 ✔ Cataloged contents              3866aff2a22dd2d7211c34f3ad177aa9baf5d5aecdd
   ├── ✔ Packages                        [1,085 packages]
   ├── ✔ File digests                    [5,540 files]
   ├── ✔ File metadata                   [5,540 locations]
   └── ✔ Executables                     [811 executables]
 ✔ Scanned for vulnerabilities     [1 vulnerability matches]
   ├── by severity: 0 critical, 1 high, 0 medium, 0 low, 0 negligible
   └── by status:   1 fixed, 0 not-fixed, 0 ignored
NAME         INSTALLED  FIXED-IN  TYPE  VULNERABILITY        SEVERITY
cross-spawn  7.0.3      7.0.5     npm   GHSA-3xgq-45jj-v275  High

~ ᐅ grype multi-stage-wolfi-runner:latest
 ✔ Loaded image                                multi-stage-wolfi-runner:latest
 ✔ Parsed image                    sha256:3e8dba1aa61daedcf381bc991a352a51f034
 ✔ Cataloged contents              0b77965cbc12b28a46e6fc007f6e731f37b9cdb7bf1
   ├── ✔ Packages                        [1,085 packages]
   ├── ✔ File digests                    [5,540 files]
   ├── ✔ File metadata                   [5,540 locations]
   └── ✔ Executables                     [811 executables]
 ✔ Scanned for vulnerabilities     [1 vulnerability matches]
   ├── by severity: 0 critical, 1 high, 0 medium, 0 low, 0 negligible
   └── by status:   1 fixed, 0 not-fixed, 0 ignored
NAME         INSTALLED  FIXED-IN  TYPE  VULNERABILITY        SEVERITY
cross-spawn  7.0.3      7.0.5     npm   GHSA-3xgq-45jj-v275  High
```
{: file='grype output for each, showing the exact same number of files and vulnerabilities'}

> There is no difference in security, configuration, or functionality between the "pre-squashed" multi-layer images and the new single-layer images.  The only difference is the final size.
{: .prompt-tip}

## Audit concerts

Last (and most importantly), there are always a couple audit and compliance questions that come up every time I talk about single-layer builds.  It seems like we're "losing" some part of the history between our code and our production environment, but we're not.  Here's all our other controls that should still be in place:

- The code used to build our containers is version controlled, usually in a git repository.
- That git repository is audited and monitored for changes.  It uses pull requests and code reviews to ensure that changes are reviewed before they're merged.
- Our build logs are forwarded to a logging service for retention, searching, etc.
- All the artifacts that the builds pull in are also stored in a registry, so we can see what was used to build the image and when.  Configuring our base images to use internal registries is a good practice to ensure that we're not pulling in untrusted or unverified software.  `curl | bash` is not a good practice. 🙈
- Nothing we do here is changing how any security software works.  The packages and file system are still intact, so the container vulnerability scanner can still do its job.
- The end product of the build is still going into the internal registry at the end of the process, [signed and attested](../signing-attesting-builds).  This is what gets verified and deployed into production.

**We are losing the filesystem snapshots at each step of the build process, but our container execution is still only seeing the final image layer.**  Having layers can make the build process more efficient and allow reuse of layers (eg, `RUN install-some-stuff`) across many builds on shared node storage.  Spending a little time at the end to ship a single layer doesn't change our build efficiency or layer caches, as building and running are two different tasks.

> Single-layer images from a multi-stage build are simple to implement.  They effectively reduce the final size of the image, yet don't alter the security posture in either direction.
>
> 🪄 **Next up** - Actually knowing what I'm doing and running is hard.  Is there a magic shortcut I can take?  [Part 4: Slimming big builds](../slim-big-builds)
{: .prompt-info}

---

## Footnotes

[^notquite]: So ... this isn't exactly how the original `--squash` flag worked.  It used to be a build flag that'd compress the layers into one.  It's been deprecated in favor of multi-stage builds, which are more flexible.  I've shown using `scratch` (or an empty image) as the "base" to the final build but it could be other images instead.  The term "squash" is still used to describe the process of reducing the number of layers in a container image, even if the flag isn't used.
