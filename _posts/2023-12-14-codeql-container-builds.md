---
title: "Adding CodeQL to your (compiled) container build"
date: 2023-12-14
classes: wide
excerpt: "Using CodeQL inside of a containerized build for compiled languages"

categories:
  - blog

tags:
  - linux
  - codeql
  - github-actions
  - kubernetes
---

I have my build compiling inside of a container ... now I want to scan it with [CodeQL](https://codeql.github.com), too.

Let's talk through two ways to do that and some anti-patterns to avoid.  Which of these two paths are best depends on if you're using CodeQL within GitHub Actions or with another CI system to orchestrate these container jobs.

For non-compiled code, this is usually a non-issue as the static analysis can happen entirely without the additional steps to compile, link, etc.  Building compiled code within a container provides some level of build immutability[^bi] and removes some of the dependencies of the underlying operating system, as well as other benefits we [outlined].  In this case, it also adds complexity if you want to try to run CodeQL.

## GitHub Actions

Let's use a container for this job!  This uses Docker to create and run tasks within a container.[^muslc]  If you’re self-hosting runners using Kubernetes and [actions-runner-controller](https://github.com/actions/actions-runner-controller), you’ll also need to use [runner-container-hooks](https://github.com/actions/runner-container-hooks/blob/main/packages/k8s/README.md#limitations) to avoid Docker-in-Docker.

While this path is exclusive to GitHub Actions as a build system, the container job has a few benefits.  First, the simplicity!  One workflow file is has all tasks for the build inside a single file, making it easier to maintain.  One build workflow can have in-line scripts of various languages, other Actions from the marketplace or internal sources, and a lot more.  This enables the design pattern where an Action is a reusable building block to your pipeline, not lots of bespoke tasks to maintain within it.

Here's an example:

{% raw %}
```yaml
name: CodeQL in a container job

on:  # edit this to run when you actually need it
  workflow_dispatch:  # run on demand, as this is a proof of concept

jobs:
  build-fc39:  # or whatever you want to call it
    runs-on: jammy-64core  # big runners for 🚀 faster builds 🚀
    permissions:
      contents: read # checkout the code
      security-events: write # to upload SARIF results
    container:  # example uses short name, can use full names instead
      image: fedora:39  # the base image to run this all in
      credentials:  # creds if this image is in a private registry
        username: ${{ github.actor }}  # edit as needed
        password: ${{ secrets.github_token }}  # edit as needed
    name: Build Fedora 39 kernel with ACS override patch
    steps:
      - name: Other steps as pre-compile prep
        shell: bash
        run: |
          # lots of pre-build steps needed to
          # compile this project go here
          # 
          # as many steps as needed

      - name: Setup CodeQL  # initialize CodeQL binary
        uses: github/codeql-action/init@v2
        with:
          languages: cpp  # change to language you need
          threads: 62  # set to an appropriate value
          ram: 250000

      - name: Build the RPMs  # the actual compile step!
        shell: bash           # edit as needed, of course
        run: |
          cd ~/rpmbuild/SPECS && \
          rpmbuild -bb kernel.spec --without debug --without debuginfo \
            --target x86_64 --nodeps

      - name: Perform CodeQL Analysis  # analyze and upload the SARIF
        uses: github/codeql-action/analyze@v2
        with:
          threads: 62  # set to an appropriate value
          ram: 250000
```
{: file='~/.github/workflows/codeql.yml'}
{% endraw %}

By default, the `github/codeql-action/init` step will use a specific version of the CodeQL bundle.  This is installed already on GitHub's hosted runners unless you specified a different version.  For self-hosting GitHub, use the [codeql-action-sync-tool](https://github.com/github/codeql-action-sync-tool) to grab the latest binaries and Action for local use.  This helps reduce ingress bandwidth usage at scale.  The `github/codeql-action/analyze` step will use the [workflow token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) to upload the SARIF results back to GitHub ([source code](https://github.com/github/codeql-action/blob/main/analyze/action.yml#L12-L20)), so no additional credential management should be necessary.

## Another CI system

Without GitHub Actions providing some handy abstractions for simplification, it's still quite possible to run CodeQL within a containerized build.  You’ll just need a few more files to complete the task.

First, let's add the CodeQL CLI into the build image by adding the following into your Dockerfile.  While it increases your build image size, it decreases runtime by being setup in advance like the other build dependencies.[^size] ([full file](https://github.com/some-fantastic/fedora-acs-override/blob/main/fc38-codeql-action/Dockerfile))

```dockerfile
# Setup CodeQL
ENV CODEQL_HOME /usr/local/codeql-home
RUN mkdir -p ${CODEQL_HOME}

RUN wget -O codeql-bundle.tar.gz https://github.com/github/codeql-action/releases/download/codeql-bundle-v2.15.4/codeql-bundle-linux64.tar.gz && \
    tar -xvzf codeql-bundle.tar.gz && \
    cp -R ./codeql ${CODEQL_HOME}

ENV PATH="${CODEQL_HOME}/codeql:${PATH}"
```
{: file='~/Dockerfile'}

Then use the `entrypoint.sh` script to do any pre-compile steps, compile, and upload the SARIF file.  ([full file](https://github.com/some-fantastic/fedora-acs-override/blob/main/fc38-codeql-action/entrypoint.sh)).  Note that we need to resolve the languages first, then tell CodeQL to watch the `rpmbuild` process and its’ child processes, then do the analysis.

```shell
# Setup CodeQL
codeql resolve languages
codeql resolve qlpacks

# Build and scan the things!
cd ~/rpmbuild/SPECS && \
  codeql database create cpp-database --language=cpp --threads=62 --ram=250000 \
  --command 'rpmbuild -bb kernel.spec --without debug --without debuginfo --target x86_64 --nodeps'

# Analyze the things
cd ~/rpmbuild/SPECS && \
  codeql database analyze cpp-database --threads=62 --ram=250000 \
  --format=sarif-latest --output=cpp-results.sarif
```
{: file='~/entrypoint.sh'}

Lastly, the step above created a SARIF file called `cpp-results.sarif`.  We need to upload that back to GitHub in order to see the results.

Moving this into another build system means you’ll need to figure out a couple more steps that depend on that specific system - mostly, how to get the resulting SARIF file back into GitHub.  That process is detailed at length in the documentation on [using code scanning with your existing CI system](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/using-code-scanning-with-your-existing-ci-system).

> This method also works within GitHub Actions.  It's more complicated than the other path due to having to maintain a large container image containing CodeQL.  It also means you're managing a `Dockerfile`, `entrypoint.sh`, `action.yml`, the workflow itself, and likely more.  A working example of doing exactly this can be found in [this repository](https://github.com/some-fantastic/fedora-acs-override/tree/main/fc38-codeql-action).
{: .notice-info}

## Anti-patterns to avoid

### Kubernetes workload management

For Kubernetes-based compute, I _strongly_ recommend setting your requests and limits to be equal to each other (regardless of the CI system).  While it's true that you can allow this workload's resource usage to grow, it's _also_ true that compilers and static analysis tools tend to use all of the resources available to it.  Setting these two values as equal to each other gives the scheduler information to make sure the job will always go to a node that has enough resources to complete the job - and can then scale nodes as needed in managed clusters.

Don't get skimpy on resources here!  Assume this build and scan task will consume an entire node (eg, assign requests/limits to 7.5 GB for a node that has 8 GB RAM), then pass slightly smaller values to the CodeQL CLI (say, 7 GB) to prevent evictions and terminations to higher priority workloads.  The same thing is true for cores available.

### Virtual machine workload management

Similar to Kubernetes, be explicit in the resources assigned.  Most modern hypervisors support migration of running VMs between hosts.  This process usually involves "freezing" a VM to move and possibly continuing execution within memory, then reconciling differences once it's moved.  This is one more place that this job can fail or slow down exponentially.  Use the same logic as above, but add in using the built-in scheduler to ensure appropriate assignment of VMs (as runners or as Kubernetes nodes) to hardware and disable migration as much as possible.

### Storage

Lastly, this is a workload sensitive to sharing disks with other I/O bound tasks.  Backing this workload with fast storage is key to reducing build and scan times.

Noisy neighbors sharing the same I/O bandwidth is another storage pattern to beware of.  Make good use of the [Kubernetes scheduler](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/) or similar settings for bare-metal hypervisors to ensure that these workloads don't make conflict with each other and run on appropriate resources - either while they're running or by migrating nodes/VMs/whatever between hosts.  No amount of smart scheduling abstractions can break the laws of physics. 😊

![bare-metal](/assets/graphics/memes/bare-metal-k8s.jpg){: .shadow .rounded-10}
_It's not only a bare metal or Kubernetes problem, but there's a lot of opportunities to mess up!_

💖 Happy coding and happy new year! 💖

---

## Footnotes

[^bi]: How much build immutability you get from containerizing your build depends on other factors such as how many dependencies are pinned or within the container, tagging strategies of the container and code it builds, etc.
[^size]: Yes, this adds several GB of container size.  No, big containers are not the worst thing in the world.
[^muslc]: Don't use Alpine or other container distribution based on `muslc` for CodeQL.  More about that in the documentation - [Setting up the CodeQL CLI](https://docs.github.com/en/code-security/codeql-cli/getting-started-with-the-codeql-cli/setting-up-the-codeql-cli#setting-up-the-codeql-cli).
