---
title: "Actions Workflows to Test Custom Runners"
date: 2023-02-14
categories:
  - blog
tags:
  - kubernetes
  - kubernoodles
  - actions-runner-controller
classes: wide
excerpt: "(Kubernoodles, part 2 of ?) - Create a few Actions to test, scale, and debug our self-hosted runners."
---

Now that we have a working Kubernetes cluster with the new actions-runner-controller scaling set of runners using the default image ([Dockerfile](https://github.com/actions/runner/blob/main/images/Dockerfile) and [image](https://github.com/orgs/actions/packages?repo_name=runner)), let's create a couple of GitHub Actions that we'll use to test it out as we continue building our own custom images and other features within the cluster.

- [Automatic scaling](#test-automatic-scaling)
- [Runner debug info](#print-debug-information-from-the-runner)
- [Idle runner for connections](#leave-the-runner-up-for-inbound-connection)
- [Container mode](#test-container-mode)

These workflow files should work as-is, dropped in the `~/.github/workflows/` directory of the repository that you're using to control your images and deployments of ARC.  These tests assume that the runner can provision and start correctly, then attach to GitHub (cloud/server), then accept/run a job - so a decent amount of troubleshooting can still take place in cluster/pod logs before getting this far.

## Test automatic scaling

First thing to test is the automatic scaling - we want it to scale up and down to the limits defined in the deployment.  There's a few things we want to know from this test.

- How long does it take to scale up/down?  This is important to know for custom images to deploy up and down quickly and keep user wait times down.
- Scale large sets of runners to generate "peaky" loads for our other cluster features - logging, lots of noisy tasks, scaling the cluster nodes as well as the pods, etc.
- Add other Actions to run on large sets for simulating load, random user builds, etc.

Here's the workflow, with comments explaining what going on.

{% raw %}
```yaml
name: 🐿️ ARC-2 fast scaling test

on:
  workflow_dispatch:  # run on demand
    inputs:
      target-scale-set:
        description: "Which scale set to test?"
        type: string
        required: true

jobs:
  hello-world:
    runs-on: ${{ github.event.inputs.target-scale-set }}  # use the set we specify
    strategy:
      matrix:  # generate 25 jobs by default
        number: [1, 2, 3, 4, 5]
        letter: [a, b, c, d, e]
    steps:
      - name: Hello world  # print a thing, should take a couple seconds to run
        run: |
          echo "Hello world"
          echo "Number: ${{ matrix.number }}"
          echo "Letter: ${{ matrix.letter }}"
```
{: file='~/.github/workflows/arc2-test.yml'}
{% endraw %}

## Print debug information from the runner

The next important data to gather is to print some basic debug information from the runner for easy viewing in the workflow logs.  This saves a few steps later on as we build and run custom images to print out some environment variables and understand the user properties of the container's processes.

```yaml
name: 🐿️ ARC-2 debug

on:
  workflow_dispatch:
    inputs:
      target-scale-set:
        description: "Which scale set to test?"
        type: string
        required: true

jobs:
  debug-info:
    runs-on: ${{ github.event.inputs.target-scale-set }}
    steps:
    - name: "Environment variable dump"
      shell: bash
      run: |
        printenv
    - name: "Who am I?"
      shell: bash
      run: |
        whoami
        echo "UID: $(id -u)"
        echo "GID: $(id -g)"
        echo "GROUPS: $(id -G)"
        echo "GROUPS: $(groups)"
    - name: "What's in the home directory?"
      shell: bash
      run: |
        ls -lah ~
    - name: "What's in the root directory?"
      shell: bash
      run: |
        ls -lah /
    - name: "What's in the working directory?"
      shell: bash
      run: |
        pwd
        ls -lah .
```
{: file='~/.github/workflows/arc2-debug.yml'}

## Leave the runner up for inbound connection

This job creates a single runner of the specified type and leaves it up for an hour.  It's quite handy in developing custom runner images.  This gives a single runner for an hour to `kubectl exec` into it for random additional testing, watching processes run, or trying a change out _before_ committing those changes.

```yaml
name: 🐿️ ARC-2 idle runner

on:
  workflow_dispatch:
    inputs:
      target-scale-set:
        description: "Which scale set to test?"
        type: string
        required: true

jobs:
  idle-hour:
    runs-on: ${{ github.event.inputs.target-scale-set }}
    steps:
      - name: Idle a runner for an hour
        run: |
          echo "Hello world"
          sleep 3600
```
{: file='~/.github/workflows/arc2-sleep.yml'}

## Test container mode

By default, all jobs given to a runner will run on it.  In the context of actions-runner-controller, it means the tasks run in that pod.  This complicates tasks that require working in containers - nested containerization (eg. Docker-in-Docker) requires granting privileged access to the cluster and that's risky.  You can read about the scaling problems faced on this [here](../kubernetes-for-enterprise-ci) and the security implications of this [here](../securing-ghactions-with-arc).  The "paved path" to not do this allows the runner to use Kubernetes to spin up jobs in a container - more about this in the [project docs](https://github.com/actions/runner-container-hooks/blob/main/packages/k8s/README.md).

This workflow simply tests that's working as expected, using `alpine:3` (or other lightweight container if preferred) to print some information to the console.

{% raw %}
```yaml
name: 🐿️ ARC-2 container job test

on:
  workflow_dispatch:
    inputs:
      target-scale-set:
        description: "Which scale set to test?"
        type: string
        required: true

jobs:
  hello-world:
    runs-on: ${{ github.event.inputs.target-scale-set }}
    container: "alpine:3"
    strategy:
      matrix:  # A matrix of 4 is probably quite plenty
        number: [1, 2]
        letter: [a, b]
    steps:
      - name: Hello world
        run: |
          echo "Hello world"
          echo "Number: ${{ matrix.number }}"
          echo "Letter: ${{ matrix.letter }}"
```
{: file='~/.github/workflows/arc2-container-test.yml'}
{% endraw %}

## Next

Next up, we're going to look into [eBPF](https://ebpf.io) and what it can tell us about our runners and what our users are really up to - [part 3](../kubernoodles-pt-3).
