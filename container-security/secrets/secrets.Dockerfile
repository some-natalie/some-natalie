FROM cgr.dev/chainguard/wolfi-base:latest

COPY secret.txt /not-a-secret.txt

RUN rm -rf /not-a-secret.txt
