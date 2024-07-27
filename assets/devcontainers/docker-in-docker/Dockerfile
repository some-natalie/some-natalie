FROM cgr.dev/chainguard/wolfi-base:latest

# VS Code's requirements. posix-libc-utils for getent and ldconfig refreshes ld.so.cache for requirements script
USER root
RUN apk update && apk add \
  posix-libc-utils \
  libstdc++ \
  git \
  git-lfs \
  curl \
  supervisor \
  docker-dind \
  fuse-overlayfs \
  docker-oci-entrypoint \
  docker-rootless \
  && ldconfig

# Whatever else you need
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]

CMD [ "/bin/sh" ]
