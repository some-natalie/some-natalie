# devcontainers

Some common [devcontainers](https://containers.dev) that I use as references / send to folks.  These should work in any system that uses [VS Code Server](https://code.visualstudio.com/docs/remote/vscode-server) - GitHub Codespaces, Gitpod, Coder, etc.

> [!NOTE]
> If you don't want to use a managed service or self-hosted management solution, I wrote up some directions for [hosting devcontainers in kubernetes](https://some-natalie.dev/blog/vscode-server/) and the files are in the [host-in-k8s](host-in-k8s) directory.

- [jekyll](jekyll/) is a simple single-container devcontainer for static site development.  It uses [jekyll-in-a-can](https://github.com/some-natalie/jekyll-in-a-can) as a base image.
- [multi-service](multi-service/) uses several services orchestrated by Docker Compose for a devcontainer.  It's got a database, initialized by a separate service, and a simple flask app.
- [docker-in-docker](docker-in-docker/) is exactly what it sounds like.
