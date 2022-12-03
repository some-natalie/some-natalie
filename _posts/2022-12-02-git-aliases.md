---
title: "Git aliases and shortcuts for daily use"
date: 2022-12-02
categories:
  - blog
tags:
  - git
classes: wide
excerpt: "The git aliases and shortcuts that I use daily (and why)"
---

Even though [git](http://git-scm.com/) is one of the most common software programs used in development, I'm continually impressed both at how customizable it is and how often it isn't customized at all!  There are several ways to change how git behaves, with one of the most common being [git aliases](https://git-scm.com/book/en/v2/Git-Basics-Git-Aliases).  These are saved in your [git configuration file](https://git-scm.com/book/en/v2/Customizing-Git-Git-Configuration) (usually `~/.gitconfig`), and added under the `[alias]` heading.  Here's mine [in full](https://github.com/some-natalie/dotfiles/blob/main/git/.gitconfig) as an example.

After spending quite a few years working with git on a daily basis, I've found or written a few of my own that make life easier.

## List branches, sorting by most recent

This alias lists all _local_ branches with name, last commit message and author, most recent commit date - all sorted by date with the most recent branch being at the top.  The asterisk denotes the branch currently checked out.  Here's what it looks like!

![git-br](/assets/graphics/2022-12-02-git-br.png)

And here's how to do the same thing:

```config
[alias]
  br = branch --sort=-committerdate --format='%(HEAD) %(color:yellow)%(refname:short)%(color:reset) - %(contents:subject) %(color:green)(%(committerdate:relative)) [%(authorname)]'
```

:information_source:  There are no line breaks in the code block above, so you'll need to scroll sideways to see it all.  It should be one long line in your `~./gitconfig` file.

If you want it to list all branches, not only ones locally, modify it to include the `-a` switch.  As I worked with teams that had way more branches on the remote than I usually worried myself with, I tended to only care about my branches.

## Show the commit history (log) in a pretty graph

This is a quick alias that creates a colorized text graph out of the `git log` command, very handy for a quick "where am I" understanding of the history.

```config
[alias]
  graph = log --graph --abbrev-commit --date=relative --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %Cblue%cn%Creset committed %s %Cgreen(%cr)%Creset'
```

Here's what it looks like:

![git-graph](/assets/graphics/2022-12-02-git-graph.png)

## Undo that last commit

This alias resets the HEAD to the last commit, allowing you to go back in time by one commit.  It does _not_ commit and push those changes, though.  I use this a lot when messing with configuration files iteratively try something, undo it to the last known "good" state (usually committing/pushing those changes back to my branch), then try something else.  While it makes for a messy branch history, I tend to compensate by using the [squash merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges#squash-and-merge-your-commits) for pull requests.

```config
[alias]
  undo = reset HEAD~1 --mixed
```

## Make up a commit message

Writing commit messages is hard.  Writing _meaningful_ commit messages is [even harder](https://www.freecodecamp.org/news/writing-good-commit-messages-a-practical-guide/).  When I need a "just make one up" message, I'll use one of the two below.  It stages everything and commits with either a bland message or a random smart-ass comment from [whatthecommit.com](http://whatthecommit.com).

```config
[alias]
  comet = commit -am "try this"
  yolo = commit -am "`curl -s http://whatthecommit.com/index.txt`"
```

:information_source:  This is bordering on heresy for some, but I strongly believe that individual commits should _never_ be important, only pull requests.  Meaningful discussion about a set of code changes, reviews, tests, etc., should not happen while you're iterating over the "does it work" stage.  It should happen _before_ development begins (in an [ADR](https://adr.github.io/) document or [issue](https://docs.github.com/en/issues)) and again once the changes are actually being proposed (usually in a [pull request](https://docs.github.com/en/pull-requests)).

## Delete local branches that don't exist on the remote

This is a shell function, placed in `~/.bashrc` or similar location, not a git alias.  This is due to it chaining several git commands together.  It prunes all local branches that don't exist on the remote.  This is handy when branches track individual features/bugfixes/etc, so do not persist long after merging.

```shell
# Force-remove all local branches that don't exist on the remote
function git-cleanup {
  git fetch -p && git branch -vv | awk '/: gone]/{print $1}' | xargs git branch -D
}
```
