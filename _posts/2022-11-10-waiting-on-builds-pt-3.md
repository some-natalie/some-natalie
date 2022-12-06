---
title: "The cost of waiting on builds, part 3"
date: 2022-11-10
categories:
  - blog
tags:
  - CI
  - linux
  - business
classes: wide
excerpt: "Do we build it ourselves or do we buy it as a service?"
---

Continuing from [part 1](https://some-natalie.dev/blog/waiting-on-bulids/) and [part 2](https://some-natalie.dev/blog/waiting-on-builds-pt-2/), there's a moment where it looks like it _might_ be cheaper to run your own build farm.  I'm not going to talk numbers here - at all.  The price of hardware and power or cloud compute varies so much by region and software and (for cloud) functionality such as ingress/egress, containers or VMs, etc. that creating a true comparison would be so specific as to be meaningless.  There's a tremendous wealth of _stuff_ written about the various levels of management or cost abstraction and all the ways different providers compare by cost and region and service.  ~~Bother~~ Leverage a business analyst for specific numbers to your business - this is what they _Excel_ at.  

![i-see-what-you-did-there](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/i-see-what-you-did-there.gif)

Instead, we're going to look at some of the themes I've seen in building, using, maintaining, and replacing all sorts of compute farms and software factories over my career, as well as the trends among the teams I talk to.  So ... here's the first couple things I'd consider as "non-obvious" or difficult-to-estimate-upfront costs listed within a (self-imposed) time limit of 5 minutes.

- Network ingress and egress - Network connectivity costs money.
- Cache management (storage, locality, validity) - Because of :point_up:, at some (pretty modest) scale, you're going to start needing to set up some caching for all the _stuff_ used in builds to avoid service disruptions via rate limits.  This system usually provides services like a local container registry mirror for upstream containers, or NPM for JavaScript, etc.  This takes up disk space, needs to be managed for what's allowed, needs to be kept up to date, needs to be in a place where your build agents can access it economically, etc.
- Configuration management - Everything from IP addresses and hardware, to operating systems, to software versions on each environment needs configuration.  Configuration drift is the reason your job works on node #2 but not node #3 which should be identical but aren't ... so now we're adding something like [Ansible](https://www.ansible.com/) or [Puppet](https://puppet.com/) into the mix.
- Security management - Co-tenanting continuous integration at the enterprise scale means giving some level of privileges (even if it's just executing code) to potentially untrusted neighbors.  Even with neighbors that are perfectly trusted, how do you account for some projects needing more / different dependencies than others?  So how are you going to secure this cool system we're building out?
- Scope management - If you chose to include managing security by providing unique-to-the-tenant environments, now you're managing a lot more custom environments instead of a few standard ones.  This has additional overhead for much of what's listed above.
- All the keep-the-lights-on stuff that goes into any system, like regular backups (and testing them!), log forwarding into a system that can make that data actionable like a [SIEM](https://en.wikipedia.org/wiki/Security_information_and_event_management), alerting and observability as needed for the [service-level objective](https://sre.google/sre-book/service-level-objectives/) needed by the business, etc.
- Cost management of all the hardware, services, and licenses because they all charge money in different ways.  The business should also (at least try to) understand how these costs change with usage changes as the business changes - cost projection is a pretty important.
- Actually owning and operating hardware costs money too.  Leased space in a datacenter and physical security, network costs, having staff nearby or a managed service to handle anything inside your hardware cage, what hardware do you buy, how does it depreciate over time, managing redundancy versus inventory for acceptable risk/costs, managing "peaky" loads on a fixed amount of hardware ...

... And my 5 minutes are up.  That's a lot of costs and design considerations to keep in mind.

### Milton Friedman's Pencil

In 1980, economist Milton Friedman hosted a 10-hour PBS series based on his most recently published book, but the most well-known tidbit was about how a pencil promotes world peace - no single person has the skill and materials to make a pencil and through specialization and cooperation, a pencil is trivially inexpensive and of predictable usability[^1].  There's a decent analogy here to continuous integration as it starts and scales in a company.  No single one of the design considerations outlined above are insurmountable, but it's a lot of in-depth knowledge needed to be both good quality and economical.

When I started out as an intern in a rural school district's help desk, it was common to run our own servers on :sparkles: real physical hardware :sparkles:.  It was placed in office closets or half racks somewhere where people didn't have to hear them or trip over them.  If lots of them were needed, you'd lease space in a datacenter.  Now we use fancy website-building websites without needing to know any programming or markup languages, host our email with webmail providers, and outsource our identity providers to the cloud too.  It's become more economical to hire specialists to do this work as it's gotten more difficult to do these tasks - there's more to know, to secure, and to manage.  I don't believe that continuous integration is fundamentally any different from these services.

There's tremendous value in knowing how _everything_ listed above works.  This is how any individual project keeps a handle on their software and service dependencies.  As more projects get added within a company, the complexity multiplies regardless of if the team chooses to have many discrete systems for individual projects or to have fewer systems capable of many projects.  It's also good for developing an appreciation for not having to grow and fell the trees, process the wood, mine the graphite, refine the rubber, assemble the finished thing, etc. to use a pencil to write an essay[^2].

![uphill-both-ways](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/uphill-both-ways.gif)

:point_up: (not how I intended to sound but I learned a lot going uphill both ways ...)

### What makes you money?

It might be more economical for your team to own and operate their own continuous integration compute (or any compute for that matter).  You also might _have_ to do this anyways for any number of other perfectly valid reasons - like needing specific hardware or to meet regulatory requirements that cannot be met otherwise.  Having been through this discussion in different roles at varying scales, here's a couple things that seem to be overlooked quite a lot.

First is that each company and team has a set number of engineering hours to do work in.  These engineering hours cost money.  Each system the team builds also has ongoing costs for operating and maintaining it, documenting it, and keeping it upgraded appropriately.  Not every team is passionate about and wants to manage their own _anything_.  Software-as-a-service allows your team to hire top _specialist_ talent fractionally - a little bit of the best people who run email systems, or video streaming services, or compute for general-purpose continuous integration.  Making mindful choices here multiplies your company's ability to do the thing that you make money doing.

Next is that there's a hard-to-quantify economic value in delaying decisions on infrastructure and in outsourcing complex operations.  As you model these costs with your business team, there'll be a (probably fuzzy) point of "buy it as a service" versus "build it ourselves".  Sometimes, it'll be cheaper to do one, then the other, then back to the first - but moving between them has a cost as well.  It's also easy to get started on the in-house path and continue well beyond that point of economic sense because of all the sunk costs, which happens sooner than many teams realize[^3].  As that 5 minute exercise outlined, there's a _lot_ of things that go into building a secure and reliable system to do anything at any scale.

To paraphrase [Dan McKinley](https://mcfunley.com/choose-boring-technology), each company gets a fixed number of "innovation tokens" to do cool stuff.  A build system is just like every other architecture decision the team faces.  Is a build system boring to your team or is this system something your company wants/needs to invest one of its' precious innovation tokens[^4] on?

#### Disclosure

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.

---

#### Footnotes

[^1]: Milton Friedman's pencil clip on [YouTube](https://www.youtube.com/watch?v=R5Gppi-O3a8), based on Leonard Read's "I, Pencil" poem ([link](http://www.econlib.org/library/Essays/rdPncl1.html)), and some good critique of the theory by Tim Hartford ([link](https://www.bbc.com/news/business-48383050)).  Probably lots more discussion on this than I could ever footnote, so spare me some pop economics and do a comprehensive academic search in as much depth as one desires.
[^2]: That's also why this site is mostly written in [Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) and built/hosted on [GitHub Pages](https://docs.github.com/en/pages).  Markdown is routine for me and I'd like a reason to learn more about web things.
[^3]: Unless you live in a world where time and labor has no economic value, in which case just throw all this reasoning out.  I recall a particularly intricate system of shell/Python/Ruby scripts, Chef cookbooks, cron jobs, and a couple Puppet modules to deliver a handful of Java applications that needed different versions of Java installed on the same hardware with differing SSL certificates and a couple other conflicting build dependencies.  It started simply and grew bit-by-bit, without comprehensive documentation, over just a few years.  Patching this system without having the ability to untangle/troubleshoot/understand it is a recurring source of unresolved professional trauma for me. :heart:
[^4]: Dan McKinley. "Choose Boring Technology", 2015, <https://mcfunley.com/choose-boring-technology>
