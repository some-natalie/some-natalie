---
title: "Organization costs of the xz backdoor"
date: 2024-03-31
excerpt: "Managing insider threats when the whole world is an insider."
tags:
- security
- linux
---

There was a lot to read this weekend about [the xz backdoor](https://www.openwall.com/lists/oss-security/2024/03/29/4), how [maintainers get burned out](https://robmensching.com/blog/posts/2024/03/30/a-microcosm-of-the-interactions-in-open-source-projects/), and a great [tl;dr response plan](https://gist.github.com/thesamesam/223949d5a074ebc3dce9ee78baad9e27).

As someone who's both led a terrifyingly complex software factory _and_ worked with executive sponsors of similar programs in defense, one common thread on Mastodon really pulled me the wrong way.

> - Don't trust, just verify.
> - Zero trust would have caught this.
> - In God we trust, all others we ~~monitor~~ code review.

Let's appreciate the 💸 **absolutely staggering cost** 💸 of this at an individual scale.

## Some math

According to the latest [Stack Overflow survey](https://survey.stackoverflow.co/2023/#salary-united-states), the average salary of a developer in the US is approximately $120,000.  Add in benefits and such, let's call it $150k.  At 50 weeks a year and 40 hours a week, that's 2000 hours or **$75/hour.**[^low]

![budget](/assets/graphics/memes/no-budget.JPG){: .shadow .rounded-10 .w-50 .left }

How much code could each full time engineer be expected to audit, understand, and be responsible for?  This isn't time spent writing code or adding anything, just reading and verifying nothing fishy is going on.

Is it 1k lines of code per FTE per year?  10k?  100k?  **Does it matter?**

Can your company devote the investment of FTEs to do this?

Will it?

## Audit scope

This is my (poor) recreation from memory of an _ancient_ slide in a GitHub pitch deck.  It's supposed to show the lines of code and related technology advances from "put a rocket into space" to "global just-in-time manufacturing" and "human-operator-assistance" in tractors and cars and ending at full system autonomy.  2020 was years into the future.

![loc-over-time](/assets/graphics/2024-03-31-xz-thoughts/loc-over-time.png){: .shadow .rounded-10 .w-75 }

I adore the original graphic.[^source]  It works on so many levels to talk about the complexity of working on, securing, and shipping giant complicated projects.  It doesn't show all the things needed for this to work, such as:

- 🏗️ **pipelines** for testing, integration, and deployment
- 🛡️ **appsec** tooling to cover all sorts of security needs
- ⛳ **feature flags** to ship incremental changes
- 🔎 **observability tools** to understand the impacts each change has
- ... and more ...

Free, open source code reuse is what drives so much of that acceleration in code base size, scope of problems we can solve, and more.[^nil]  **This pattern doesn't scale to individual companies needing to address the economics of engineer hours.**  There are _millions_ of developers in the things going in to your company's software and infrastructure.  Not everyone can throw armies of skilled security-minded developers to audit all the things.

## So what do we do?

**Don't panic.**  No, really.  Monday's gonna come and everyone's going to have a breathless article or ten, hot takes, good outreach for `product` that may or may not be relevant, and a ton of work to do.  Forgive your fellow humans.

**First, we clean.**  We run all our incident response playbooks, consider everything that ever ran the affected versions compromised, and figure out what lateral movement could have happened.  This [tl;dr response plan](https://gist.github.com/thesamesam/223949d5a074ebc3dce9ee78baad9e27) is a good place to start as of writing.

**We do not disable all upstream updates forever.**  Yes, it is possible for another malicious contribution to happen again.  It is absolutely certain that whatever is currently in use will accrue CVEs continually.  Turning off upstream repos "until further notice" is understandable on a human level.  I've already heard from friends and former colleagues this is happening.  It's about as wise as banning all cars because some people crash them.

**But we do understand what is running where.**  The folks with up-to-date and reliably automated inventories of systems and software will have a much easier time cleaning this up.  This is an achievable goal.

![dumpster](/assets/graphics/2024-03-31-xz-thoughts/dumpster.jpg){: .shadow .rounded-10 .w-50 .right }

**Next, we do the upgrades that are easy to put off.**  Implementing controls to make it hard to move around and persist, rotating long-lived credentials, actually tackling whatever is scary, etc ... every organization has something on that "we'll do it when we have some bandwidth" list that will improve their security posture.  Just in case it was empty, though, here's some ideas:

- Implementing a "deny by default" network policy means that everything not already documented and explicitly allowed gets blocked.  A scream test always turns up something fun.
- Segment your networks to limit blast radius of impact as best as possible.
- Enable multi-factor authentication.  I still can't believe that's not universal in 2024.
- CISA has some great advice on all of this and more in their [Zero Trust Maturity Model](https://www.cisa.gov/zero-trust-maturity-model) framework.  I recommend the read!

**This is a fabulous time to secure that bandwidth for the team.** 😅

## Conclusions

At this point in time, the compromise of `xz` seems to be an amazingly sophisticated attack.  This account did so much from generating some helpful commits, using sock-puppets to pressure an overwhelmed maintainer into granting write access, and removing the fuzzer months in advance.  It'll be studied for years with new insights.

Scaling trust is a hard problem.  Despite the first news of this dropping on a Friday afternoon before a widely-observed holiday weekend, an astonishing amount work has happened so far to fix it, scope the impact, tear it apart, and so much more - before "work" even starts on Monday and much of it by volunteers.  **This passion is the promise of open-source security in action.**

---

## Resources

For all the folks that have this is their first Major Security Incident, it'll be alright and real life still comes first.

This incident is still developing quickly and I will likely not keep up.  Please see some of the following resources for more updated info.

- [CVE-2024-3094](https://www.cve.org/CVERecord?id=CVE-2024-3094), the official CVE record
- [everything I know about the xz backdoor](https://boehs.org/node/everything-i-know-about-the-xz-backdoor) by Evan Boehs
- [OpenSSF's opinion](https://openssf.org/blog/2024/03/30/xz-backdoor-cve-2024-3094/) on the matter
- [Bash obfuscation explained](https://gynvael.coldwind.pl/?id=782)
- [An amazing infographic](https://infosec.exchange/@fr0gger/112189232773640259) explaining the compromise and how it infects systems

## Disclosure

I work at Chainguard as a solutions engineer at the time of writing this.  All opinions are my own.  This was drawn from my own experiences responding to similar fire drills and actual fires. 👩🏻‍🚒

## Footnotes

[^nil]: The chance of open source software not being _somewhere_ in your company's codebase is approximately 4% according to the [2024 OSSRA report by Synopsis](https://www.synopsys.com/blogs/software-security/open-source-trends-ossra-report.html).
[^low]: This is as best of a reasonable guess I could make over the weekend.  Folks take more time off, benefits costs change, not all of the 40 hours in a week are focused engineering time, etc.
[^source]: If someone still at GitHub has this, perhaps send it to me if I'm allowed to use it? 💖
