---
title: "You need a grimoire."
date: 2024-08-26
excerpt: "It's a book of magic when nothing else will help you. 🧙🏻‍♀️"
tags:
- career
- writing
- oscp
image: /assets/graphics/2024-08-26-you-need-a-grimoire/sysadmin-grimoire.webp
---

> A grimoire is a book of spells - a collection of snippets found on StackOverflow or got Slack’d by a coworker that got me out of a jam. There's a decent chance it can't be found again.
>
> This is why **you need a grimoire.**  [Mine is here](../../grimoire). 🧙🏻‍♀️
{: .prompt-info }

In my first job, the Windows sysadmin had a text file full of deep incantations from the registry and [batch files](https://en.wikipedia.org/wiki/Batch_file) from message boards - each something that had saved the day more than once.  One of my favorite senior engineers in another job had an internal site outlining many ways that JavaScript allows you to trip over your own feet, with examples and ways to avoid these footguns.  Another team I'd joined kept our little book of shell wizardry in an "internally public" page on our company wiki.  It can be a massive gist, a git repository of files, a static website, a note in `whatever note platform is popular`,  etc.

A little collection of these little bits of code or instructions makes them reusable.  It also makes them rapidly accessible versus having to search for or craft that bit of code yet again.

**Just write it down.** ✍🏻

As a client-facing engineer, this habit is the foundation to meet deadlines for deliverables.  It's even better for _actually_ retaining knowledge, so that when something unexpected happens in the field, I can confidently follow-up faster.

If I have a conversation more than three or four times, I'll probably write it down to make some generic guidance for reuse.  A few examples of that are a [guide to self-hosted runner architecture](../arch-guide-to-selfhosted-actions), why you should [never use ITSM for application security](../stop-using-itsm-for-appsec), and a guide to [using CodeQL in a containerized build](../codeql-container-builds).  These continue to be among the top pages on this site by traffic count.  There's always another opportunity to have the same discussion - hopefully sharing it helps others to go even further.

It's also great for sharing example code and configuration files.  Many large companies have both dev/staging/production environments and an internal SSL certificate intermediary for TLS inspection.  Given that wildcard certificates tend to be _highly_ frowned upon in highly-regulated industries, my [collection of SSL shenanigans](../../grimoire/openssl-cheatsheet/) has examples of using a configuration file for certificate values, verifying FIPS-compatible algorithms are the only ones offered by a server, and converting certificates between various formats.

My grimoire has my handy shell functions, a small list of tools that I use frequently, config files or settings that aren't easy to find again, and more - it doesn’t have to be strictly code.  It's also got other tidbits too, such as:

- a [list of questions to ask on a job interview](../interview-questions)
- a [tiny shell function](../../grimoire/miscellaneous#jekyll) to run my website locally or check with `htmlproofer` before publishing using my [secure Jekyll container](https://github.com/some-natalie/jekyll-in-a-can/)
- a chart of [sous vide cooking temps and times](../../recipes/#sous-vide-time-chart) that the family likes
- an upcoming checklist on preparing for layoffs or rumors of layoffs ... it just needs to be cleaned up a bit before publishing, but it's been in my notes for years.

Easy to search and sort/tag/filter are nice features that are mostly tablestakes these days.  Every app has something.  None of these are as essential as **easy to add**.  Capturing notes quickly means they'll grow and sprawl.  Sprawl is fine.  So long as the notes have a simple export path (like "it's all markdown"), it's not important to find perfection.  Just keep focus on adding those little timesavers and snippets-that-saved-production and know mobility isn't a problem.

It is far more tempting to play around with a dozen different note-taking programs and each of their thousand settings than it is to _just write it down._

Writing these little ~~dark incantations~~ code snippets down for reuse takes less time than finding it again the next time.  Sharing it makes it many times more helpful. 🤗
