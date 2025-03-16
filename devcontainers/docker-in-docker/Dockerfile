FROM cgr.dev/chainguard/wolfi-base:latest

# VS Code's requirements. posix-libc-utils for getent and ldconfig refreshes ld.so.cache for requirements script
USER root
RUN apk add --no-cache \
  posix-libc-utils \
  libstdc++ \
  bash \
  git \
  git-lfs \
  curl \
  dumb-init \
  docker-dind \
  fuse-overlayfs \
  && ldconfig

# Whatever else you need
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

ENTRYPOINT ["dumb-init", "--", "./startup.sh"]
