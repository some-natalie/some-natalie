---
title: "Kubernoodles Cluster Setup"
date: 2023-02-10
categories:
  - blog
tags:
  - kubernetes
  - kubernoodles
  - actions-runner-controller
classes: wide
excerpt: "(Kubernoodles, part 1 of ?) - Setup your k8s cluster, actions-runner-controller, and some default runners for later o11y."
---

[Kubernoodles](https://github.com/some-natalie/kubernoodles) is a reference architecture for a lot of "how to devops" things, mostly for [actions-runner-controller](https://github.com/actions/actions-runner-controller) within a larger business.  With all the new work GitHub has put into the project, the opinionated guidance is no longer valid or got totally deprecated by shiny new features.  Add in my newfound desire to explore observability in Kubernetes, I decided to rip it out and start new.

:calendar: As of writing this (Feb 2023), the actions-runner-controller setup, etc., is in private preview for GitHub.  URLs, etc., will be updated once these features are in public beta.

## Heads up and pre-requisites

End goal is a Kubernetes cluster with a custom CNI plugin, actions-runner-controller, and a scaling set of the default runners.  There's lots to explore later.

You'll need:

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/), [installation](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) and an Azure account.  (Alternatively, use [minikube](https://minikube.sigs.k8s.io/docs/start/) or [Docker Desktop](https://www.docker.com/products/docker-desktop/))
- [Helm 3](https://helm.sh/), [installation](https://helm.sh/docs/intro/install/)
- [Cilium CLI](https://docs.cilium.io/en/stable/cheatsheet/), [installation](https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/#install-the-cilium-cli)

## Cluster setup

First, let's setup the cluster.  I want to play with [eBPF](https://ebpf.io/) for observability and security, so I'm going to bring my own [CNI-compatible](https://www.cni.dev/docs/) networking.  These commands are for rapid patching of a small cluster, so edit to fit your needs.

```shell
# Create your cluster without a network plugin
az aks create -n <cluster-name> -g <resource-group-name> -l <region-name> \
    --max-pods 250 \
    --auto-upgrade-channel rapid \
    --kubernetes-version 1.26.0 \
    --node-vm-size Standard_B4ms \
    --network-plugin none

# Set the context
az aks get-credentials --resource-group <resource-group-name> --name <cluster-name>
```

Next, add [Cilium](https://cilium.io/) ([GitHub](https://github.com/cilium/cilium)) as our CNI-compatible networking.  It's going to provide visibility in L3/4 and L7 networking.  [Hubble](https://docs.cilium.io/en/v1.12/intro/#what-is-hubble) will provide us ways to actually see that info.

```shell
# Add the helm repo
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install cilium and hubble into our cluster
helm install cilium cilium/cilium \
    --version 1.13.0 \
    --namespace kube-system \
    --set aksbyocni.enabled=true \
    --set nodeinit.enabled=true \
    --set hubble.ui.enabled=true \
    --set hubble.relay.enabled=true
```

Verify Cilium is up and running as expected.

![cilium-status](/assets/graphics/2023-02-10-kubernoodles-pt-1/cilium-status.png)

Now start Hubble and verify it's working.  There's not much data here yet, but you should see something like this.  This'll get picked up later.

```shell
$ cilium hubble ui
ℹ️  Opening "http://localhost:12000" in your browser...
```

![hubble-status](/assets/graphics/2023-02-10-kubernoodles-pt-1/hubble.png)

## Setting up actions-runner-controller

From here, we're roughly following the actions-runner-controller beta docs ([link](https://github.com/actions/actions-runner-controller/blob/master/docs/preview/actions-runner-controller-2/README.md#install-actions-runner-controller)).  This is using a [GitHub app](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app) for authentication on the [`some-natalie/kubernoodles`](https://github.com/some-natalie/kubernoodles) repository.

First install the controller.

```shell
NAMESPACE="arc-systems"
helm install arc \
    --namespace "${NAMESPACE}" \
    --create-namespace \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller \
    --version 0.2.0
```

Now, let's create some namespaces for our runners to use.  Because this is a single-tenant use case, I'm only going to use one namespace for "production", but this can be broken down however you'd like.  I tend to recommend one namespace per deployment with quotas/etc set there.  This also can change and grow later on ... no commitments made here.

```shell
kubectl create namespace runners
```

Here's how to deploy the default runner image ([source](https://github.com/actions/runner/blob/main/images/Dockerfile)).  An example of the values file used is [here](https://github.com/some-natalie/kubernoodles/blob/main/deployments/helm-ubi8.yml).  Most importantly, it is setting the scale size, image source, and the GitHub app credentials. The default image is quite minimal and building your own is up next!

```shell
helm install defaults \
    --namespace "runners" \
    -f helm-runner.yml \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set \
    --version 0.2.0
```

If all has gone well, you should now see an online set of runners in GitHub, no pods in the `runners` namespace (scaled to 0 unless there's work), and a listener pod in the `arc-systems` namespace.

```shell
$ kubectl get pods -n "runners"
No resources found in runners namespace.

$ kubectl get pods -n "arc-systems"
NAME                                              READY   STATUS    RESTARTS   AGE
arc-actions-runner-controller-2-8c74b6f95-z9d6w   1/1     Running   0          6h8m
defaults-7d446b46-listener                        1/1     Running   0          30m
```

![runners-online](/assets/graphics/2023-02-10-kubernoodles-pt-1/runner-sets.png)

Lastly, you'll dispatch jobs to this runner set using the name set at installation - in this case it's `defaults`.

## Next

A quick couple of testing workflows to test and scale the default runners ([part 2](../kubernoodles-pt-2)), then a look at what's going on inside those runners ([part 3](../kubernoodles-pt-3)).
