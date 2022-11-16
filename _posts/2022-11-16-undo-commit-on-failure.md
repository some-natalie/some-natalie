---
title: "Undo a commit on a failed GitHub Actions job"
date: 2022-11-16
categories:
  - blog
tags:
  - CI
  - git
classes: wide
excerpt: "How to automatically roll back code changes in GitHub Actions"
---

An interesting problem came my way not too long ago about how to undo a code change when a job fails in GitHub Actions.  Since this job is triggered on a commit, we'd have to use `git revert` to create and push a commit to undo itself.

The use case is an intermittent failure of `terraform apply` after `terraform plan` succeeded.  The team wanted to roll back those changes in git automatically, then be able to troubleshoot once everything was working again.  This could also be helpful if the team is using git to store configuration files to services that work as expected in one environment, but not others.  Here's how to do it:

{% raw %}

```yaml
name: Randomly fail and undo the change

on:  # this runs on push to the main branch, but should be customized for your deployments/builds
  push:
    branches:
    - main
    paths:
    - 'test.txt' # only run this on pushes that touch the files you need

jobs:
  randomly-fail:  # this step randomly simulates failure
    runs-on: ubuntu-latest
    steps:  
      - name: Randomly fail
        run: |
          if [ "$(($RANDOM % 2))" -eq 0 ]; then
            echo "randomly failing"
            exit 1
          fi
  
  revert-change:
    runs-on: ubuntu-latest
    needs: [ randomly-fail ]  # we need to say the job that sometimes fails is a dependency
    if: ${{ failure() }}      # because if it fails
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2  # check out the current and prior state
      - name: "Revert the commit that triggered this run, then push it to main"
        shell: bash
        run: |
          echo "Reverting ${{ github.sha }}"
          git config user.name github-actions
          git config user.email github-actions@github.com
          git revert --no-edit ${{ github.sha }}
          git push origin main
```

{% endraw %}

Here's what that looks like when the first part fails, but the second succeeds:

![actions-view](/assets/graphics/2022-11-16-undo-commit-on-failure.png)

And in the git history, a commit from `github-actions` undoing my failed code changes:

![history-view](/assets/graphics/2022-11-16-undo-history.png)

Now here's a few ways on how to do it better - not using my demonstration-quality shenanigans like pushing to the main branch.

First, pay attention to the job trigger (the `on:` block) and make sure it's only running when appropriate.  A complete list of events that could possibly trigger a job is [here](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows).  You should further filter it to only run on the appropriate files/paths/branches, using this [handy cheat sheet](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet).

Set up branch protections for the main/default branch and instead of pushing directly to that branch, change that last line to push to the correct git ref.  Your workflow can pick this up in an [environment variable](https://docs.github.com/en/actions/learn-github-actions/environment-variables), such as which branch or pull request triggered the run.

Be aware of and possibly set up some validation that you won't recursively undo more changes than the one that started this workflow.  To this end, _always_ use the default `GITHUB_TOKEN` and not a personal access token or other credential.  This will prevent triggering recursive workflows ([documentation](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow)) by pushing code.  The rest of this recursion prevention will be up to whatever else it is going on while things are being undone.  

Lastly, if you have other methods of rolling back changes at the ready, that's probably a better place to start than this.  This workflow only rolls back the changes in the code without validating anything about the state of the environment before, during, or after this change.
