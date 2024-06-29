---
title: "Git configurations in a code audit"
date: 2024-06-17
excerpt: "From BSides Boulder 2024, here's a few things about git configuration I wish I knew before my first code audit got started."
tags:
- security
- git
image: /assets/graphics/2024-06-14-whodunnit-git-repo/frozen-audit.jpg
---

> From [BSides Boulder 2024](https://bsidesboulder.org/), many attempts to figure out **who** did **what**, **when**, **where**, and **why** in a git repository (and some lessons learned, too).  This is an expanded set of slides and resources since shown live on 14 June 2024.
>
>🪻 [Overview and contents here, if you missed it!](../git-code-audits) 🪻
{: .prompt-info}

The biggest, coolest, most compelling thing about git is also what makes it so terribly unintuitive to audit.

<div style="text-align:center"><p style="font-size: 20px"><b>
✨ git is distributed ✨
</b></p></div>

Easy conflict resolution eliminated many anti-social tendencies like "locking" files to prevent colleagues from changing them.  This didn't prevent changes or conflicts during development, though.  Some of my own early-career support cases were unlocking TFS or Visual SourceSafe files.  It also enabled completely asynchronous and decentralized development, allowing for broad adoption outside of big companies.  Although it's common because they add a lot of helpful features, there's no need to use a centralized service for a team to develop together with git[^no-github].  These trade-offs come with audit concerns that are also features, as almost everything we're talking about today is _local to the users_.

Our (clever) users on endpoints are responsible for much of our audit scope, including:

- **Identity** - users are who they say they are
- **Content configuration** - LFS files, ignoring files, adding secrets
- **Local execution** - hooks, executables in repos, more?

## Version control is magic

There's a lot in this magic directory, `~/repository/.git`, and most of it isn't too necessary to understand in depth for an audit.  I put some `****` around what's usually interesting to auditors based on my experiences.

```shell-session
ᐅ ls -la .git

total 80
drwxr-xr-x@  15 natalie  staff   480B May  2 17:56 ./
drwxr-xr-x@  18 natalie  staff   576B Apr 30 09:56 ../
-rw-r--r--    1 natalie  staff    26B May  2 17:26 COMMIT_EDITMSG
-rw-r--r--@   1 natalie  staff    96B May 20 11:39 FETCH_HEAD
-rw-r--r--    1 natalie  staff    21B May  2 17:56 HEAD
-rw-r--r--    1 natalie  staff    41B May  2 17:56 ORIG_HEAD
-rw-r--r--    1 natalie  staff   653B May  2 17:09 config        ****
-rw-r--r--@   1 natalie  staff    73B Feb 18 13:01 description
drwxr-xr-x@  15 natalie  staff   480B Feb 18 13:01 hooks/        ****
-rw-r--r--    1 natalie  staff    10K May  2 17:56 index
drwxr-xr-x@   3 natalie  staff    96B Feb 18 13:01 info/
drwxr-xr-x@   4 natalie  staff   128B Feb 18 13:01 logs/         ****
drwxr-xr-x@ 166 natalie  staff   5.2K May 20 11:39 objects/
-rw-r--r--    1 natalie  staff   2.0K Apr 30 21:08 packed-refs
drwxr-xr-x@   6 natalie  staff   192B Apr 30 09:56 refs/
```
{: file='(from inside a git repository)'}

The configuration file and logs tend to be most interesting, then the hooks directory once everyone realizes that executable stuff can live there.  The rest is mostly git internals[^book].

## Order of operations

The file `.git/config` sets the local-to-this-project part of our [git configuration](https://git-scm.com/docs/git-config).  The full settings for git are controlled at three overlapping levels:

1. **System** is system-wide, normally at `/etc/gitconfig`
2. **Global** is user-specific, usually in `~/.gitconfig`
3. **Local** is specific to each repository at `~/repository/.git/config`

The order of resolution is project-specific configurations first, which take precedence over user preferences, then consider system-wide defaults.  This allows for maximum flexibility on a project for users to set their own preferences.

<div style="text-align:center"><p style="font-size: 20px"><b>
Local ➡️ Global ➡️ System
</b></p></div>

However, it also means that **system-wide settings can be overridden by users**.  This means you can't rely on system configuration to meet any audit controls - such as guaranteeing identity or using pre-commit hooks to prevent exposing secrets.  Adding to the challenge, none of these files are version-controlled by the repository.

```shell-session
ᐅ git config --list --show-scope

system  core.symlinks=false
global  core.excludesfile=~/.gitignore_global
global  core.eol=lf
local   _scope _attention _message
```
{: file='(from inside a git repository)'}

⬆️ Above is a nifty command to show which scope is responsible for any and all settings.  It's handy for individual troubleshooting, but not so much for a code audit.  This is because it must be run on every cloned copy of the repo, can change at any time by user preference, and is frequently overwritten by user programs (IDEs, git GUIs, and more).

> Setting anything here is more like a suggestion than a mandate. 🙉
{: .prompt-tip}

## Other config files

![sus-cat](/assets/graphics/2024-06-14-whodunnit-git-repo/sus-cat.png){: .w-50 .shadow .rounded-10 .right }

There are a few more configuration files to be aware of too.  **These get version-controlled within the repository** - a huge advantage when auditing these settings.  We'll talk about them more as they become relevant in our upcoming sections!

- `.gitattributes` - how to handle specific or types of files (store them in LFS or force a line ending character, [docs](https://git-scm.com/docs/gitattributes))
- `.gitignore` - what to ignore (don't commit `**/token.txt` or build caches, [docs](https://git-scm.com/docs/gitignore))
- `.gitmodules` - submodules, or dependencies that are other repos ([docs](https://git-scm.com/book/en/v2/Git-Tools-Submodules))
- `.git-blame-ignore-revs` - what to ignore in `git blame`, handy for large "cleanup" commits.  The history is still there, it's just not shown in the blame output. ([docs](https://git-scm.com/docs/git-blame#Documentation/git-blame.txt---ignore-revs-fileltfilegt))
- `.mailmap` - a map of emails to human names ([example](https://github.com/microsoft/vscode/blob/main/.mailmap), [docs](https://git-scm.com/docs/gitmailmap))
- Platform or integration specific configs like `.gitlab-ci.yml` or the `.github` directory

## Logs

_But wait_, you gasp.  _There's a whole directory called 🪵 `logs` 🪵 so surely that must mean something!_

🛑 Not so fast - let's take a look at an example:

```shell-session
some-code
.git/
└── logs/
    ├── HEAD    (your local state)
    └── refs/
        ├── heads/
        │   └── main
        └── remotes/
            ├── origin/    (the default name)
            │   ├── HEAD
            │   ├── bump-deps    (a branch)
            │   ├── fix-sboms-at-build    (another branch)
            │   ├── dependabot/
            │   │   └── github_actions/
            │   │       ├── actions/
            │   │       │   └── configure-pages-5    (a branch for a PR)
            │   │       └── super-linter/
            │   │           └── super-linter-6    (another PR branch)
            │   └── main    (the default branch)
            └── another-remote/    (if any remotes)
```
{: file=~/repository/.git/logs}

Now to look at one of those logs _(scroll left-to-right to see the full line)_:

```shell-session
261c5ffffea4e2359d30dbd7ea6a675be35a23a9 8fd7f8c7005ad41abe5c48565c2112c8ec133662 Natalie Somersall <some-natalie@chainguard.dev> 1716245692 -0600  commit: bump updates
8fd7f8c7005ad41abe5c48565c2112c8ec133662 701e074443ab1685072364f826fec56404eee237 Natalie Somersall <some-natalie@chainguard.dev> 1716246016 -0600  commit: one more little edit
701e074443ab1685072364f826fec56404eee237 a19fb5f35a7575761c53a6b94ffb7a5f4ec29e20 Natalie Somersall <some-natalie@chainguard.dev> 1716315190 -0600  commit: apparently linkedin didn't work right
a19fb5f35a7575761c53a6b94ffb7a5f4ec29e20 8a58a8b107f6b70e019f1f127fd724cecd5bfc97 Natalie Somersall <some-natalie@chainguard.dev> 1716396352 -0600  pull --tags origin main: Fast-forward
8a58a8b107f6b70e019f1f127fd724cecd5bfc97 398f57cdee8301ada08de1d85a3bf3a4f78daa7e Natalie Somersall <some-natalie@chainguard.dev> 1717943591 -0600  pull --tags origin main: Fast-forward
```
{: file=~/repository/.git/logs/HEAD}

Each entry follows the same form, outlining the following in order:

| What | Example |
| --- | --- |
| Parent commit hash | `261c5ffffea4e2359d30dbd7ea6a675be35a23a9` |
| Commit hash | `8fd7f8c7005ad41abe5c48565c2112c8ec133662` |
| Author name and email (reportedly) | `Natalie Somersall <some-natalie@chainguard.dev>` |
| Commit time (as set by the endpoint or author) | `1716245692 -0600` |
| What happened (allegedly, in the commit message) | `commit: bump updates` |

These logs are used by other tools such as IDEs, git GUI clients, and more.  They're used to understand the order of changes and (as best as possible) when they were made, but these are all self-reported data from endpoints ... **not the magic we need for an audit.** 🫠

> If the fundamental configurations are controlled by end users, where can we get the information we need to definitively know who did what?
>
> 🕵️‍♀️ **Next up** - a tour of how git thinks about identity and how we can answer audit questions on it.  [Part 3: Understanding identity in git repositories](../git-identity)
{: .prompt-info}

---

## Footnotes

[^book]: [Pro Git book](https://git-scm.com/book/en/v2) on git's website, written by Scott Chacon and Ben Straub, continues to be the definitive source of all things git - especially all the internals!
[^no-github]: PostgreSQL, git, and the Linux kernel are not developed on GitHub.  They use [email patches](https://git-send-email.io) to collaborate instead.  This workflow is also exceptionally helpful to promote code "low-to-high" (through an airgap).  Here's a [helpful blog post](https://nasamuffin.github.io/git/open-source/email/code-review/2019/05/22/how-i-learned-to-love-email-patches.html) that I would share with teams new to this development pattern.
