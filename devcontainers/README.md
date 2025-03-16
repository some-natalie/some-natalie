# devcontainers

Some common [devcontainers](https://containers.dev) that I use as references / send to folks.  These should work in any system that uses [VS Code Server](https://code.visualstudio.com/docs/remote/vscode-server) - GitHub Codespaces, Gitpod, Coder, etc.

- [jekyll](jekyll/) is a simple single-container devcontainer for static site development.  It uses [jekyll-in-a-can](https://github.com/some-natalie/jekyll-in-a-can) as a base image.
- [multi-service](multi-service/) uses several services orchestrated by Docker Compose for a devcontainer.  It's got a database, initialized by a separate service, and a simple flask app.
- [docker-in-docker](docker-in-docker/) is exactly what it sounds like.
