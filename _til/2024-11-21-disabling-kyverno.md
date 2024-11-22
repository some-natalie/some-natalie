---
date: 2024-11-21
title: "Disabling Kyverno"
tags:
  - kyverno
  - containers
  - kubernetes
  - appsec
visibility: public
---

TIL that you can put Kyverno in audit mode by setting a value in the Helm chart.  It's handy when you inherit a giant blob of policies that "worked on my cluster" but not on yours.  All the failures are logged and the pods show up with warnings, but nothing is stopped.  This allows you to figure out what would need addressing with a new set of policies in bulk, rather than toughing it out through a bunch of "break/fix" cycles.

```yaml
kyvernoPolicies:
  enabled: true
  values:
    validationFailureAction: Audit
```
{: file='~/.values.yaml' }
