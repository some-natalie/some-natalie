FROM cgr.dev/chainguard/wolfi-base:latest

RUN apk add --no-cache cowsay

CMD [ "cowsay" ]
