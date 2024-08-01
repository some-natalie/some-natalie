---
title: "Securing Devcontainers (part 2) - multi-service applications with Docker Compose"
date: 2024-07-30
excerpt: "Hardening a multi-container application in a devcontainer."
tags:
- security
- containers
- devcontainers
---

Last time, we made a [simple devcontainer for Ruby](../securing-devcontainers) that was effective, lightweight, and secure.  But also uncomplicated.  Let's add a few services to make it more realistic.  While I was at Booz Allen, I had written a tiny Python service to receive webhook payloads and then do some business logic with the contents.  I've solved the same problem a few more times over the years, rewriting it be more generic and store data in a database.  It's a great candidate to port into a devcontainer!

> The end result of this is a devcontainer to develop a multi-service application orchestrated by Docker Compose.
>
> 🚢 Check out the finished [docker-compose.yml](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/multi-service/docker-compose.yml), [Dockerfile](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/multi-service/devcontainer.Dockerfile) of the finished Python service, and [devcontainer.json](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/multi-service/.devcontainer/devcontainer.json) file to jump to the end.
{: .prompt-tip }

## Demo architecture

This application uses three services:

1. Python for a simple Flask app
2. PostgreSQL to store and retrieve data
3. Flyway to apply the database schema and seed some test data on start up (think of it like an `init container` and that's not far from true)

It's likely that we won't _develop_ PostgreSQL directly.  Our changes are likely to affect the program and data, not the webserver or database itself.  It makes sense to attach to our Python container.  To support this, we won't change our finished multi-stage build for use with a production web server and deployment logic.

## Dockerfile for our app

Instead, we'll add another one called `devcontainer.Dockerfile` that contains our application and additional dependencies, but uses Flask's built-in webserver for simple iteration.  It's a simple single-stage build.  There's not much to change here.  All you need to change is to install a few dependencies and reconfigure the shared libraries they add on an image with a shell.

```dockerfile
# Switch to root
USER root

# Install vscode dependencies
RUN apk update \
  && apk add --no-cache \
  posix-libc-utils \
  libstdc++ \
  dumb-init \
  git \
  git-lfs \
  curl \
  && ldconfig

# Switch back to non-root user
USER nonroot
```

No tricks here - the above block of code is more or less all you need in the application we'll be connecting to for VS Code to work.  Everything else in [the full Dockerfile](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/multi-service/devcontainer.Dockerfile) is setting up the Flask app same as it would without working inside a devcontainer.

## Docker Compose file puts it together

Let's talk about the other containerized services, Flyway and PostgreSQL, and how they relate to our application.  The [full docker-compose.yml file](https://github.com/some-natalie/some-natalie/blob/main/assets/devcontainers/multi-service/docker-compose.yml) goes into more detail on these services that aren't _entirely_ essential for our devcontainer.  Here's how our `app` service is defined to interact with them:

```yaml
  app:
    # build the right container
    build:  
      context: .
      dockerfile: devcontainer.Dockerfile
    ports:
      - 5000:5000
    # wait for the database to be up and initialized with data first
    depends_on:
      - database
      - flyway
    # mount the workspace volume that VS Code server expects
    volumes:
      - .:/workspace
```

Make sure you map a volume for VS Code server to use in this Docker Compose configuration.  It'll expect something in the devcontainer JSON file to use for information.

## Devcontainer definition

Now that we have our app's containers in order, we need to tell VS Code server how to interact with it.  There are lots of configuration options in [the specification](https://containers.dev/implementors/spec/).  These may differ by provider (eg, GitPod or GitHub's Codespaces, etc.), so make sure to look over the vendor docs too.

Here are the relevant JSON keys and why they're set:

```jsonc
{
    // which compose file to use in our repository
    "dockerComposeFile": [
        "../docker-compose.yml"
    ],

    // which service in that compose file to attach to
    "service": "app",

    // the name of the shared volume to use as a workspace
    "workspaceFolder": "/workspace",

    // make a labelled list of ports inside the container available locally
    "forwardPorts": [
        5000,
        5432
    ],
    "portsAttributes": {
        "5000": {
            "label": "webhook receiver"
        },
        "5432": {
            "label": "postgres"
        }
    },

    // use the "nonroot" user in our application container
    "remoteUser": "nonroot"
}
```

Pinning dependencies happens in `requirements.txt` (for Python) or in the `docker-compose.yml` file or `Dockerfile`, same as any other part of an application.  The big change from going from one to many services is adding Docker Compose to define how the containers interact and changing our `devcontainer.json` file to connect to the one with a shell and all the pre-requisites installed.

> Next time, let's get even more in depth by adding Docker-in-Docker to our devcontainer. 🐳
{: .prompt-info}

---

## Disclosure

I work at Chainguard as a solutions engineer at the time of writing this.  All opinions are my own.
