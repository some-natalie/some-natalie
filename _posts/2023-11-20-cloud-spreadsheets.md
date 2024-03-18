---
title: "Cloud cost spreadsheets ask the wrong question"
date: 2023-11-20
excerpt: "Or what I learned replacing the 200A breaker panel on my house ⚡"
tags:
  - business
---

There's been quite a lot of commotion lately about The Company Formerly Known As Twitter's [60% YoY cost savings](https://www.datacenterdynamics.com/en/news/xtwitter-claims-100m-in-annual-savings-after-exiting-sacramento-data-center/) by leaving the cloud in favor of data centers run in-house.  Lots has been written about business apps of all sizes coming back on-premises, making the front page of Hacker News, trending on LinkedIn, and all around extolling the virtues of controlling your entire supply chain from metal upwards.  Rolling your own is cool again! 😎

![i-was-told-there-would-be-savings](/assets/graphics/memes/i-was-told-there-would-be-savings.jpg){: .shadow .rounded-10}
_migrating from \_\_\_\_\_\_\_\_ to \_\_\_\_\_\_\_\__

## Don't start with a spreadsheet

I have this conversation frequently these days.  It starts with exceptionally detailed spreadsheets delineating potential costs of a particular system in several hosted cloud environments, data center hardware capacities, storage/ingress/egress expectations, and other commodity negotiated rates to back up the next sentence - "for `cost`, I could do `task` myself `x.xxxx%`[^d] cheaper".  This leads to a simple question that usually hasn't been considered prior to big spreadsheet assembly:

<div style="text-align:center"><p style="font-size: 22px"><b>
Do you want to invest in the skill set needed to do TASK?
</b></p></div>

As someone who spent much of their career mostly on-premises and now advises folks that still maintain metal/hybrid/sovereign infrastructure, I love on-premises deployments!  Purpose-built systems operate economically and securely are masterpieces.  It's also easy to neglect, under-invest in, deprioritize, and cause substantial business harm when done poorly.[^sg]

Replacing cloud services with services run in-house _can_ save your company mountains of cash.  It's also possible to save a ton of money by fixing your own car/house, building your own home, and growing your own food.  Most people don't do _all_ of these on their own.  The time to develop and hone expertise in performing these functions economically isn't free, as I've learned the hard way.

## That time I became an electrician

![zinsco-breaker](/assets/graphics/2023-11-20-cloud-costs/before.jpg){: .w-50 .right .shadow .rounded-10}

This is a Zinsco panel box - the one in the very first home we owned.  It holds a unique type of circuit breaker that was supposed to save space and use less copper than a traditional breaker.  The problem is that when the power draw grows too great, it melts closed and makes it impossible to cut power.  They're a bit of a (legal) fire hazard.[^z] 🔥

I replaced the 200A breaker panel on our home.

This was no DIY project taken on a whim.  It would cost several thousand dollars to hire an electrician to replace it.  This simply wasn't in the budget any time soon, as the heat pump had a catastrophic failure our first winter and a potential baby was on the way.  I used to do low-voltage data cabling - surely this wasn't _too_ different than a big punch-down panel. 🙉

I took night classes at a well-regarded vocational school[^v] for about 6 months to learn "non-professional" electrician skills.  I researched local codes, found which building permits were necessary, and what materials I would need.  A work plan and schedule was assembled and reviewed multiple times over.  All told, it should take about a day from start to finish _or_ roughly twice the time that a professional electrician would need.  A very detailed budget was created for all the tools, materials, and permits that would be needed.  We'd save about $2000 in total to DIY, according to our spreadsheet.

The power was cut on a beautiful Thursday morning in the fall, with the plan to have the power company back on Friday afternoon.

![during-replacement](/assets/graphics/2023-11-20-cloud-costs/during.jpg){: .w-50 .left .shadow .rounded-10}

💸 At this point, I'm a couple hundred dollars _and a couple hundred hours_ into this project to do an extraordinarily routine job for a professional electrician.

Every part of the work plan had some sort of unexpected (to me) problem.  The box was mounted into the wall in a way that made it difficult to remove.  The penetration between the meter and breaker needed to be cleaned up before reusing it.  And so on and so forth ... until Friday rolled around and the building inspector (condescendingly) told me it was time to start rolling through the phone book.

## But did you learn anything?

Pride and stubbornness don't lend themselves easily to objective judgements. 🫠

The value of any service isn't in the commodity parts behind it.  Hiring a professional electrician isn't any different than an IT operations / devops / `whatever we're calling building and running things these days` team.  There is value in having talented folks that know how to hire and train and retain skilled team members - or having the hard conversations about performance and letting them go.[^bhc]  It's hiring a tiny percentage of top engineers for `specialty`, making their work repeatable at a better quality than would be possible for many teams to do on their own.

## Everyone has 24 hours in a day

Sometimes it's more economical to pay a premium for the ability to focus on tasks that make money.  You lose the independence (and responsibility) of having to own and operate it yourself.  It's the same discussion about owning versus renting office space, cars or other vehicle fleets, manufacturing equipment, and more.[^b]

On a personal scale, this means that I

- Run my own [hypervisor for virtual machines](../fedora-acs-override)
- Build my own [router](../openwrt-setup), DNS, and ["smart TV"](../kodi-setup/)
- Automate the [maintenance](../diy-updates-on-runners) of all that 👆
- Just use an iPad for daily driver use - coding, writing, admin/office stuff, gaming, etc.
- Sell my time to an employer that wants to pay for the skills I bring, without having to know the entire business of running a SaaS company end to end.
- Trade that money where it makes sense to - I won't be DIYing an entire panel box again. 😇

At a prior company, this meant that we

- Ran our own data centers for parts of the business and commercial/sovereign cloud resources for others, letting the economics of talent availability and customer needs dictate what goes where
- Used various SaaS providers for email, instant messaging, and more
- Migrated applications into the cloud (as it made sense)
- Migrated cloud applications back into a data center (as it made sense)

This balance is different based on scale, priorities, and budget.  It also changes over time.

## And did you save any money?

My building inspector was right.  I didn't follow his advice, instead pressing on through the weekend with no electricity.  The project was mostly complete!  I called the power company to get my power turned back on. 🎉

<div style="text-align:center"><p style="font-size: 18px"><b>
The power company won't restore electricity without passing inspection.
<br><br>
I can't pass inspection without power to the box.
<br><br>
(╯°□°)╯︵ ┻━┻
</b></p></div>

A local professional would have known this up front.  Another $1800 was spent to have a licensed electrician pat my back and reinstall the meter to pass inspection, turning my utility account back on.  I spent way more money and time than I otherwise would have if I'd started at not doing it myself.[^console] 😑

![money-tweety-bird](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/money-emma-webster.gif){: .w-50 .shadow .rounded-10}
_how finance sees cloud spend and how my DIY projects are funded_

## Lessons learned

Don't dogmatically resist hiring out the parts of your ~~home improvement~~ business infrastructure.  The decision is never as simple as _only_ numbers in a spreadsheet or a thought piece on social media.  It's good to iterate between strategy and napkin math a few times _before_ spending hours to create detailed designs, cost comparisons, and other planning documents.

Take a moment to first consciously consider hiring a (SaaS) professional or staying skilled enough to keep it on-premises as a technology strategy to the problem you're facing. 🧘‍♀️

Then make the detailed spreadsheets.  [I have some advice](../waiting-on-builds-pt-3/) on frequently overlooked expenses to put into it, too. 🤓

![finished](/assets/graphics/2023-11-20-cloud-costs/after.jpg){: .w-50 .shadow .rounded-10}
_it is pretty though, and substantially less likely to set the house on fire 🔥🔥🔥_

---

## Disclosure

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.

## Footnotes

[^v]: This one, to be exact - C. S. Monroe Technology Center ([wikipedia](https://en.wikipedia.org/wiki/C._S._Monroe_Technology_Center)), now closed and consolidated with other special programs in the public school district.  I can't speak highly enough of vocational education in high school and college, as it's how I started in information technology.  Many of them offer non-degree night classes for additional funding that are far cheaper than for-profit career colleges and well worth your support.
[^b]: That class on the basic engineering economics was the best class in college that I ever took.  It baffles me sometimes how often these concepts get overlooked.  One day, I'll write a bit about contingency estimates in budget planning for IT projects. 😊
[^console]: I soothe my wounded pride by thinking that I might need this knowledge again, despite ever increasing odds against that.  I learned a cool skill and have the luxury of considering that a worthwhile in and of itself.
[^d]: It's usually a questionably appropriate number of decimals that shows undue certainty in the precision of a system.  I once had a professor want to un-invent spreadsheets with the goal of preventing juvenile overconfidence in numbers.  I can see the logic in that point of view now.  [This paper](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4483789/) published by the National Institutes of Health outlines the problem and gives valuable guidance on presenting numerical data well.
[^bhc]: At one point in my career, I'd become extremely vocal about proposed changes to developer hiring processes.  The consequences for this was having to participate in the evaluation of each potential process change.  I learned a lot.  In the US, it can _easily_ cost more than $100k to coach, mentor, and then if needed, safely manage out a low performer.  Doing that economically and while minimizing impact to the rest of the team is a tricky manager skill.
[^sg]: Throwing no shade at SolarWinds for using `solarwinds123` as the password on a publicly-facing server ([source](https://www.cnn.com/2021/02/26/politics/solarwinds123-password-intern/index.html)).  Security is hard, and it's easy to fail the simple stuff sometimes.
[^z]: More about Zinsco panel boxes from the [Nonprofit Home Inspections](https://nonprofithomeinspections.org/what-are-zinsco-electrical-panels/)
