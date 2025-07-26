a tiny flask ui to take user input and run it as a command, in a container

```
docker run --rm --name flask-ui -p 5000:5000 ghcr.io/some-natalie/some-natalie/command-injection:latest
```

turns out vibe coding deliberately vulnerable things with pretty CSS is fast and fun 🫠

## multiarch builds

```
# build and push arm64
docker build --platform=linux/arm64 -f command-injection.Dockerfile -t ghcr.io/some-natalie/some-natalie/command-injection:arm64-latest .
docker push ghcr.io/some-natalie/some-natalie/command-injection:arm64-latest
# build and push amd64
docker build --platform=linux/amd64 -f command-injection.Dockerfile -t ghcr.io/some-natalie/some-natalie/command-injection:amd64-latest .
docker push ghcr.io/some-natalie/some-natalie/command-injection:amd64-latest
# create manifest
crane index append -t ghcr.io/some-natalie/some-natalie/command-injection:latest -m ghcr.io/some-natalie/some-natalie/command-injection:amd64-latest -m ghcr.io/some-natalie/some-natalie/command-injection:arm64-latest
```


```
# build and push arm64
docker build --platform=linux/arm64 -f noshell-python.Dockerfile -t ghcr.io/some-natalie/some-natalie/command-injection-noshell:arm64-latest .
docker push ghcr.io/some-natalie/some-natalie/command-injection-noshell:arm64-latest
# build and push amd64
docker build --platform=linux/amd64 -f noshell-python.Dockerfile -t ghcr.io/some-natalie/some-natalie/command-injection-noshell:amd64-latest .
docker push ghcr.io/some-natalie/some-natalie/command-injection-noshell:amd64-latest
# create manifest
crane index append -t ghcr.io/some-natalie/some-natalie/command-injection-noshell:latest -m ghcr.io/some-natalie/some-natalie/command-injection-noshell:amd64-latest -m ghcr.io/some-natalie/some-natalie/command-injection-noshell:arm64-latest
```

```
# build and push arm64
docker build --platform=linux/arm64 -f noshell-noroot-python.Dockerfile -t ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:arm64-latest .
docker push ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:arm64-latest
# build and push amd64
docker build --platform=linux/amd64 -f noshell-noroot-python.Dockerfile -t ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:amd64-latest .
docker push ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:amd64-latest
# create manifest
crane index append -t ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:latest -m ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:amd64-latest -m ghcr.io/some-natalie/some-natalie/command-injection-noshell-noroot:arm64-latest
```
