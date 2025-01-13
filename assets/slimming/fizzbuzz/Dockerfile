# Build it #

FROM python:3.10-slim AS builder

# Copy the files in
COPY ./src /app/src
COPY ./templates /app/templates
COPY ./app.py /app
COPY ./requirements.txt /app/requirements.txt
WORKDIR /app

# Install dependencies
RUN pip3 install --no-cache-dir --target=/app -r requirements.txt


# Run it #
FROM python:3.10-slim AS worker

# Tag it
LABEL org.opencontainers.image.source="https://github.com/some-natalie/fluffy-crepes"
LABEL org.opencontainers.image.authors="Natalie Somersall (@some-natalie)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.description="Fluffy Crepes is the world's most over-engineered fizzbuzz application."

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
CMD ["python3", "-m" , "flask", "run"]
