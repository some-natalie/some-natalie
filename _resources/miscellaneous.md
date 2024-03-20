---
title: "Miscellaneous"
excerpt: "little bits of shell code that have no other home"
---

## Jekyll

Check a Jekyll website for broken links and other issues with [htmlproofer](https://github.com/gjtorikian/html-proofer)

```shell
function check-website {
  if [ "${1}" = "-h" ]; then
    echo "Usage: check-website [path]"
    echo "Check website with htmlproofer."
    return
  fi
  rm -rf Gemfile.lock _site .jekyll-cache && \
  docker run -it --rm \
    --volume="$PWD:/work" \
    ghcr.io/some-natalie/jekyll-in-a-can:latest /bin/sh -c \
    "bundle exec jekyll b -d '_site' && \
      bundle exec htmlproofer _site --disable-external \
      --check-html"
}
```

Build and run a Jekyll website in the current working directory.

```shell
function run-website {
  if [ "${1}" = "-h" ]; then
    echo "Usage: run-website"
    echo "Build and run the website in current working directory with Jekyll."
    echo "Website will be available at http://localhost:4000."
    return
  fi
  rm -rf Gemfile.lock _site .jekyll-cache && \
  docker run -it --rm \
    --volume="$PWD:/work" \
    -p 4000:4000 \
    ghcr.io/some-natalie/jekyll-in-a-can:latest
}
```
