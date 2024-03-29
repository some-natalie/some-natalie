---
title: "Git functions and aliases"
excerpt: "make git easier"
---

## Shell functions

> [zshrc file](https://github.com/some-natalie/dotfiles/blob/main/zsh/zshrc) on GitHub
{: .prompt-info}

### Branch cleanup

This function will remove all local branches that don't exist on the remote.  I work with GitHub repos that automatically delete branches once a PR is merged, so I use it to keep my local branches list clean.

```shell
function git-cleanup {
  git fetch -p && git branch -vv | awk '/: gone]/{print $1}' | xargs git branch -D
}
```

### Identity management

Set up a git repository to use [Sigstore gitsign](https://docs.sigstore.dev/signing/gitsign/) and company identity store for work repositories.

```shell
# Config git repo for work
function setup_gitsign () {
  git config --local commit.gpgsign true
  git config --local tag.gpgsign true
  git config --local gpg.x509.program gitsign
  git config --local gpg.format x509
  git config --local gitsign.connectorID https://accounts.google.com
}
```

Set up a git repository to use [SSH commit signing](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification#ssh-commit-signature-verification) using the specified key.

```shell
# Config git repo for personal
function setup_gitssh () {
  git config --local user.signingKey = /Users/natalie/.ssh/github-signing.pub
  git config --local commit.gpgsign true
  git config --local tag.gpgsign true
  git config --local gpg.x509.program ssh
  git config --local gpg.format ssh
}
```

### Nuke it from orbit

Reset the working directory to the last commit, remove any untracked files, and abort any rebase in progress. ([source](https://laravel-news.com/the-ultimate-git-nah-alias))

```shell
function git-nah () {
  git reset --hard
  git clean -df
  if [ -d ".git/rebase-apply" ] || [ -d ".git/rebase-merge" ]; then
    git rebase --abort
  fi
}
```

### One-liners

List all branches not tracked with a remote branch.

```shell
git branch -vv | cut -c 3- | awk '$3 !~/\[/ { print $1 }'
```

Print a list of files in a repo by number of commits touching them, useful for finding the most changed files.

```shell
git log --pretty=format: --name-only | sort | uniq -c | sort
```

Print number of commits per day, sorted by date.

```shell
git log --date=short --pretty=format:%ad | sort | uniq -c
```

## Git aliases

> [gitconfig files](https://github.com/some-natalie/dotfiles/tree/main/git) on GitHub
{: .prompt-info}

### List branches

List all the branches

```conf
br = branch --format='%(HEAD) %(color:yellow)%(refname:short)%(color:reset) - %(contents:subject) %(color:green)(%(committerdate:relative)) [%(authorname)]' --sort=-committerdate
```

Here's what it looks like in practice:

![git-br](/assets/graphics/2022-12-02-git-br.png){: .shadow .rounded-10 .w-75}

### History, but pretty

Show the history of the current branch, but pretty

```conf
graph = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %Cblue%cn%Creset committed %s %Cgreen(%cr)%Creset' --abbrev-commit --date=relative
```

Here's what it looks like in practice:

![git-graph](/assets/graphics/2022-12-02-git-graph.png){: .shadow .rounded-10 .w-75}
