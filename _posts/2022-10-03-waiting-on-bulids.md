---
title: "The cost of waiting on builds"
date: 2022-10-03
categories:
  - blog
tags:
  - CI
  - linux
  - business
classes: wide
---

One of the biggest objections on providing better hardware to development teams is the cost of that hardware - regardless of if it's physical hardware in racks, managed cloud providers, or a software-as-a-service.  It's an easy cost to "feel" as a business, doubly so if it's an operational expense for a managed cloud or SaaS.  I decided to run some numbers on this, using GitHub's [larger hosted runners](https://docs.github.com/en/actions/using-github-hosted-runners/using-larger-runners) for ease of getting started.  The full spreadsheet is [here](https://docs.google.com/spreadsheets/d/1ostvpK8jmC13U25bdyekyBV9uS8xydLV14q2ZwaH24k) if you want to copy it and play with the numbers yourself using other costs, times for builds, salaries, etc.

For this little experiment, I used my own personal project - I compile the Linux kernel!  [No, really!](https://github.com/some-natalie/fedora-acs-override)  I need a non-standard patch to be able to separate the grouping of devices in memory without having to _actually_ run Windows to play video games.  That project started out of a need to co-tenant a few projects in a white-box GPU cluster for my job, before "AI/ML" became common enough to have COTS products designed for it.  There's a great business need for software builds (like this) that take a long time to run.

The project builds the Linux kernel RPM packages for Fedora 35 and 36 using Docker.  Since GitHub's hosted runners are all Ubuntu, using the Fedora container image to build its' own software provides a better experience than trying to build RPMs in a Debian-based system.  To make the calculations a bit easier, I took the average of these two builds per compute tier.

### Waiting on the build to finish

Let's assume you have developers waiting on this build to complete.  The assumption is that developers are waiting for the entire time the build runs.  The hourly cost of a developer is assumed to be $75 (USD), or approximately $150,000 per year (including fringe benefits, taxes, etc).  This seemed to be roughly reasonable using StackOverflow's [developer survey](https://insights.stackoverflow.com/survey/2021#salary-comp-total-usa) for 2021.  If you check out the spreadsheet, you can edit this appropriately.

Here's the runtimes and cost of one build using each tier of compute, plus the cost of developer time spent waiting on the build:

|  | FC35 build | FC36 build | Average<br>(minutes) | Cost/minute<br>(Linux) | Cost of 1 build | Developer cost<br>(1 dev) | Developer cost<br>(5 devs) |
|---|---|---|---|---|---|---|---|
| 2 core | 5:24:27 | 4:54:02 | 310 | $0.008 | $2.48 | $389.98 | $1,939.98 |
| 4 core | 2:46:33 | 2:57:47 | 173 | $0.016 | $2.77 | $219.02 | $1,084.02 |
| 8 core | 1:32:13 | 1:30:41 | 92 | $0.032 | $2.94 | $117.94 | $577.94 |
| 16 core | 0:54:31 | 0:54:14 | 55 | $0.064 | $3.52 | $72.27 | $347.27 |
| 32 core | 0:36:21 | 0:32:21 | 35 | $0.128 | $4.48 | $48.23 | $223.23 |
| 64 core | 0:29:25 | 0:24:24 | 27 | $0.256 | $6.91 | $40.66 | $175.66 |

Plotted out, it makes a pretty compelling case for spending a bit on better hardware.

![build-cost-1](/assets/graphics/2022-10-03-build-cost-1.png)

### Task switching

Now let's change the assumption that the developers are changing tasks instead of waiting on the build to finish.  Context switching has a cost too ([source](https://www.joelonsoftware.com/2001/02/12/human-task-switches-considered-harmful/)).  Play around with the spreadsheet to come up with some reasonable assumptions, but based on my own experience, switching from one focused task to another takes at least an hour so that's what I used to run the numbers again.

|  | Minutes | Cost of 1 build | Partial dev cost<br>(1 dev) | Partial dev cost<br>(5 devs) |
|---|---|---|---|---|
| 2 core | 310 | $2.48 | $77.48 | $377.48 |
| 4 core | 173 | $2.77 | $77.77 | $377.77 |
| 8 core | 92 | $2.94 | $77.94 | $377.94 |
| 16 core | 55 | $3.52 | $78.52 | $378.52 |
| 32 core | 35 | $4.48 | $79.48 | $379.48 |
| 64 core | 27 | $6.91 | $81.91 | $381.91 |

The numbers tell a different story here - if you're going to switch tasks anyways, the speed of execution doesn't matter significantly.  Labor is so much more expensive than compute that saving a few dollars speeding up the build is inconsequential.

### Conclusion

The cheapest (and from experience, least frustrating) option is to speed up the build substantially and keep the team on track.  In this case, spending an extra $4-5 on build compute saves about $40 per build for an individual developer, or a little over $200 per build for a team of 5.  Seems like a good investment to build on faster hardware.

#### Disclosure

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.
