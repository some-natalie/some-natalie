---
title: "The cost of waiting on builds, part 2"
date: 2022-10-10
categories:
  - blog
tags:
  - CI
  - linux
  - business
classes: wide
excerpt: "How much does it cost to wait on builds?  More numbers make it even clearer."
---

Expanding on [part 1](https://some-natalie.dev/blog/waiting-on-bulids/), let's take a closer look at context switching times for developers, the effect of developer compensation on this problem, do a little math, and answer the inevitable question on self-hosting.

### Context switch times

In part 1, the time it took for each developer to put down the last project after kicking off a build/test suite/whatever to the time it took to be productive in another project was assumed to be an hour.  There's some good research on this being significantly shorter (23 minutes[^1] or 10 minutes[^2] according to the sources cited below), so let's shorten that to half an hour and 15 minutes, respectively:

|  | Minutes | Cost of 1 build | Partial dev cost<br>(1 dev, 30 mins) | Partial dev cost<br>(5 devs, 30 mins) | Partial dev cost<br>(1 dev, 15 mins) | Partial dev cost<br>(5 devs, 15 mins) |
|---|---|---|---|---|---|---|
| 2 core | 310 | $2.48 | $39.98 | $189.98 | $21.23 | $96.23 |
| 4 core | 173 | $2.77 | $40.27 | $190.27 | $21.52 | $96.52 |
| 8 core | 92 | $2.94 | $40.44 | $190.44 | $21.69 | $96.69 |
| 16 core | 55 | $3.52 | $41.02 | $191.02 | $22.27 | $97.27 |
| 32 core | 35 | $4.48 | $41.98 | $191.98 | $23.23 | $98.23 |
| 64 core | 27 | $6.91 | $44.41 | $194.41 | $25.66 | $100.66 |

Visualized, here's what the cost of a build is for a single developer waiting or switching tasks.  Note that the cost of the compute is on the bottom line, barely above the X-axis:

![graph-cost-per-dev](/assets/graphics/2022-10-10-build-cost-2.png)

At the assumed hourly rate of $75 (USD) an hour, there's basically no point where it doesn't make sense to pay for additional compute to make the job run faster _if_ there are developers waiting on the task.  It costs about $15 an hour for the largest compute option available, or a fifth of the hourly cost of a single developer.

### Keeping costs in check

Let's talk a tiny bit about the cost of labor, since it's such a big (and variable) part of the equation here.  The [spreadsheet](https://docs.google.com/spreadsheets/d/1ostvpK8jmC13U25bdyekyBV9uS8xydLV14q2ZwaH24k) is publicly available, so feel free to make a copy yourself and edit the average annual cost of each developer.  Note that this should be _cost_ including things like fringe benefits and employment taxes, not _salary_ (usually one component of compensation in the US).  Even cutting the cost of compensation in half doesn't fundamentally change the picture.  The cost of compute time is still significantly lower than the cost of developer time.

If there are developers waiting on builds, it makes sense to spend a little more on compute to keep that time wasted to a minimum.  That doesn't mean that every task needs big compute, though.  [Linting](https://github.com/github/super-linter) code, pull request checks (like [this](https://github.com/peckjon/reject-pr-approval-from-committer) or [this](https://github.com/actions/dependency-review-action)), and other automation likely doesn't need the same compute power as compiling software and running tests.

### It's cheaper to run it myself

It can definitely look that way if you only look at the cost of compute.  As compute has become more of a commodity good and pricing has become more complicated, taking a deep dive into cloud hosting or datacenter pricing is way beyond the scope of this little blog post.  Once you account for regional differences in pricing, spot pricing versus committed spend pricing, network ingress and egress, and supporting infrastructure (if needed), the pricing is less of a distinction.  

I've spent most of my career self-hosting almost everything in datacenters, including build compute, so I'd like to instead pivot to all the costs that can't be accounted for in a cloud/datacenter pricing table in the next post.  It's been my experience that these are the costs that get overlooked and make the difference between project success or failure if not accounted for.

[Part 3 of 3](https://some-natalie.dev/blog/waiting-on-builds-pt-3/) - do we build it or do we buy it?

#### Disclosure

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.

---

#### Footnotes

[^1]: Gloria Mark, Daniela Gudith, and Ulrich Kiocke. “The Cost of Interrupted Work: More Speed and Stress” 2008, <https://www.ics.uci.edu/~gmark/chi08-mark.pdf>

[^2]: Qatalog and Cornell University’s Idea Lab. "Workgeist Report ‘21" 2021, <https://assets.qatalog.com/language.work/qatalog-2021-workgeist-report.pdf>
