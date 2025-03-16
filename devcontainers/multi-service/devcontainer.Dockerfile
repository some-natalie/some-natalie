FROM cgr.dev/chainguard/python:latest-dev

# Environment variable for system
ENV LANG=C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

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

# Set up Python dependencies
RUN python -m venv venv
ENV PATH="/app/venv/bin:$PATH"
COPY ./python/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Set up Python app
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV PATH="/app:$PATH"

COPY ./python/app.py app.py

EXPOSE 5000

ENTRYPOINT [ "dumb-init", "--", "python", "-m", "flask", "run" ]
