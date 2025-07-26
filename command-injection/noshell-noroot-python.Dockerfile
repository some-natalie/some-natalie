# Build it #

FROM cgr.dev/chainguard/python:latest-dev AS builder

USER root

# Copy the files in
RUN mkdir -p /app && \
  chown -R 65532:65532 /app
USER 65532
COPY ./static /app/static
COPY ./templates /app/templates
COPY ./noshell-app.py /app/app.py
COPY ./requirements.txt /app/requirements.txt
WORKDIR /app

# Install dependencies
RUN pip3 install --no-cache-dir --target=/app -r requirements.txt

# Run it #
FROM cgr.dev/chainguard/python:latest AS worker

# Tag it
LABEL org.opencontainers.image.source="https://github.com/some-natalie/some-natalie/tree/main/command-injection"
LABEL org.opencontainers.image.authors="Natalie Somersall (@some-natalie)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.description="A tiny Flask UI to the terminal for shell injection vulns."

# Copy the files in
COPY --from=builder /app /app
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
