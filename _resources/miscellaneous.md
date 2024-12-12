---
title: "Miscellaneous"
excerpt: "little bits of shell code that have no other home"
---

- [Alpine packages](#alpine-packages)
- [Clamav](#clamav)
- [Jekyll](#jekyll)

---

## Alpine packages

Search if a package is available in the APK-compatible package repository of Alpine (free), Chainguard-base (paid, with or without FIPS), or Wolfi-base (free).

```shell
function apk-find {
  if [ "${1}" = "" ]; then
    echo "hint ... use -h for help"
    return
  fi
  while getopts "hc:f:w:a:" opt; do
    case ${opt} in
      h)
        echo "Usage: apk-find [options] [package]"
        echo "Search for an Alpine/Wolfi/Chainguard package by name within a container."
        echo "Options:"
        echo "  -c  Search for packages in the Chainguard-Base repos."
        echo "  -f  Search for packages in the Chainguard-Base-FIPS repos."
        echo "  -w  Search for packages in the Wolfi repos."
        echo "  -a  Search for packages in the Alpine repos."
        echo "  -h  Display this help message."
        return 0 ;;
      c)
        image=cgr.dev/chainguard-private/chainguard-base:latest ;;
      f)
        image=cgr.dev/chainguard-private/chainguard-base-fips:latest ;;
      w)
        image=cgr.dev/chainguard/wolfi-base:latest ;;
      a)
        image=alpine:latest ;;
      \?)
        echo "Invalid option: $OPTARG" 1>&2
        echo "hint ... use -h for help"
        return 1 ;;
    esac
  done
  docker run -it --rm $image /bin/sh -c "apk update && apk search $2"
}
```

> Make sure you specify the fully-qualified image name for those folks using private registries!
{: .prompt-info}

---

## ClamAV

Usually don't need [clamav](https://www.clamav.net/) at all, but when I do ... I really do.

```shell
# install via homebrew
brew install clamav

# there's no config file it needs by default
# make the most basic one if it's not there
echo "DNSDatabaseInfo current.cvd.clamav.net\nDatabaseMirror database.clamav.net" > /opt/homebrew/etc/clamav/freshclam.conf

# update the database
freshclam

# scan a directory
clamscan --infected --recursive path/to/directory
```

---

## Jekyll

Check a Jekyll website for broken links and other issues with [htmlproofer](https://github.com/gjtorikian/html-proofer).

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
      bundle exec htmlproofer _site --disable-external"
}
```

Build and run a Jekyll website in the current working directory, available at `http://localhost:4000/`.  This script will clean up from the previous build if you pass `-c` as an argument.

```shell
function run-website {
  if [ "${1}" = "-h" ]; then
    echo "Usage: run-website"
    echo "Build and run the website in current working directory with Jekyll."
    echo "Website will be available at http://localhost:4000."
    return
  fi
  if [ "${1}" = "-c" ]; then
    echo "Cleaning up first ..."
    rm -rf Gemfile.lock _site .jekyll-cache
  fi
  docker run -it --rm \
    --volume="$PWD:/work" \
    -p 4000:4000 \
    ghcr.io/some-natalie/jekyll-in-a-can:latest
}
```
