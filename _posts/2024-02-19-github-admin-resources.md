---
title: "GitHub Enterprise administration resources"
date: 2024-02-19
classes: wide
excerpt: "A summary of publicly-available GitHub things I've done that you might be looking for on my website."
categories:
- blog
tags:
- github-enterprise
pin: true
---

> This post links to all the publicly-accessible GitHub content I've written, coded, or talked to.[^found]  **I've left GitHub.**  As this website is mostly things _I'm_ learning and making repeatable (e.g., things built/learned from common customer conversations), **expect less GitHub-focused content moving forward.**[^feels]  I'd like to un-pin a lot of things here to make room for ✨ **new adventures** ✨ without leaving a huge chunk of traffic to this site reliant on searching or bookmarks.
{: .prompt-info}

![octocat](/assets/graphics/2024-02-19-admin/some-natalie-octocat.png){: .w-50 .rounded-10 .right}

- ⚡ [Actions](#github-actions) talks, writings, and projects
- 💼 [Business](#business) stuff - chargebacks, license/cost management, the costs of builds
- 🔐 [Security](#security) projects mostly related to Advanced Security features
- 👩‍💻 [Administration](#administration) general admin tools in the toolbox

## GitHub Actions

- [Architecture guide to self-hosted GitHub Actions runners](../arch-guide-to-selfhosted-actions) - when you absolutely, positively have to host it yourself, here's some help!
- [Threat modeling the GitHub Actions ecosystem](../threat-modeling-actions) - understand and secure the most critical part of your software supply chain - where you build and ship your code! (from BSides Boulder 2023)
- [Securing self-hosted GitHub Actions with Kubernetes and actions-runner-controller](../securing-ghactions-with-arc) - self-hosted GitHub Actions runners and Kubernetes are a natural fit - let's put them together securely. (from CNCF CloudNativeSecurityCon 2023)
- [Kubernoodles](../../kubernoodles) - my demo and reference architecture for using actions-runner-controller in the enterprise.  I'll likely still keep this up to date from time to time.
- [Skilled teleportation](https://github.com/some-natalie/skilled-teleportation) - a GitHub Action to bundle up Actions on the marketplace to fling across an airgap and import into GitHub Enterprise Server.
- [Runner reaper](https://github.com/some-natalie/runner-reaper) - a GitHub Action to remove unresponsive or offline self-hosted runners.

## Business

- Chargeback (pass through) billing - know who's using what within your Enterprise account.
  - [Cloud (SaaS)](../chargeback-cloud)
  - [Server (self-hosted)](../chargeback-server)
- Cost of waiting on builds - the most underrated cost of continuous integration
  - [GitHub blog](https://github.blog/2022-12-08-experiment-the-hidden-costs-of-waiting-on-slow-build-times/) post
  - [Business-tagged posts](../../tags/business), as I've revisited this several times now
- [Don't show me your intricate cost comparison spreadsheet](../cloud-spreadsheets) - it's never the right place to start a discussion.

## Security

- [GHAS to CSV](https://github.com/advanced-security/ghas-to-csv) exports your Dependabot, secret scanning, and code scanning results across a repository, all repositories in an organization, or everything in your enterprise.  (now owned by GitHub's field team)
- [Enterprise security team](https://github.com/advanced-security/enterprise-security-team) is a set of scripts to create and manage a uniform team of people on all organizations in your enterprise that has the [security manager](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization) role.  (now owned by GitHub's field team)
- [CodeQL in container builds](../codeql-container-builds) explains how to use CodeQL inside of a container with or without GitHub Actions.
- [Dependabot on RedHat Enterprise Linux](../dependabot-on-rhel-docker/) walks through setting up self-hosted Actions runners for GitHub Enterprise Server to automatically updating your dependencies with Dependabot.
- [Don't scan your code on every push](../scanning-code-on-every-push) to save build resources without compromising your application security posture.
- [Stop using ITSM for application security](../stop-using-itsm-for-appsec) - a (mostly tame) rant, with stories, about how using an ITSM system to manage application security alerts causes way more harm than good.

## Administration

Part of all those years of experience is a ton of small scripts and other tidbits of reusable code.  Most of these were parts of proof of concepts, designed to be added into other playbooks for a larger task.

- [gh-org-admin-promote](https://github.com/some-natalie/gh-org-admin-promote) - a GitHub CLI extension to promote an enterprise administrator to organization owner for all organizations in the enterprise.
- [get-ghes-reports.py](https://github.com/some-natalie/dotfiles/blob/main/scripts/get-ghes-reports.py) - GitHub Enterprise Server has several reports available for enterprise admins.  This script simply grabs the one you want programmatically and saves it to disk.
- [ghes-ghas-licenses.py](https://github.com/some-natalie/dotfiles/blob/main/scripts/ghes-ghas-licenses.py) - Outputs a CSV file of who's using your Advanced Security licenses, on what repo, and when they last pushed to each one.  The number of licenses in use is the sum of unique users.[^dupe]
- [ghes-suspend-all-dormants.py](https://github.com/some-natalie/dotfiles/blob/main/scripts/ghes-suspend-all-dormants.py) - Grabs the `dormant_users` report, then suspends all the users in it over the API.
- [git-history-report.sh](https://github.com/some-natalie/dotfiles/blob/main/scripts/git-history-report.sh) - Outputs a CSV file of change sums to the main branch, whether or not it was a signed commit, and (optionally) outputs the diff of each commit to a file in an adjacent folder.  Reproduces a "chain of custody" type of report.
- [gitlog-to-csv](https://github.com/some-natalie/gitlog-to-csv) - same as above, but as a GitHub Action.
- [is-github-ip.py](https://github.com/some-natalie/dotfiles/blob/main/scripts/is-github-ip.py) - checks if a given IP address presently belongs to GitHub.com using the API.
- [lfs-export.py](https://github.com/some-natalie/dotfiles/blob/main/scripts/lfs-export.py) - GitHub Enterprise Server migrations don't export (or import) LFS data.  This iterates over all repositories in an organization to grab that and shove it into a directory to fling wherever it needs to go.
- [search.py](https://github.com/some-natalie/dotfiles/blob/main/scripts/search.py) - Iterates through the search API on GHES _en masse_ for a given string.  Does not capture non-default branches, comments, commit messages, PR content, issues, discussions, etc., as best as I'm aware.
- [GHES SQL queries](https://github.com/github/platform-samples/tree/master/sql) - ⚠️ **danger zone** ⚠️ Never run these against your appliance, instead use a backup restoration as outlined in the [usage directions](https://github.com/github/platform-samples/blob/master/sql/USAGE.md).  Even then, there is _**NO**_ guarantee of schema stability between versions of GHES.  You can waste a lot of time here.
  - [audit queries](https://github.com/github/platform-samples/tree/master/sql#audit-queries) return lists of credentials, their scope and age and owner, and more.
  - [metrics queries](https://github.com/github/platform-samples/tree/master/sql#metrics-queries) summarize usage metrics such as global language use, PR and issue activity, and more.
  - [security queries](https://github.com/github/platform-samples/tree/master/sql#security-queries) should be deprecated in favor of using something like [ghas-to-csv](https://github.com/advanced-security/ghas-to-csv) to scrape the API instead.  This API didn't exist when I was creating these queries.

---

## Disclosure

As it's always been, all opinions here are my own and not any past, present, or future employer.

## Footnotes

[^feels]: I'm now exploring software supply chain security - _using_ GitHub is still a huge part of my professional life.  Most learning happens on the job and for the first time in 9 years, directly leading or advising on GitHub as a software factory within a gigantic heavily-regulated enterprise isn't part of that.  I have lots of feelings about this, but probably won't write about that anytime soon.  Right now, I'm looking forward to diving headfirst into a new adventure. 🚀
[^dupe]: Astute admins know this report exists already, but it's buried in stafftools.  There's no way to download this file programmatically, so this uses the API to reconstruct it.  Run [gh-org-admin-promote](https://github.com/some-natalie/gh-org-admin-promote) first to get everything in the enterprise.
[^found]: All that I've found, anyways ... I may sort through all of my gists and such at some point too and add even more to this. 🙈
