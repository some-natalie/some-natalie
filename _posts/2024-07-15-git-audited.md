---
title: "Why develop when you have to audit"
date: 2024-07-15
excerpt: "From BSides Boulder 2024, let's layer on the business and people complexities on top of this deeply technical problem.  Despite all the hardships we've reviewed, building software and systems in highly regulated environments can still be rewarding, fast-paced, and fun!"
tags:
- security
- git
image: /assets/graphics/2024-06-14-whodunnit-git-repo/crocus.webp
---

> From [BSides Boulder 2024](https://bsidesboulder.org/), let's layer on the business and people complexities on top of this deeply technical problem.  Despite all the hardships we've reviewed, building software and systems in highly regulated environments can still be rewarding, fast-paced, and fun!  This is an expanded set of slides and resources since shown live on 14 June 2024.
>
>🪻 [Overview and contents here, if you missed it!](../git-code-audits) 🪻
{: .prompt-info}

📚 We're almost an hour in - who's learned something today?  I bet your teammates, managers, and auditors are in the same position!  Doesn't it feel great to learn something new?!

**Now let's do the most difficult thing - explore the business and people facets of this far-reaching technical problem.**  🥴

## Some assembly required

The whole idea of an enterprise wide "software factory" has continually gained traction over the past ten years or so.  It's a fantastic premise with one, not so obvious, implication:

<div style="text-align:center"><p style="font-size: 20px"><b>
✨ This system is in scope for both itself AND everything developed on it. ✨
</b></p></div>

![software-factories](/assets/graphics/memes/software-factories-mugatu.jpg){: .w-50 .rounded-10 .right }

The first one is pretty straightforward, even if it can be technically difficult - configure your central remote in accordance with whatever hardening standards necessary (eg, NIST 800-171).  Once that's done, document compliance on your endpoints, identity management system, datacenter or cloud provider, "people stuff" like information security training, and all the other _seemingly random stuff_ that's needed.

That second one is where I spent way more time, though.  It's being organized on all of the above, then working with teams to make sure that the controls they said need are in place on the platform.  Part of that is documenting your own controls in a reusable way to be included in many other audit packages.  Another difficulty is in preventing "colliding controls" between teams or trying to scope settings such to cover everything needed and nothing more.

In moving into a more consultative role, I learned it wasn't just me that struggled here.  Many of these central git repositories assume things that simply aren't true of complicated industries.  A software factory is a SaaS service provider with a bunch of (internal) customers.  Here's a couple tips that made my life easier:

- **Keep the paperwork in order at all times.**  It's always in demand.
- **Self-service is your best friend.**  The worst part of this "internal SaaS" idea is that every "customer" can direct message you all the time.  There's only so many teammates who can answer questions.
- **Carve out time for proactive improvements.**  This is the hardest, yet most impactful long term, to the success of the project.  The team running this needs time to learn new things, to experiment with new features or additions, to proactively improve the platform.  Neglect this at your own peril.
- **Don't stop shipping code!**  Never forget what your "customers" experience daily.  The further you are from writing software, the harder it is to navigate the conflicts of technology and people writing software successfully.

## This is a job

![mr-krabs](/assets/graphics/memes/money-mr-krabs.jpg){: .w-50 .rounded-10 .left }

Defense, manufacturing, energy, financial services, and healthcare are all huge swaths of the global economy on their own.  They purchase and write and maintain and deliver software products to exist.  That needs a lot of people to accomplish - or, better said, **factories need people to function.**

These are jobs.

People work for money.

There are tons of people, maybe even you, who take part in this system _solely_ in exchange for money.

And it shouldn't suck to do it.

It's more secure, reliable, and economical when we factor in making systems delightful to use.  **Great user experience is a value in itself as kindness to your fellow humans.**

## Auditors are human too

Running centralized infrastructure for software developments gets caught at the many intersections of strongly held opinions, institutional politics, and third-party audits.  There are always way more opportunities to disagree than expected - it doesn't mean you have to fight about it all the time.  **Coming across as collaborative first has always helped me further platform security and adoption.**

Having done this a time or ten, I wish I learned this one thing sooner:

<div style="text-align:center"><p style="font-size: 20px"><b>
✨ You don't have to show up to every argument you're invited to. ✨
</b></p></div>

Some examples I've had to work through in an audit:

- An auditor that didn't understand the protocol used to fetch code doesn't alter it.  _definitely an education opportunity_
- A senior leader wants to change how teams structure their code review approvals and testing procedures, in the middle of an audit.  _do not argue, advise of timeline impact_
- An auditor who misunderstood their scope, wanting to place all development company-wide into a single repository.  _this is misery should it succeed, time to engage!_

Or in other words, **auditors are human too.** 🤖

## Impact like no other

> "The tech companies hired like crazy," Saker says. "Those giants hired some of my top engineers."
>
> However, job switching sometimes doesn't always go as planned. Some of the engineers who moved over to Big Tech got placed in sales engineering roles, which pull engineers further away from programming and working directly with technologies. The longer the engineers are away from the keyboard, the more the "itch" starts to creep back in to code and build systems that "touch people's lives," Saker says.
>
> _Lake, S. (2023, Feb 14). "Booz Allen-one of the largest cybersecurity employers-is reacting cautiously to big tech layoffs." Fortune Education. ([link](https://fortune.com/education/articles/booz-allen-is-still-betting-big-on-tech-talent-despite-layoffs-in-the-industry/))_

One of the very first systems I worked on at Booz Allen was a website that enabled servicemen and women to find out how and where to request an absentee ballot to vote in elections in their home districts.  Getting this improved in time for the next election was both _important_ and _urgent_.  It was in use by thousands of people, enabling them to have their voice heard.

Systems I had a hand in building have ended up in dozens of places that it's alright to feel _warm and fuzzy_ about.  While I can't speak for industries like health or finance, I couldn't imagine working without the possibility of outsized influence you can have in the public sector.

Working in regulated industries can have an **opportunity to make an impact like no other** similar job.

## Parting thoughts

![og-github](/assets/graphics/2024-06-14-whodunnit-git-repo/git-hosting.png){: .shadow .rounded-10 .w-75 }
_GitHub's original byline, circa 2008, "git repository hosting - no longer a pain in the ass"_

**Git supports a broad spectrum of development patterns.**  The right controls for your project or company depends on unique factors.  The distributed assumptions it makes on version control and distributed identities (email, patch based workflows, gpg keys) can make auditing code difficult.  This means the centralization of identity and controls has consequences to make _proving changes_ easier, but impact which developer workflows function well.

Git was designed for that first one.  GitHub, GitLab, and similar products were designed for the second.

> Hanging out at the intersection of technology, people, and business usually is pretty murky.  It's possible to build software reliably and securely in the most constrained of industries.  We just need to know `git` inside and out to make sure we're covered in a code audit. 🕵🏻‍♀️
{: .prompt-info }

---

## Footnotes

🍻 This talk was inspired by a conversation with a bunch of lovely folks (who will remain unnamed) about the utter uselessness of `git log` in an audit after my talk last year on [Threat Modeling the GitHub Actions Ecosystem](../threat-modeling-actions) (and a few beers).  It doesn't _reliably_ tell you anything about what goes into any repo and I have all the cuts in software audits to prove it.  That no-longer-repressed trauma became this eight part / one hour talk ... 🙊

🎨 I made lots of AI generated art for this talk and the expanded write-up from it.  Unless I specifically said otherwise, it always came up with a "developer" as a white dude.  Every single time - even in the dozens of images I made and didn't use.  [This guy](https://www.youtube.com/watch?v=XdGvPUzwYng) must have written the ratios of appearances here ...

💞 That said, you belong in technology.  We're a great group of people overall.  Please don't ever feel unwelcome.

💼 I write software and build technology infrastructure for a living.  Sometimes I do these as a hobby.  The _pleasurable craft of building things_ and _what I do to pay bills_ overlaps quite a bit for me at the moment.  I'm grateful for this coincidence.

✍🏻 I regretfully didn't have the opportunity to work directly with Haluk Saker in my time at Booz Allen.  As one of those engineers who moved into sales engineering at a tech giant in that time period, that quote captured a lot of my experience too.  While I'm grateful to have made that career shift in hindsight, it was _so much rougher_ than I expected for so many reasons.  Perhaps I'll write about that one day.

⚙️ GitHub published a deep dive into git's database internals in multiple parts.  While I've never had the database itself turn up in scope for an audit, I have had to explain packed objects and history queues several times over in order to meet controls around code execution and containment.  These are all well worth the time to read and understand.

1. [packed object store](https://github.blog/2022-08-29-gits-database-internals-i-packed-object-store/)
2. [commit history queries](https://github.blog/2022-08-30-gits-database-internals-ii-commit-history-queries/)
3. [file history queries](https://github.blog/2022-08-31-gits-database-internals-iii-file-history-queries/)
4. [distributed synchronization](https://github.blog/2022-09-01-gits-database-internals-iv-distributed-synchronization/)
5. [scalability](https://github.blog/2022-09-02-gits-database-internals-v-scalability/)

Perhaps this is _truly_ the correct answer. 👇

![build-software-dark](/assets/graphics/2024-06-14-whodunnit-git-repo/build-software-dark.png){: .shadow .rounded-10 .dark }
![build-software-light](/assets/graphics/2024-06-14-whodunnit-git-repo/build-software-light.png){: .shadow .rounded-10 .light }
_[Allow `docker push' to push multiple/a subset of tags  · Issue \#267 · docker/cli](https://github.com/docker/cli/issues/267#issuecomment-695149477) - the issue that inspires me to this day_
