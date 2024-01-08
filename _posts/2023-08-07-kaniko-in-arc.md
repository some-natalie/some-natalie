---
title: "Using Kaniko in Actions-Runner-Controller"
date: 2023-08-07
categories:
  - blog
tags:
  - kubernetes
  - kubernoodles
  - actions-runner-controller
classes: wide
excerpt: "(Kubernoodles, part 6 of ?) - Building containers without Docker-in-Docker or privileged pods with Kaniko"
---

One of the most common business needs I hear concerns about for [actions-runner-controller](https://github.com/actions/actions-runner-controller) and security policy is how to build containers _without_ Docker-in-Docker and privileged pods.  It seems to come up in every conversation I have about self-hosted compute for GitHub Actions - so much so I have a “canned reply” for any emails/issues/discussions asking me about it and I’ve written [blog posts](https://some-natalie.dev/blog/stop-saying-just-use-firecracker/) and given [conference talks](https://some-natalie.dev/blog/securing-ghactions-with-arc/#cluster-settings) about the many ways to address the concern.

The problem with building containers in Kubernetes is that building a container normally relies on having interactive access to Docker/Podman/etc. and these usually require root access on your machine to run.  Even rootless Docker still needs a privileged pod to work with [seccomp](https://kubernetes.io/docs/tutorials/security/seccomp/) and mount `procfs` and `sysfs` - so while it’s possible to remove `sudo` and run the Docker daemon without root, it still requires `--privileged` to run.[^p]

I had assumed there was some publicly discoverable code combining a container builder in GitHub Actions with actions-runner-controller.  I was wrong - let’s fix that. 🙊

Here’s how to use Google’s [Kaniko](https://cloud.google.com/blog/products/containers-kubernetes/introducing-kaniko-build-container-images-in-kubernetes-and-google-container-builder-even-without-root-access) to build containers in actions-runner-controller _without_ privileged pods or Docker-in-Docker.

## Storage setup

In order to run a container within actions-runner-controller, we’ll need to use the [runner with k8s jobs](https://github.com/actions/actions-runner-controller/blob/master/docs/deploying-alternative-runners.md#runner-with-k8s-jobs) and [container hooks](https://github.com/actions/runner-container-hooks/tree/main/packages/k8s)[^d], which allows the runner pod to dynamically spin up other containers instead of trying to use the default Docker socket.  This means a new set of runners and a new [persistent volume](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) to back it up - full [manifest](https://github.com/some-natalie/kubernoodles/blob/main/cluster-configs/k8s-mode-storage.yml) file for both our test and production namespaces, if you want to jump ahead.

Create the storage class with the following manifest:

```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: k8s-mode
  namespace: test-runners # just showing the test namespace
provisioner: file.csi.azure.com # change this to your provisioner
allowVolumeExpansion: true # probably not strictly necessary
reclaimPolicy: Delete
mountOptions:
 - dir_mode=0777 # this mounts at a directory needing this
 - file_mode=0777
 - uid=1000 # match your pod's user id, this is for actions/actions-runner
 - gid=1000
 - mfsymlinks
 - cache=strict
 - actimeo=30
```

Now give it a persistent volume claim:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-k8s-cache-pvc
  namespace: test-runners
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: k8s-mode # we'll need this in the runner Helm chart
```

And apply it with a quick `kubectl apply -f k8s-storage.yml` to move forward.

## Deploy the runners

Now, we need runners that have the container hooks installed and can run jobs natively in Kubernetes.  The pre-built Actions runner image ([Dockerfile](https://github.com/actions/runner/blob/main/images/Dockerfile)) does all of this perfectly and is maintained by GitHub, so that’s what we’ll use here.  The finished chart is [here](https://github.com/some-natalie/kubernoodles/blob/main/deployments/helm-kaniko.yml).

Let’s make a quick Helm chart:

```yaml
template:
  spec:
    initContainers: # needed to set permissions to use the PVC
    - name: kube-init
      image: ghcr.io/actions/actions-runner:latest
      command: ["sudo", "chown", "-R", "runner:runner", "/home/runner/_work"]
      volumeMounts:
      - name: work
        mountPath: /home/runner/_work
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
        env:
          - name: ACTIONS_RUNNER_CONTAINER_HOOKS
            value: /home/runner/k8s/index.js
          - name: ACTIONS_RUNNER_POD_NAME
            valueFrom:
              fieldRef:
                fieldPath: metadata.name
          - name: ACTIONS_RUNNER_REQUIRE_JOB_CONTAINER
            value: "false"  # allow non-container steps, makes life easier
        volumeMounts:
          - name: work
            mountPath: /home/runner/_work

containerMode:
  type: "kubernetes" 
  kubernetesModeWorkVolumeClaim:
    accessModes: ["ReadWriteOnce"]
    storageClassName: "k8s-mode"
    resources:
      requests:
        storage: 1Gi

```

And apply it!

```console
$ helm install kaniko-worker \
    --namespace "test-runners" \
    -f helm-kaniko.yml \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set \
    --version 0.8.1

Pulled: ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set:0.8.1
Digest: sha256:36a1f7a07ae5a3b15a9d190cf492ab66dd3a1302f37bde2f1ce5a6660592eb10
NAME: kaniko-worker
LAST DEPLOYED: Mon Jan  8 09:35:09 2024
NAMESPACE: ghec-runners
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Thank you for installing gha-runner-scale-set.

Your release is named kaniko-worker.
```

## Write the workflow

Now that we have runners that can accept container tasks natively within Kubernetes, let’s build  and push a container!  (full [workflow file](https://github.com/some-natalie/kubernoodles/blob/main/.github/workflows/test-kaniko.yml), if you want to jump ahead)

{% raw %}
```yaml
name: 🧪 Test building with Kaniko

on:
  workflow_dispatch:

jobs:
  build:
    runs-on: [kaniko-worker] # our new runner set
    container:
      image: gcr.io/kaniko-project/executor:debug # the kaniko image
    permissions:
      contents: read # read the repository
      packages: write # push to GHCR, omit if not pushing to GitHub's container registry

    steps:
      - name: Build and push container test
        run: |
          # Write config file, change to your destination registry
          AUTH=$(echo -n ${{ github.actor }}:${{ secrets.GITHUB_TOKEN }} | base64)
          echo "{\"auths\": {\"ghcr.io\": {\"auth\": \"${AUTH}\"}}}" > /kaniko/.docker/config.json

          # Configure git
          export GIT_USERNAME="kaniko-bot"
          export GIT_PASSWORD="${{ secrets.GITHUB_TOKEN }}" # works for GHEC or GHES container registry

          # Build and push (sub in your image, of course)
          /kaniko/executor --dockerfile="./images/ubi9.Dockerfile" \
            --context="${{ github.repositoryUrl }}#${{ github.ref }}#${{ github.sha }}" \
            --destination="ghcr.io/some-natalie/kubernoodles/kaniko-build:test" \
            --push-retry 5 \
            --image-name-with-digest-file /workspace/image-digest.txt
```
{: file='~/.github/workflows/test-kaniko.yml'}
{% endraw %}

In the workflow, I used the `debug` image as it provides more log output than the standard one and that’s my default as I build out new things.  It shouldn’t be necessary once you’ve got a good workflow established.

Once the job is kicked off, it spins up another container, as shown below:

```console
$ kubectl get pods -n "test-runners"
NAME                                        READY   STATUS    RESTARTS   AGE
kaniko-worker-n6bfm-runner-rfjhx            1/1     Running   0          108s
kaniko-worker-n6bfm-runner-rfjhx-workflow   1/1     Running   0          9s
```

Here’s our successful [workflow run](https://github.com/some-natalie/kubernoodles/actions/runs/5765587842/job/15631837204)!

![successful-run](/assets/graphics/2023-08-07-kubernoodles-pt-6/success.png)

> Full [workflow logs](https://github.com/some-natalie/some-natalie/blob/main/assets/logs/kubernoodles-pt-6/kaniko-build.txt) and output of [kubectl describe pod](https://github.com/some-natalie/some-natalie/blob/main/assets/logs/kubernoodles-pt-6/k-describe-pod.txt) for the runner and the job containers are retained in the repository to prevent rotating out after 90 days.
{: .prompt-info}

## Notes

One runtime flag to highlight is [`--label`](https://github.com/GoogleContainerTools/kaniko#flag---label), which adds the OCI labels to the finished image instead of the `LABEL` directive in the Dockerfile.  You may need to edit your Dockerfiles and workflow pipelines moving from other container build systems to make sure the final image has the correct labels.  There are **tons** of other build flags and options in Kaniko, as well as many different ways to use it.  Check out the project on [GitHub](https://github.com/GoogleContainerTools/kaniko) for a more detailed outline on what flags are available. 📚

Kaniko certainly isn’t the only player in this space, but it’s the most common that I’ve come across.  Here are a few others worth mentioning:

- [Buildah](https://docs.openshift.com/container-platform/4.13/cicd/pipelines/unprivileged-building-of-container-images-using-buildah.html) in OpenShift
- Moby [buildkit](https://github.com/moby/buildkit/tree/master)
- [Orca-build](https://github.com/cyphar/orca-build) - possibly unmaintained proof-of-concept?

In order to do this all internally, you'll need to bring in or build a GitHub Actions runner that can run k8s jobs internally - the default one from GitHub ([link](https://github.com/actions/runner/pkgs/container/actions-runner)) works great here, but if that’s not alright, make sure to read the assumptions of custom runners [here](https://github.com/actions/actions-runner-controller/blob/master/docs/adrs/2022-10-17-runner-image.md) before installing the container hooks as outlined above.  The Kaniko executor image and and all base images will need to be internal too.

Next - Build custom runners into GitHub Actions so [it'll build/test/deploy itself](../kubernoodles-pt-7)!

---

## Footnotes

[^p]: A discussion with lots of links on this here - [Add rootless DinD runner by some-natalie · Pull Request \#1644 · actions/actions-runner-controller](https://github.com/actions/actions-runner-controller/pull/1644)
[^d]: The official documentation is well worth reading a few times over - [Deploying runner scale sets with Actions Runner Controller - GitHub Enterprise Cloud Docs](https://docs.github.com/en/enterprise-cloud@latest/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller/deploying-runner-scale-sets-with-actions-runner-controller#using-kubernetes-mode)
