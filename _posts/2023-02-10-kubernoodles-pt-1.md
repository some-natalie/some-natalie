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
    --max-pods 100 \
    --auto-upgrade-channel rapid \
    --kubernetes-version 1.28.3 \
    --node-vm-size Standard_B4ms \
    --network-plugin none

# Set the context
az aks get-credentials --resource-group <resource-group-name> --name <cluster-name>
```

Next, add [Cilium](https://cilium.io/) ([GitHub](https://github.com/cilium/cilium)) as our CNI-compatible networking.  It's going to provide visibility in L3/4 and L7 networking.  [Hubble](https://docs.cilium.io/en/stable/gettingstarted/hubble_intro/) will provide us ways to actually see that info.

```shell
# Add the helm repo
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install cilium and hubble into our cluster
helm install cilium cilium/cilium \
    --version 1.15.1 \
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

From here, we're roughly following the actions-runner-controller docs ([link](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller/quickstart-for-actions-runner-controller)).  This is using a [GitHub app](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app) for authentication on the [`some-natalie/kubernoodles`](https://github.com/some-natalie/kubernoodles) repository, so please update for organization or enterprise scopes as fits your needs.

First install the controller.

```shell
NAMESPACE="arc-systems"
helm install arc \
    --namespace "${NAMESPACE}" \
    --create-namespace \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller \
    --version 0.8.2
```

Now, let's create some namespaces for our runners to use.  Because this is a single-tenant use case, I'm only going to use one namespace for "production", but this can be broken down however you'd like.  I tend to recommend one namespace per deployment with quotas/etc set there.  This also can change and grow later on ... no commitments made here.

```shell
kubectl create namespace ghec-runners
```

Here's how to deploy the default runner image ([source](https://github.com/actions/runner/blob/main/images/Dockerfile)).  An example of the values file used is below.

```yaml
## githubConfigUrl is the GitHub url for where you want to configure runners
## ex: https://github.com/myorg/myrepo or https://github.com/myorg
githubConfigUrl: "repo or org name here"

## githubConfigSecret is the k8s secrets to use when auth with GitHub API.
## You can choose to use GitHub App or a PAT token
githubConfigSecret:
  github_app_id: "app-id-number"
  github_app_installation_id: "install-id-number"
  github_app_private_key: |
    -----BEGIN RSA PRIVATE KEY-----
    keygoeshere
    -----END RSA PRIVATE KEY-----

## maxRunners is the max number of runners the auto scaling runner set will scale up to.
maxRunners: 5

## minRunners is the min number of runners the auto scaling runner set will scale down to.
minRunners: 1

## template is the PodSpec for each runner Pod
template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        command: ["/home/runner/run.sh"]
```
{: file='helm-runner.yml'}

Most importantly, that template is setting the scale size, image source, and the GitHub app credentials for your runners. The default image is quite minimal, so we'll go over how to [build your own image](../kubernoodles-pt-5) soon.  Now let's deploy it! 🚀

```shell
helm install defaults \
    --namespace "ghec-runners" \
    -f helm-runner.yml \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set \
    --version 0.8.2
```

If all has gone well, you should now see an online set of runners in GitHub.  In this case, there's one pod that's always available in the `ghec-runners` namespace (scaled to 1 unless there's work), and a listener pod in the `arc-systems` namespace.

```shell
$ kubectl get pods -n "ghec-runners"
NAME                          READY   STATUS    RESTARTS   AGE
defaults-fsmdn-runner-47qck   1/1     Running   0          29m

$ kubectl get pods -n "arc-systems"
NAME                                     READY   STATUS    RESTARTS   AGE
arc-gha-rs-controller-69c4496464-67xsc   1/1     Running   0          5h56m
defaults-578cf56d-listener               1/1     Running   0          45m
```

![runners-online](/assets/graphics/2023-02-10-kubernoodles-pt-1/runner-sets.png)

Lastly, you'll dispatch jobs to this runner set using the name set at installation - in this case it's `defaults`.

## Next

A quick couple of testing workflows to test and scale the default runners ([part 2](../kubernoodles-pt-2)), then a look at what's going on inside those runners ([part 3](../kubernoodles-pt-3)).
