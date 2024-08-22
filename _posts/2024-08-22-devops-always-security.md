---
title: "DevOps has always been about Secure by Design software"
date: 2024-08-22
excerpt: "From the Software Supply Chain Security Summit at Black Hat 2024, a less-than-modest argument that devops has **always** been improving security."
tags:
- security
image: /assets/graphics/2024-08-22-secure-software-panel/lineaje-panel.webp
---

> I recently had the honor of speaking on the 6th at the [Software Supply Chain Security Summit](https://www.lineaje.com/the-software-supply-chain-security-summit-2024).  Many thanks to [Lineaje](https://www.lineaje.com/), a terrific group of moderators, and my fellow speakers for a fantastic event.  The panel I participated in was **"Software not built secure, will not run secure: How to build secure by design[^sbd] software"** and by a tangent, we accidentally covered some lessons I learned the hard way running a software factory.
>
> 💭 This is a couple thoughts from that panel, in no particular order.
{: .prompt-info }

DevOps isn't dead.

🎪 It's a tent that keeps getting bigger. 🎪

Shipping small changes quickly has always been improving security.  Expanding control points slows delivery, which reduces our application security and increases risk.  While the exact number depends on the project, the survey, and more, it's been well accepted that a majority of commercial code (70% or more)[^percent] is open source components.  For why, take a moment to ponder the pencil we all just bought for back-to-school bags.

✏️ You know how to make a pencil ... **in theory.** ✏️

In practice, it's much more complicated.  Someone has to grow, harvest, and process trees into tiny shapes.  Then the graphite must be mined and processed to a nice uniform consistency.  Then all the other parts that go into the paint, eraser, and the little metal bit holding it on ... there's a lot of various parts and pieces to understand.

💸 Then it has to be done economically enough to be a couple pennies a piece.[^pencil] 💸

No one is disputing that using open-source code components gives our software the same advantages of economy.  The ability to assemble software to solve problems along paved paths gave us the same economic advantages of interchangeable parts in manufacturing.  It allows for more software to solve more problems, faster and more affordably than a more "artisanal" development cycle.

We don't have to write our own database, logging framework, or anything else from scratch.  The concern is always around **_where_ do we draw a boundary of responsibility for that code**, given we no longer have insight into it.

<div style="text-align:center"><p style="font-size: 20px"><b>
Even if the code is open source,<br>Time and engineering effort to understand it isn't free.
</b></p></div>

This economic fact, plus the lack of control upstream, shouldn't breed insecurity - yet it does.

Every company stood up a Nexus or Artifactory after the `left pad` incident[^leftpad] (or similar), where a developer deleted their own package from npm, causing havoc on all downstream software.  Without the means or discipline to continuously keep it and the software built from it updated, this pattern simply perpetuates out of date, vulnerable software.  Earlier this year (2024), while I was still doing more application security stuff daily, it was routine to find vulnerable versions of log4j (2021) in "maintained" internal software.

The power of enterprise (and public sector) buyers to influence better behavior is extraordinary.  Withholding purchase from companies without a software bill of materials (SBOM) or support for multi-factor authentication (MFA) or other security features isn't a tactic that works well.  While it can be maligned as "named account driven development", money talks loudly.

![roll-your-own-crypto](/assets/graphics/2024-08-22-secure-software-panel/roll-your-own-crypto.jpeg){: .shadow .rounded-10 }

> During some of the side chats at the event, I mentioned my _very strong feelings_ about how this topic intersects with cryptography.  This is that ~~rant~~ vehemently opinionated public service announcement. 😑
{: .prompt-warning }

In my role, I get to talk to all sorts of companies and government programs that are all over the spectrum of cybersecurity maturity.[^model]  A core component of this is having a working knowledge of cryptography and some basic implementations in (parts of) your infrastructure and/or application.[^auditor]  The problem is in reading the specifications covering algorithms and their implementation[^fips] as a layperson - there are a lot of particulars about how random is random, length of each part of a cryptographic function, and hundreds of pages more.  There are a lot of ways to mess up and many aren't obvious.

This means that cryptography is a _fantastic example_ of things that shouldn't be DIY'd.  It's complicated and easy to mess up in unintuitive ways, yet is (usually) straightforward to implement from a premade library.

Premade libraries that must be patched and kept up-to-date - restarting the cycle of "hey, please update your stuff!" all over again in the most security-focused parts of your application. ♾️

<div style="text-align:center"><p style="font-size: 20px"><b>
tl;dr - use open source software developed and reviewed by experts in tricky things<br>... just patch it regularly, mmmkay?
</b></p></div>

---

<p style="font-size: 20px"><b>
Footnotes
</b></p>

[^pencil]: Leonard Read's "I, Pencil" poem ([link](https://www.econlib.org/library/Essays/rdPncl1.html)) is the original source of this argument that I keep reusing because I keep seeing it everywhere.  There's some good critique of the theory by Tim Hartford ([link](https://www.bbc.com/news/business-48383050)) of this that is well worth reading.  Probably lots more discussion on this than I could ever footnote, so spare me some pop economics and do a comprehensive academic search in as much depth as one desires.
[^percent]: Synopsys puts this number between 55% and nearly 90% in their [2024 Open Source Security and Risk Analysis](https://www.synopsys.com/blogs/software-security/open-source-trends-ossra-report.html) report.
[^leftpad]: [npm left-pad incident](https://en.wikipedia.org/wiki/Npm_left-pad_incident)
[^model]: I was trying _so_ hard to not say [CMMC](https://dodcio.defense.gov/CMMC/), but here we are.  It was too easy of a shot to not take. 🌷
[^sbd]: CISA [Secure by Design](https://www.cisa.gov/securebydesign) covers many aspects of application security, not all about what goes in or any one feature.  It's worth a read or ten.
[^auditor]: Literally any and every question asked here is best answered by "ask your assessor" and not by me. 🙊
[^fips]: If you're interested, NIST [FIPS 140-2](https://csrc.nist.gov/pubs/fips/140-2/upd2/final) and [FIPS 140-3](https://csrc.nist.gov/pubs/fips/140-3/final) are the primary standards to read up on.
