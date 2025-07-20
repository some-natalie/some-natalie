FROM cgr.dev/chainguard/wolfi-base:latest

RUN adduser -D -u 1000 user

USER user
