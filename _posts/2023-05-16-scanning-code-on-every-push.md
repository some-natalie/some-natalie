---
title: "Scanning your code on every single push"
date: 2023-05-15
categories:
  - blog
tags:
  - CI
  - security
  - dependency-mgmt
  - questionable-ideas
classes: wide
excerpt: "Why it's probably not what you're wanting to do and how to do it anyways."
---

One of the most common questions I'm asked about GitHub, specifically around Actions and the application security features, is "how do I scan my team's code on every single push?"  While it can _technically_ be done, in my experience, it's usually not preceded by understanding the _why_ of doing so.  It provides a false sense of security, can be wasteful of compute resources, and is downright annoying to your developers.

![interrupting-scanner](/assets/graphics/memes/interrupting-scanner.jpeg)
_Just let me finish my train of thought before yelling at me! (╯°□°)╯︵ ┻━┻_

The idea that no such thing as vulnerable code ever can exist misses the continual nature of software development - new vulnerabilities are always being discovered and mitigated, dependencies are always being updated, and new features are always being added, etc.  A scan today couldn't possibly identify all future problems.  Depending on how teams are working, it can also be pretty wasteful - running scans of every "try this config" commit while the team iterates over a problem before they've found something that works.  It's also frustrating to have a bunch of failed checks on code that isn't ready for review.

The one exception to this rule is scanning for secrets, such as private keys and passwords or API tokens.  As covered in a prior post [here](https://some-natalie.dev/blog/omit-PRs-clean-BFG/#are-those-files-truly-gone), once checked into a remote (any remote), the control of that secret has left you and now belongs to anyone who can _ever_ read that repository.  Even if you overwrite history, that doesn't guarantee that the secret isn't already on another machine or that it won't be committed back in from another working branch/fork.

## A better path forward with draft pull requests

Draft pull requests let folks code on their own fork or branch, keep a draft PR open to discuss as needed, then mark as ready to review to kick off scans and any other testing ([docs](https://docs.github.com/en/enterprise-cloud@latest/actions/using-workflows/events-that-trigger-workflows#pull_request)).  No "vulnerable" code gets deployed, even in the lowest dev environment, _and_ you preserve the Freedom to Make Mistakes.

Let's make it so that the scan has to pass before other tests start.  Here's how (insert workflow below)

```yaml
name: Scan code when ready to review

on:
  pull_request: 
    types: 
      - ready_for_review
      - review_requested
    branches:
      - main

jobs:
  << insert code scanning / building steps here >>
```

This gets your proposed changes scanned (or built or whatever you put in that `jobs` step), but only when they're ready for review or a review has been requested - preserving the freedom to tinker without automated code checks before you're ready for a code review.

## How to do it anyways

### Secret Scanning

This is done for you already if you enable [push protection](https://docs.github.com/en/enterprise-cloud@latest/code-security/secret-scanning/protecting-pushes-with-secret-scanning).  It runs (invisibly to users) as a pre-receive hook, blocking high-confidence (or custom) secret patterns from being received and works as a one-click thing on both the cloud and self-hosted GitHub.  If you’re self-hosting a different git server, check out the OWASP Foundation’s [SEDATED](https://github.com/owasp/sedated) project - it’s another pre-receive hook shell script.  I used it for a while and found it to be quite reasonable (even if not as comprehensive) once I’d done some regex fiddling to get some additional patterns blocked.  In any case, these sorts of scripts all work by preventing the git remote server from accepting commits that contain anything that makes the script fail.

![bernie-secrets](/assets/graphics/memes/bernie-secrets.png){: .w-50 .right}

The other path to preventing secrets in code is to use a pre-commit hook.  AWS makes a great one called [git secrets](https://github.com/awslabs/git-secrets).  These run locally and prevent git from creating a commit that causes that script to fail.  It’s a good pattern to work with for a single developer project or two.  At scale, this sort of solution is extraordinarily difficult to prove coverage in an audit and makes endpoint management even more complicated.  It also only prevents _new_ problems, so it won’t catch things that are in the repository history.

At any rate, do _something_ here.  You have no excuse and a $10k/hr AWS bill is literally one of the least bad outcomes of messing up here.

### CodeQL (or other SAST tools)

Run the scan on push to all branches.  All you need to do here is use `on: push` to run the job using whatever scanning tool you’re using within GitHub Actions.  Here's a quick example using [CodeQL](https://codeql.github.com) and Python:

```yaml
name: 'CodeQL scan'

on:
  push:

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: python

      - name: Analyze code and upload results
        uses: github/codeql-action/analyze@v2
```

### Dependency Review

This one is a tiny bit harder, in that it needs you to specify the base and head refs to diff.  To only run it when a manifest changes, they can be listed individually as push paths as shown below.

```yaml
name: 'Dependency Review'

on: 
  push:
    paths:
      - "package.json"  # your manifest(s) here
      - "pom.xml"       # all of them 😊

permissions:
  contents: read

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
    - name: 'Checkout Repository'
      uses: actions/checkout@v3
      with:
        fetch-depth: 2 # checkout this revision and the prior one

    - name: Dependency Review
      uses: actions/dependency-review-action@v3
      with:
        base-ref: refs/heads/main~1
        head-ref: refs/heads/main
```

When a push to any branch would add a vulnerable dependency, here’s the outcome - a failed check! 🎉

![summary](/assets/graphics/2023-05-16-every-push/summary.png)
_detailed summary [here](../../assets/graphics/2023-05-16-every-push/details.png) and [logs](../../assets/logs/dependency-review.txt)_

### Other systems

I'm not sure, to be honest - there’s lots of other systems.  Here's some general advice:

- Consider using a webhook to trigger a response from the other system (if it can be asynchronous)
- Server-side pre-receive hooks are better than client-side pre-commit hooks in almost all circumstances ([git documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks))
- Lots of small, short-lived iterations are better than long change cycles (for appsec and many other things)
- Shifting left is nice and all, but be mindful that frequent interruptions become a hinderance instead of an assistant - even if your intentions are good.

### Disclaimer

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.
