FROM ubuntu:jammy-20230605

RUN apt-get update
RUN apt-get dist-upgrade -y
RUN apt-get autoremove
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*
