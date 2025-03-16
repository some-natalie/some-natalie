FROM ubuntu:jammy-20230605

RUN apt-get update \
  && apt-get dist-upgrade -y \
  && apt-get autoremove \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
