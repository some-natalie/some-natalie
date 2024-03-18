---
title: "Scrum the home"
date: 2024-01-08
excerpt: "🏡 Running a home, with some help from Scrum (ish)"
tags:
  - github-actions
  - homelab
  - project-management
---

🥂 In the spirit of the new year, I thought I'd share how we've been creating some order out of chaos in our home.  We've been at this for over two years now and it's worked fairly well so far.

![cleaning](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/cleaning.gif){: .shadow .rounded-10 .w-50 .left}

With two careers, small kids, a household to maintain, and wanting to really enjoy time with (and without) tiny humans, there's a lot going on.  My husband and I have always tried to capture things that need doing, but it never quite worked.  We'd get frustrated at each other and whatever we're using to plan.  Needing to capture _both_ calendar-type commitments and things that don't fit neatly on a daily agenda makes it tough to find the right tool.[^things]

[An inspiring TED talk](https://www.youtube.com/watch?v=J6oMG7u9HGE) walked through using Agile methodologies to run a household got us thinking.  We both already used scrum professionally.[^vary]  Our children are still a bit young, but we have welcomed them to take part nonetheless.  Figuring out the basics of running a household is one of those important adult things they won't learn in school.

That's where this small web automation comes in.  A template for week-to-week meetings lets us automate the creation of each week's agenda.  Keeping the week's issue updated means it's always visible wherever we are.

## Templates make life easy

Our template has four parts that take a few minutes to go over _in total_.[^real]  Remember - we're working with the attention span of young children. 🐿️

### 1. Looking back

First, the very basics of a retrospective is 3 questions:

> 1. What worked well?
> 2. What didn't work well?
> 3. What do we want to work on next time?

These are worth talking about together, but don't spend a ton of effort on optimization or recording here.  It's not worth cataloging details for long-term storage, just finding small victories to celebrate or ideas to try.  Some examples from the past couple months include:

- The kitchen vent hood filter can go through the dishwasher. 🤯
- There were no kid potty accidents this week! 💩
- Went to the grocery store hungry and now have too much fruit for the week. 🙊

### 2. Looking forward

Now to the important items - what's happening in the upcoming week?  This quick list makes sure that any event that needs to be planned around is accomodated for.

> - Who needs to be where and when?
>   - 🛒 grocery shopping
>   - 👩‍🏫 school activities
>   - 🍹 social events
>   - 🧑‍⚕️ doctor / other appointments
>   - 🏃🏊 exercise
>   - ✈️ work travel
>   - 👩‍💻 professional networking
> - Is everything 👆 in the family calendar?
> - Given everything going on this week, what's the goal?
>   - [ ] person 1 =
>   - [ ] person 2 =
>   - [ ] ...
> - Do we have any blockers or potential unplanned events?

It also allows everyone to block off time to do something they _want_ to do ("goals") and make sure there's time for it.  Half the time, my goal is to get some sleep or read a book.

### 3. Meal planning

Meal planning is how we avoid eating no-prep junk foods too often.  It helps us buy only what we need - avoiding extra trips to the grocery store and food waste.

Markdown tables are the clunkiest part of the template.  I use this [Markdown table generator](https://www.tablesgenerator.com/markdown_tables) to copy/paste the raw and finished table into the issue so it's easier to edit.

> | 👩🏻‍🍳             | **Sunday** | **Monday** | **Tuesday** | **Wednesday** | **Thursday** | **Friday** | **Saturday** |
> |:-------------:|------------|------------|-------------|---------------|--------------|------------|--------------|
> | **Breakfast** |            |            |             |               |              |            |              |
> | **Lunch**     |            |            |             |               |              |            |              |
> | **Dinner**    |            |            |             |               |              |            |              |
> | **Prep**      |            |            |             |               |              |            |              |

By planning meals around activities, any prep work is also accounted for.  Tasks like grocery shopping, thawing stuff from the freezer, soaking dried beans the night before, and starting dough for bread make these tasty tasks _much_ more likely to happen.

### 4. Checklist of chores

Next, we make sure the chores get done and assigned as needed.  The template has pre-populated tasks that have to happen at least weekly (fish tank maintenance, water plants, etc.) and then anything else gets added on at the end (eg, order birthday gift, schedule car maintenance).

> - [ ] 🐠 Water change on fish tank
> - [ ] 🐈 Clean kitty watering dish
> - [ ] 🌱 Water house plants
> - [ ] 🧺 Put away all the clean laundry
> - [ ] 🧹 Sweep, mop, and vacuum 🤖
> - [ ] 📋 Make weekly reward sheets for kids (homework, feed kitty, feed fish, set the table, put laundry away, pick up upstairs and downstairs toys, etc.)
> - [ ] ... edit as needed, of course ...
> - [ ] (one-off tasks that also need to be done)

## Automating it

A new issue is created and the old one closed once a week, more or less magically with GitHub Actions.  For a little less magic, use [cron](https://linux.die.net/man/8/cron) or the built-in scheduler for Windows/MacOS to create a new file once a week for the same effect.  Having it done automatically means it's ready for us to talk through as we're making dinner on Saturday - or anytime you set it to run.  Here's that workflow:

{% raw %}
```yaml
name: 🏡 Weekly planning

on:
  schedule:
    - cron: "0 21 * * 6"  # Saturday at 9 pm UTC (afternoon-ish in the US)
  workflow_dispatch:  # on demand

jobs:
  weekly_meeting:
    name: create new issue
    runs-on: ubuntu-latest
    steps:
      - name: Set Date
        run: echo "date=$(date -u '+%B %d %Y')" >> $GITHUB_ENV

      - name: Get issue template
        uses: imjohnbo/extract-issue-template-fields@v1
        id: extract
        with:
          path: .github/ISSUE_TEMPLATE/home-standup.md

      - name: Create issue
        id: create-issue
        uses: imjohnbo/issue-bot@v3
        with:
          title: "${{ steps.extract.outputs.title }} for ${{ env.date }}"
          body: ${{ steps.extract.outputs.body }}
          assignees: some-natalie, more-users-here  # names go here
          labels: "standup"
          pinned: true
          close-previous: true  # close last week's
          linked-comments: true  # but link any discussion

        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
{: file='~/.github/workflows/weekly-plan.yml'}
{% endraw %}

> You'll need to run it once manually first, then add `close-previous` to the workflow.  The `close-previous` can't really work if there's not a previous issue, causing an annoying failure.
{: .prompt-info}

## Don't make it suck

![devs-wanted](/assets/graphics/memes/safe-environment.jpg){: .shadow .rounded-10 .w-50 .right}

There's a whole lot of [**No Fun** things about project management](https://www.lafable.com/).  Home isn't work.

We don't do these **No Fun** things:

1. Metrics.  No one wants to do story point estimates.  This is more "laundry gets done" planning and less "accomplish goals in life" planning.
2. Task hierarchy, value streams, epics, initiatives, increment planning, etc.  There's no fun here and no need.
3. Anything else beyond this weekly meeting - in my personal life, there's no need to think through organizing beyond getting things done.

## Ways to expand

There's plenty of room to expand on this idea.  GitHub Issues are pretty lightweight notes that correlate well to defined tasks.  Labels correspond to larger goals or recurring things that don't ever have an end date.  With the new Projects, we can add an extra field to estimate how big of a task it really is.  Or many more fields, if we wanted to go silly with epics or other groupings of tasks.

This template can work well in most any other project management tool.  Keep simplicity in mind first before turning on all the "enterprise-y" features.

## How do I try this?

1. Create a private repository or use an existing one.
1. Create a standup issue template in `~/.github/ISSUE_TEMPLATE/weekly-planning.md`.  [Here's mine](https://github.com/some-natalie/some-natalie/blob/main/.github/ISSUE_TEMPLATE/home-standup.md) to get started.
1. Pick a time that works for everyone.  [crontab.guru](https://crontab.guru/) is a translator between the cron syntax and human-friendly times.
1. Create an Action workflow file in `~/.github/workflows/weekly-planning.yml` to create a new issue once a week, like the example above.  Change the `cron` schedule to match the chosen time.
1. Enjoy once a week auto-issues, fill them out and go! 🎉

⏱️ This entire planning week-to-week should take maybe 10 minutes or so once everyone gets the hang of it.

## Is it worth the effort?

We think so!  It's easy to set up, simple to change the template as needed, and keeping it _very_ simple means the habit sticks.  Everyone (usually) makes their commitments, fed and clothed.  Balanced meals with minimal food waste helps the grocery budget go farther too.  Making the time to list out what we want to do means we can carve out the time to really do it.

Lastly, including the children encourages autonomy and participation.  They have some visibility into work travel and other changes in routine, making those transitions less dramatic.  The kids also feel empowered when they can make a favorite food, tell us what school activities they have (even if we already know), and set little goals with us.

🧀 In the end, we nag the kids less for the price of eating mac and cheese (Kraft dinner) once a week.  It's a fantastic parenting trade-off.

![snow-white](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/snow-white.gif){: .shadow .rounded-10}
_still not how the house works, but we can dream_

---

## Footnotes

[^real]: I can already hear the "but that's not _real scrum_" chorus.  You may be right - we only do the parts that work for us - planning and retrospective.  Shove it. 💖
[^vary]: To highly varying definitions of success.
[^things]: A **shared text note** in several different note programs had no sense of time and just grew without priority.  A **physical whiteboard with calendar** has to be kept out of reach of kids but still very visible, but no view when not at home.  A **digital calendar** works for appointments but "chores" and other un-timed things kept piling up or not getting done.
