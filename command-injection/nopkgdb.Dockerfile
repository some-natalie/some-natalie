FROM ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot@sha256:c5637e002b0506c60b2c2ad2c20352ac9f3f50de6c2c136075c41d9bc695a07b AS source

# Remove files
FROM cgr.dev/chainguard/wolfi-base:latest AS process

# Copy it all over
COPY --from=source / /test
RUN rm /test/etc/os-release && \
  rm /test/etc/apk/repositories && \
  rm /test/etc/apk/world && \
  rm /test/lib/apk/db/* && \
  rm /test/app/requirements.txt

# Run it #
FROM scratch

# Tag it
LABEL org.opencontainers.image.source="https://github.com/some-natalie/some-natalie/tree/main/command-injection"
LABEL org.opencontainers.image.authors="Natalie Somersall (@some-natalie)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.description="A tiny Flask UI to the terminal for shell injection vulns."

# Copy the files in
COPY --from=process /test /
WORKDIR /app
ENV PYTHONPATH=/app

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

# Expose the app
EXPOSE 5000

# Start it up
ENTRYPOINT [ "python", "-m", "flask", "run" ]
