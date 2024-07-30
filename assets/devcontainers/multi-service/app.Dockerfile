FROM cgr.dev/chainguard/python:latest-dev AS builder

ENV LANG=C.UTF-8
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN python -m venv venv
ENV PATH="/app/venv/bin:$PATH"
COPY ./python/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Runtime stage
FROM cgr.dev/chainguard/python:latest

WORKDIR /app

ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV PATH="/app:$PATH"

COPY ./python/app.py app.py
COPY --from=builder /app/venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

EXPOSE 5000

ENTRYPOINT [ "python", "-m", "flask", "run" ]
