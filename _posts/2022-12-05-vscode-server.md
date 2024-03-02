---
title: "Devcontainers in Kubernetes"
date: 2022-12-05
categories:
  - blog
tags:
  - kubernetes
  - codespaces
  - containers
classes: wide
excerpt: "It's like Codespaces, but much more work for much less functionality."
---

![image-right](/assets/graphics/memes/devcontainers-kubernetes.jpg){: .w-50 .right}

A [devcontainer](https://containers.dev/) lets you use an arbitrary Docker container as a development environment - leveraging the reproducible, version-controlled, and disposable nature of containers for a consistent developer experience.  There are lots of images to start from [here](https://containers.dev/templates) (with source code [here](https://github.com/devcontainers/images)). Kubernetes lets us orchestrate container workloads in a sane way.  Here's some links to jump ahead:

- [Setup directions](#kubernetes-setup) for the quick proof of concept
- [FAQs](#questions), including why on earth would you ever want to do this?

This does _not_ use the full functionality of `devcontainer.json` - so instead of being able to specify things like pre/post scripts, port forwarding, etc., in that file, you'll instead need to manage that through the Kubernetes deployment YAML.  This, as well as multi-container environments, should all be possible - just outside the scope of this very minimal proof of concept.

This is designed for single-user use, where you can have multiple persistent or ephemeral deployments.  I'd imagine this as one namespace per user.  A user requests access to this from an admin via an issue or something, get a namespace and some resources of their own, and be on their merry way.  There's some limitations on VS Code Server that enforce this pattern reasonably well - single user per server, one user can access up to 10 remote machines, and specifically disallowing running it as a service in the license.  It doesn't look like it'll allow you to configure custom TLS encryption and it allows users to disable SSL so ... not exactly "SaaS in a box" software.

## Kubernetes setup

You'll need:

- A Kubernetes cluster - I'm using [AKS](https://azure.microsoft.com/en-us/products/kubernetes-service/) in this example because that's what I have.  Should work more or less the same in bare metal or another managed provider.
- Some persistent storage that the cluster can access.  I'm using an [Azure File Share](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-introduction) because again, it's what I have and works well.  You can do this without persistent storage, but then you're reliant on committing and pushing more often and why?  Storage is cheap.
- [VS Code Server](https://code.visualstudio.com/docs/remote/vscode-server), which is still in private preview.  You can sign up [here](https://aka.ms/vscode-server-signup).

> This is some random directions you found for a minimally viable concept built on a private preview.  Maybe don't run this in production, okay?
{: .prompt-danger}

1. Create a namespace for our devcontainers to isolate them some.  You _might_ want multiple, depending on if how you allocate resource quotas, etc.

    ```console
    kubectl create namespace devcontainers
    ```

1. Create a persistent volume and claim for data to persist between containers.  In this case, we're using Azure file shares, but the steps should be similar for other cloud providers.  Again, this might differ based on how the team needs to separate data.

    ```console
    # Store the storage account name as a secret
    kubectl create secret generic azure-secret -n devcontainers  \
        --from-literal=azurestorageaccountname=runnertoolcache \
        --from-literal=<key-goes-here-without-brackets>

    # Create the persistent volume and claim
    kubectl apply -f deployments/pv.yaml
    kubectl apply -f deployments/pvc.yaml
    ```

    ```yaml
    # deployments/pv.yaml
    apiVersion: v1
    kind: PersistentVolume
    metadata:
      name: local-path-pv
      namespace: devcontainers # keep it all in the same namespace
      labels:
        usage: local-path-pv
    spec:
      capacity:
        storage: 2Gi
      accessModes:
        - ReadWriteOnce
      persistentVolumeReclaimPolicy: Retain
      storageClassName: azurefile-csi
      csi:
        driver: file.csi.azure.com
        readOnly: false
        volumeHandle: unique-volumeid # make sure this volumeid is unique in the cluster!
        volumeAttributes:
          shareName: devcontainers-cache
        nodeStageSecretRef:
          name: azure-secret
          namespace: devcontainers
      mountOptions: # give the user full access to their data
        - dir_mode=0777
        - file_mode=0777
        - uid=1000 # make sure this matches the UID/GID of the container being deployed!
        - gid=1000
    ```

    ```yaml
    # deployments/pvc.yaml
    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: local-path-pvc
      namespace: devcontainers
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: azurefile-csi
      resources:
        requests:
          storage: 2Gi
      selector:
        matchLabels:
          usage: local-path-pv
    ```

1. Create (or edit or use as-is) the deployment file for a devcontainer.  Here's an example:

    ```console
    # Launch that devcontainer!
    kubectl apply -f deployments/python-devcontainer.yaml
    ```

    ```yaml
    # deployments/python-devcontainer.yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: python-devcontainer
      namespace: devcontainers
      labels:
        app: python-devcontainer
    spec:
      containers:
        - image: mcr.microsoft.com/devcontainers/python:3
          imagePullPolicy: IfNotPresent
          name: python-devcontainer
          resources:
            limits:
              cpu: "4000m"
              memory: "4Gi"
            requests:
              cpu: "2000m"
              memory: "2Gi"
          securityContext:
            runAsUser: 1000
            runAsGroup: 1000
          command: [ "/bin/bash", "-c", "--" ]
          args: [ "while true; do sleep 30; done;" ] # keep the container running forever
          volumeMounts:
            - mountPath: /home/vscode/code
              name: local-path-pvc
              readOnly: false
      volumes:
        - name: local-path-pvc
          persistentVolumeClaim:
            claimName: local-path-pvc
    ```

    > This example's `command` and `args` leave the container running _forever_.  Evaluate if that's a good idea before applying it. 😀
    {: .prompt-warning}

1. Connect to the pod via VS Code's Kubernetes extension.  Note how VS Code Server installs itself in the pod automatically.

    ![connect-to-pod](/assets/graphics/2022-12-05-vscode-server/1-attach-vscode-to-pod.png)

    ![install-server](/assets/graphics/2022-12-05-vscode-server/2-installing-server.png)

1. Open your code, or clone it from GitHub.  In this case, two repositories are already cloned and just need updating via `git pull`.

    ![update-code](/assets/graphics/2022-12-05-vscode-server/3-open-files.png)

1. Note that the file storage is persistent in Azure file shares.

    ![files](/assets/graphics/2022-12-05-vscode-server/4-azure-files.png)

1. Enjoy!

## Questions

### Does it air gap?

Maybe some day, but probably not right now?  It looks like VS Code Server registers itself to your GitHub account via OAuth and I'd imagine that GitHub.com is hardcoded in.  It's also reaching outbound to install itself when you attach VS Code to it.

### Does it have to be Docker?

Maybe?  I don't think so, but I didn't test OpenShift or other container ecosystems.  The [system requirements](https://code.visualstudio.com/docs/devcontainers/containers#_system-requirements) for devcontainers specifically says to use Docker.

### Does it do anything particularly complicated?

Probably?  It looks like anything you can do within a pod, you can do here - multi-container apps, custom networking, storage, hardware access, etc.  The challenge I've seen so far is that VS Code is expecting a longer-term use than Kubernetes pods are really designed for.

### Why on earth would I want to do this?

- Self-hosting things
- Custom hardware access (*requires privileged pods if using k8s)
- You love to do things the hard way
- Résumé driven development - for real, there's Kubernetes and I'm sure a couple other buzzwords you can work in too.  There's not too many great reasons for doing this.

![Résumé driven development](/assets/graphics/memes/resume-driver-development.jpg)
