---
date: 2024-11-18
title: "Grype has a config file"
tags:
  - grype
  - containers
visibility: public
---

A nifty tidbit if you travel a lot.  Grype has a config file.  Before you leave the house, run `grype db update` to pull down the latest vulnerability data, then disable the auto-update features in the config file:

```yaml
# sometimes the hotel wifi is awful and yesterday's data is good enough
check-for-app-update: false
db:
  auto-update: false
```
{: file='~/.grype.yaml' }

I revert it by having the exact opposite values commented out to swap back and forth easily, then doing a quick edit.  Docs here - <https://github.com/anchore/grype#configuration>
