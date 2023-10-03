---
title: "Removing big files from repos using BFG"
date: 2022-10-25
categories:
  - blog
tags:
  - git
classes: wide
excerpt: "What does the 'deny updating a hidden ref' error even mean?"
---

A common problem in moving to git is cleaning large files (like document files, multimedia, etc.) out of a repository.  There's a tool that's designed to do exactly this called [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) - it's fast and very simple.  I recently ran into a bit of a situation worth documenting, since it took an hour of searching Stack Overflow to figure out.  I thought the big files were gone, then when I pushed the now-clean repo, I got this lovely message:

```console
$ git push --force
Total 0 (delta 0), reused 0 (delta 0), pack-reused 0
To https://github.com/some-natalie/bookish-waffle.git
 ! [remote rejected] refs/pull/1/head -> refs/pull/1/head (deny updating a hidden ref)
error: failed to push some refs to 'https://github.com/some-natalie/bookish-waffle.git'
```

## What happened?  Why?

The repository that I was cleaning large files out of had (already merged) pull requests in it.  A [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests) is the fundamental way to propose changes to a codebase, so surely using BFG here was already documented somewhere.  In order to track these code changes between branches (or forks, which are their own repository), GitHub uses "synthetic"[^1] git references[^2] that are read-only.  These track changes that _would_ happen, like a future merge commit.  Merged pull requests also persist, even if the branch/fork has been deleted, to provide a history of the changes that were made and the discussion that happened at the time.  Because they're read-only and not real, BFG can't update/clean them, but in rewriting history, that's what we're asking it to do - which causes the error message.

## How to (mostly) clean it anyways

1. We'll need to _remove_ the files first.

    ```console
    # Move into that repo's directory
    $ cd bookish-waffle

    # Remove the file(s)
    $ rm Slides\ for\ Lab.pptx

    # Check the status of those files
    $ git status
    On branch main
    Your branch is up to date with 'origin/main'.

    Changes not staged for commit:
      (use "git add/rm <file>..." to update what will be committed)
      (use "git restore <file>..." to discard changes in working directory)
      deleted:    Slides for Lab.pptx
      deleted:    Slides for Lab 2.pptx

    no changes added to commit (use "git add" and/or "git commit -a")

    # Stage, commit, and push removing these files
    $ git add .

    $ git commit -m "remove powerpoint slides"
    [main ded29e8] remove files
      2 files changed, 0 insertions(+), 0 deletions(-)
      delete mode 100644 Slides for Lab 2.pptx
      delete mode 100644 Slides for Lab.pptx

    $ git push
    Enumerating objects: 3, done.
    Counting objects: 100% (3/3), done.
    Delta compression using up to 16 threads
    Compressing objects: 100% (2/2), done.
    Writing objects: 100% (2/2), 457 bytes | 457.00 KiB/s, done.
    Total 2 (delta 1), reused 0 (delta 0), pack-reused 0
    remote: Resolving deltas: 100% (1/1), completed with 1 local object.
    To https://github.com/some-natalie/bookish-waffle.git
      deba21f..ded29e8  main -> main
    ```

1. Now create a bare clone of the repository.

    ```console
    # A bare clone we're using for BFG
    $ git clone --mirror https://github.com/some-natalie/bookish-waffle.git 
    Cloning into bare repository 'bookish-waffle.git'...
    remote: Enumerating objects: 34, done.
    remote: Counting objects: 100% (34/34), done.
    remote: Compressing objects: 100% (29/29), done.
    remote: Total 34 (delta 10), reused 15 (delta 2), pack-reused 0
    Receiving objects: 100% (34/34), 82.13 KiB | 744.00 KiB/s, done.
    Resolving deltas: 100% (10/10), done.
    ```

1. Let's edit our `config` file to tell git to not worry about the "fake" references like pull requests.  You'll change the `fetch` and `push` refs to look roughly like this.  The `+` tells git to update it even if it isn’t a [fast-forward](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging) ([docs](https://git-scm.com/docs/git-fetch)).

    ```config
    [core]
        repositoryformatversion = 0
        filemode = true
        bare = true
        ignorecase = true
        precomposeunicode = true

    [remote "origin"]
        url = https://github.com/some-natalie/bookish-waffle.git
        fetch = +refs/heads/*:refs/heads/*
        fetch = +refs/tags/*:refs/tags/*
        push = +refs/heads/*:refs/heads/*
        push = +refs/tags/*:refs/tags/*
        mirror = true
    ```

1. Move into the bare clone and run BFG.  In this case, we're removing two PowerPoint files.  BFG prints out quite a bit of useful information by default about what's getting removed, the history that's being changed, etc.

    ```console
    $ bfg --delete-files *.pptx bookish-waffle.git/

    Using repo : /Users/some-natalie/xfer/bookish-waffle.git

    Found 13 objects to protect
    Found 4 commit-pointing refs : HEAD, refs/heads/main, refs/pull/1/head, refs/pull/2/head

    Protected commits
    -----------------

    These are your protected commits, and so their contents will NOT be altered:

    * commit ded29e83 (protected by 'HEAD')

    Cleaning
    --------

    Found 8 commits
    Cleaning commits:       100% (8/8)
    Cleaning commits completed in 62 ms.

    Updating 3 Refs
    ---------------

      Ref                Before     After
      --------------------------------------
      refs/heads/main  | ded29e83 | 130d8c0e
      refs/pull/1/head | d1c81969 | c82291af
      refs/pull/2/head | 8516f005 | 064ef99a

    Updating references:    100% (3/3)
    ...Ref update completed in 50 ms.

    Commit Tree-Dirt History
    ------------------------

      Earliest      Latest
      |                  |
      . .  D D  D D  D m

      D = dirty commits (file tree fixed)
      m = modified commits (commit message or parents changed)
      . = clean commits (no changes to file tree)

                              Before     After
      -------------------------------------------
      First modified commit | d1c81969 | c82291af
      Last dirty commit     | deba21f2 | 66caa179

    Deleted files
    -------------

      Filename                Git id
      ------------------------------------------
      Slides for Lab 2.pptx | 5a283fd9 (71.4 KB)
      Slides for Lab.pptx   | 5a283fd9 (71.4 KB)


    In total, 9 object ids were changed. Full details are logged here:

      /Users/some-natalie/xfer/bookish-waffle.git.bfg-report/2022-10-28/09-41-37

    BFG run is complete! When ready, run: git reflog expire --expire=now --all && git gc --prune=now --aggressive
    ```

1. Now let's finish with what it told us to do!  While each commit is still there, the file itself is now gone.

    ```console
    $ cd bookish-waffle.git
    
    $ git reflog expire --expire=now --all && git gc --prune=now --aggressive
    Enumerating objects: 30, done.
    Counting objects: 100% (30/30), done.
    Delta compression using up to 16 threads
    Compressing objects: 100% (27/27), done.
    Writing objects: 100% (30/30), done.
    Building bitmaps: 100% (8/8), done.
    Total 30 (delta 11), reused 16 (delta 0), pack-reused 0

    $ git push --force
    Enumerating objects: 30, done.
    Writing objects: 100% (30/30), 15.79 KiB | 15.79 MiB/s, done.
    Total 30 (delta 0), reused 0 (delta 0), pack-reused 30
    remote: Resolving deltas: 100% (11/11), done.
    To https://github.com/some-natalie/bookish-waffle.git
      + ded29e8...130d8c0 main -> main (forced update)
    ```

    ![clean-history](/assets/graphics/2022-10-28-no-files.png)

## Are those files _truly_ gone?

Yes, in that they are no longer contained anywhere in the history of any open branches in that repository only.  If these files were part of a pull request, they'll still be in the history of that PR.  It doesn't clean forks because forks are their own repository.  It also doesn't "magically" remove them from the local copies that exist anywhere it'd be worked on - think developer laptops, build servers, deployment targets, etc.  It's also advisable to have everyone working out of that repository to clone a new copy of it to work from or rebase their work on top of this new clean copy.  Between forks, local copies, and other remotes, re-introducing that dirty history is a risk.  Because of this, all secrets committed into a repository should be considered compromised.  **No exceptions.**

If these are large (non-secret) files, consider using [git-lfs](https://git-lfs.github.com/) to version-control them going forward.  Another option to consider is an artifact storage system if it's a "finished" build artifact instead of storing it directly in the repository.

For secrets, all secrets committed are compromised.  You need to rotate them.  Going forward, there's a couple options to prevent this - broadly categorized as things that run on individual laptops/endpoints (pre-commit hooks) and things that run on the server (pre-receive hooks).[^3]  Pre-commit hooks run on the user-side, so they must be configured by each developer.  Pre-receive hooks run on the server-side, so can run regardless of individual developer setup.

- For GitHub, use the built-in [secret scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning) with [push protection](https://docs.github.com/en/enterprise-cloud@latest/code-security/secret-scanning/protecting-pushes-with-secret-scanning).  It runs on the server side, so you don't need to do anything more than turn it on.  For public repositories on GitHub.com, this is already on.
- For non-GitHub platforms, consider using [OWASP SEDATED](https://github.com/OWASP/SEDATED) if you can configure pre-receive hooks.  It may require a bit of regular expressions to set up the first time, but it's undramatic once you get it going.
- For pre-commit hooks, consider using [git-secrets](https://github.com/awslabs/git-secrets) from AWS Labs.  It's one of the easier hooks to install and configure, but this must be done on every single machine.  Pre-commit hooks only work if they run on every machine and every commit.

---

## Disclosure

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.

## Footnotes

[^1]: Same general feature with a different name for other repo hosting products.  "Pull request" and `refs/pull` in GitHub becomes "merge request" and `refs/merge-request` in GitLab or "pull request" and `refs/pull-request` in Atlassian products (BitBucket/Stash).  Atlassian has a great blog article about _why_ these refs exist [here](https://blog.developer.atlassian.com/a-better-pull-request/).
[^2]: You can read more about git references in the [documentation](https://git-scm.com/book/en/v2/Git-Internals-Git-References).
[^3]: More about git hooks in the [documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks).
