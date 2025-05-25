---
name: Repository maintenance checklist
about: Checklist for routine maintenance on repositories
title: "Repo maintenance checklist"
---

### kubernoodles

[project link](https://github.com/some-natalie/kubernoodles)

- [ ] look over open issues
- [ ] merge dependabot PRs
- [ ] deploys still work for dev and prod
- [ ] bump dependencies manually for applicable [images](https://github.com/some-natalie/kubernoodles/tree/main/images)
  - [ ] actions/runner agent ([link](https://github.com/actions/runner))
  - [ ] actions/runner-container-hooks ([link](https://github.com/actions/runner-container-hooks))
  - [ ] docker engine ([link](https://docs.docker.com/engine/release-notes/24.0/))
  - [ ] docker compose ([link](https://docs.docker.com/compose/release-notes/))
  - [ ] dumb-init ([link](https://github.com/Yelp/dumb-init))
  - [ ] UBI8/ubi8-init base image ([link](https://catalog.redhat.com/software/containers/ubi8/ubi-init/5c359b97d70cc534b3a378c8))
  - [ ] UBI9/ubi9-init base image ([link](https://catalog.redhat.com/software/containers/ubi9-init/6183297540a2d8e95c82e8bd))
- [ ] bump stuff in the cluster
  - [ ] cilium
  - [ ] tetragon
  - [ ] actions-runner-controller
  - [ ] kubernetes
- [ ] cron job still running to build images
- [ ] cron job still running to scan and update the README.md file

### fedora-acs-override

[project link](https://github.com/some-natalie/fedora-acs-override)

- [ ] look over open issues
- [ ] merge dependabot PRs
- [ ] cron job still running to build RPMs

### Jekyll-in-a-can

[project link](https://github.com/some-natalie/jekyll-in-a-can)

- [ ] merge dependabot PRs
- [ ] cron job still running to build images

### skilled-teleportation

[project link](https://github.com/some-natalie/skilled-teleportation)

- [ ] look over open issues
- [ ] merge dependabot PRs

### runner-reaper

[project link](https://github.com/some-natalie/runner-reaper)

- [ ] look over open issues
- [ ] merge dependabot PRs

### gitlog-to-csv

[project link](https://github.com/some-natalie/gitlog-to-csv)

- [ ] merge dependabot PRs
