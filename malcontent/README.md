## malcontent workflows

weird uptick in the number of folks wanting to talk about differential analysis for binary capabilities lately, but the tool and workflows we use in house are not great examples to walk through without _also_ looking at a bunch of other things.  these are all using the free `docker` packaging at `cgr.dev/chainguard/malcontent:latest` ...

first, go to the [project's readme file](https://github.com/chainguard-dev/malcontent) and read up on all the various output options, conditions to fail the run (eg, a new `high` impact capability), etc.

> [!IMPORTANT]
> :nut_and_bolt: :wrench: some assembly required to hook this into your CI system of choice ... here's a few examples i use

> [!WARNING]
> this is literally a ton of yara rules telling you capabilities without context ... it is _not_ exactly a malware scanner in and of itself.  use good judgement, lol.

### run differential analysis on a pull request, print the diff in the PR comments

see this workflow - [diff.yaml](diff.yaml)

### analyze a repository (plus LFS content), print the output in github actions

see this workflow - [analyze.yaml](analyze.yaml)

### scan an image for potential malware, producing a report in markdown

```shell
docker run --rm \
  -v .:/tmp \
  cgr.dev/chainguard/malcontent:latest \
  --format=markdown \
  --output=/tmp/malcontent.md \
  scan -i ghcr.io/some-natalie/jekyll-in-a-can:latest
```

produced this [example report](example-reports/container-scan.md)

### analyze a binary in depth, producing a json report

```shell
docker run --rm \
  -v .:/tmp \
  cgr.dev/chainguard/malcontent:latest \
  --format=json \
  --output=/tmp/malcontent.json \
  analyze /tmp/nc
```

produced this [example report](example-reports/nc-analyze.json)
