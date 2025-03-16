FROM ghcr.io/some-natalie/jekyll-in-a-can:latest

# Switch to root
USER root

# Install vscode dependencies
RUN apk add --no-cache \
  posix-libc-utils \
  libstdc++ \
  dumb-init \
  git \
  git-lfs \
  curl \
  && ldconfig

# Switch back to non-root user
USER nonroot
