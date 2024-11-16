---
date: 2024-11-15
title: "Helm sub-chart dependencies"
tags:
  - helm
  - containers
  - questionable-ideas
visibility: public
---

TIL that Helm sub-charts cannot specify dependencies on each other or the order of operation they are installed in.

For example, you need a simple PHP app that relies on nginx for load balancing and SQL with some preseeded data or schema applied.  It's not possible to purely state dependencies such that PHP must wait for both nginx and SQL.  SQL must wait for Flyway to pull what it needs from GitHub and initialize that database, but nginx has to let cert-manager do its' thing first ... and so on and so forth. 😬

Instead, health checks and init containers handle that by failing and retrying until the conditions for success are met ... the grey-bearded sysadmin in me feels this is cludgey, but also dreads a return to PID lockfiles and load-bearing sleep statements.
