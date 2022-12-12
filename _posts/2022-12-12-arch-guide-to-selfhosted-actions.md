---
title: "Architecture guide to self-hosted GitHub Actions"
date: 2022-12-12
categories:
  - blog
tags:
  - CI
  - github-actions
  - business
  - kubernetes
classes: wide
excerpt: "When you absolutely, positively have to host it yourself, here's some help."
---

This piece is going to take a look at what this feature is and a quick overview of how it works, then go through some key decisions you should think through as you set it up.  A bunch of experience both building and running this at scale as well as advising others doing the same went into this writeup.  Opinions from that experience are noted in the last paragraph of each key decision, as well as some reasoning as to _why_.  Links to jump ahead:

- [Introduction](#introduction)
  - [What's GitHub Actions?](#whats-github-actions)
  - [Why self-hosted?](#why-self-hosted)
- [Key decisions](#key-decisions)
  - [Duration](#duration) - how long is this solution going to exist?
  - [Scaling](#scaling) - how to change the amount of resources used?
  - [Platform](#platform) - bare metal, virtual machines, or Kubernetes?
  - [Persistence](#persistence) - how long should each build environment live for?
  - [Compute design](#compute-design) - design patterns to consider based on other decisions.
  - [Compute scope](#compute-scope) - how many users and how many groups?
  - [Policy and compliance](#policy-and-compliance) - of course this needs to be thought through
- [Recommendations](#recommendations)
- [Disclosure](#disclosure)
- [Footnotes](#footnotes)

## Introduction

This is written for GitHub Enterprise administrators wanting to self-host compute for GitHub Actions, especially for [Enterprise Server](https://docs.github.com/en/enterprise-server@latest) (self-hosted).  If you're not self-hosting, you're still welcome as well!  You might find helpful tips and tricks nonetheless.  :tada:

We're _not_ covering the details of which GitHub Enterprise version you should be on or any future roadmap items.  If that's of interest, reach out to the friendly [Sales](https://github.com/enterprise/contact) or [Support](https://enterprise.github.com/support) teams.

### What's GitHub Actions?

Glad you asked!  You can learn all about it [here](https://docs.github.com/en/actions), but the tl;dr awesome video version is in [this YouTube video](https://www.youtube.com/watch?v=cP0I9w2coGU).  It's a tool that can be used to automate all sorts of stuff done manually or locally, like:

- Building and deploying software
- Regression and integration testing
- Linting code (like [this](https://github.com/github/super-linter))
- Running security tools
- Git branch management and other chores
- Reward users with cat gifs (no, [really](https://github.com/ruairidhwm/action-cats))
- Close stale issues and pull requests ([link](https://github.com/actions/stale))
- Integrate with pretty much any other thing that could ever possibly use GitHub
- ... and a lot more ...

There's a whole [marketplace](https://github.com/marketplace?type=actions) full of building blocks of automation to use - over 16,000 of them as of December 2022.  It's also easy to [create your own](https://docs.github.com/en/actions/creating-actions), further ensuring robots do all the boring work.

### Why self-hosted?

GitHub provides hosted, managed runners that you can use out of the box - but only for users within GitHub.com (Enterprise or not).  Information on features, hardware specs, and pricing for this compute can be found [here](https://docs.github.com/en/enterprise-cloud@latest/actions/using-github-hosted-runners/about-github-hosted-runners).  They're easy to use and offer a wide variety of software built-in, which can be customized as detailed [here](https://docs.github.com/en/enterprise-cloud@latest/actions/using-github-hosted-runners/customizing-github-hosted-runners).  While great, the managed runners don't fit everyone's use case, so bring-your-own compute is also fully supported.  It's a straightforward process to install the [runner agent](https://github.com/actions/runner) on the compute needed.  Common reasons for choosing self-hosted runners include:

- Custom hardware (like ARM processors or GPU-focused compute)
- Custom software beyond what's available or installable in the hosted runners (like needing to build on Red Hat Enterprise Linux)
- You don't have the option to use the GitHub-managed runners because you are on [GitHub Enterprise Server](https://docs.github.com/en/enterprise-server@latest).
- Needing to run jobs in a specific environment such as "gold load" type imaged machines
- Because you _want_ to and I'm not here to judge that :heart:

This means that you, intrepid Enterprise administrator, are responsible for setting up and maintaining the compute needed for this service.  The [documentation](https://docs.github.com/en/enterprise-server@latest/actions/hosting-your-own-runners/about-self-hosted-runners) to do this is a great place to start understanding what's possible.

If you're already used to running your own enterprise-wide CI system, GitHub Actions is probably easier than it seems - we're going to talk through a few implementation differences from other common tools in this space.  If you aren't, or are starting from scratch, it can be a bit daunting.  That's where this guide comes in.  The next section is all about some key decisions to make that will determine how to set up self-hosted compute for GitHub Actions.

## Key decisions

### Duration

How long is this environment going to be around?  Are you kicking the tires on figuring out GitHub or if you want to self-host runners?  

If the goal is to try and quickly figure out Actions, maybe try a few builds, look at policies that can be set, etc. **and** there's existing CI infrastructure in place - the simplest path forward is usually to remove the agent of the existing CI system (Jenkins, Azure Devops, etc.) and install the agent for GitHub Actions ([directions](https://docs.github.com/en/enterprise-server@latest/actions/hosting-your-own-runners/adding-self-hosted-runners)) for a subset of the existing infrastructure.

> **:sparkles: Tip! :sparkles:** This is also one of the easiest paths to migrate fully, removing a lot of the hidden "rip and replace" infrastructure costs like needing to learn a new platform or tool.

The rest of this guide is assuming that we're mostly past kicking the tires and are figuring out the best path forward for the enterprise.

### Scaling

How do you want or need to scale up?  By using the runners provided by GitHub, this is handled invisibly to users without any additional fiddling.  Any self-hosted infrastructure doesn't have the same "magic hardware budgeting" out of the box - this is no exception.  Some things to keep in mind:

- **GitHub Actions are parallel by default.**  This means that unless you specify "this job depends on that job" within any workflow, they'll both run at the same time ([link](https://docs.github.com/en/actions/using-workflows/advanced-workflow-features#creating-dependent-jobs)).  Jobs will wait in queue if there are no runners available.  The balance to search for here is minimizing job wait time on users without having a ton of extra compute hanging out idle.  Regardless of if you're using a managed cloud provider or bare metal, efficient capacity management governs infrastructure costs.
- **Users can have multiple workflows kick off simultaneously.**  GitHub Actions is event-driven, meaning that one event can start several processes.  For example, by opening a pull request targeting the default branch, that user is proposing changes into what could be "production" code.  This can and should start some reviews.  Good examples of things that can start at this time include regression testing, security testing, code quality analysis, pinging reviewers in chat, update the project management tool, etc.  These can, but don't necessarily _need_ to, run in parallel.  By encouraging small changes more often, these should run fairly quickly and frequently too, resulting in a faster feedback loop between development and deployment.  However, it means that your usage can get "peaky" during work hours, even with jobs waiting in queue.
- **GitHub Actions encourages automation beyond your legacy CI system.**  It can do more with less code defining your pipeline, users can provide all sorts of additional things for it to do, and it can even run conditional or scheduled shell scripts and other operations-centric tasks.  These are all great things, but a project that used X minutes of runtime on Y platform may not linearly translate to the same usage.  The [GitHub Actions Importer](https://github.com/github/gh-actions-importer) has some usage forecasting built-in to consider as part of your migration as well.
- **Migrating to GitHub Actions can be a gradual transition.**  The corollary to above is that while the end state may be more compute than right now, it's a process to get a project to migrate from one system to another and then to see their usage grow over time.  Without external pressure like "we're turning off the old system on this date", it'll take a while for users to move themselves.  Use this to your advantage to scale your infrastructure if you have long-lead tasks such as provisioning new servers or appropriating budget.

:information_desk_person: **Opinion** - This is one of those cases where the balance between infrastructure costs and the time a user will spend waiting for a runner to pick up a job can really swing how they perceive the service.  Even if developer experience isn't the top priority for your enterprise team, waiting forever for jobs to execute runs the risk of creating "shadow IT"[^1] assets or doing dangerously silly things[^2] to get the job done.

### Platform

What platform do you want to run on?  The runner agent for GitHub Actions works in modern versions of Mac OS, Windows, and most major distributions of Linux.  This leaves a lot of flexibility for what the platform to offer to your user base looks like.  The diagram below offers an overview of the options to consider.

![Deployment options](https://d33wubrfki0l68.cloudfront.net/26a177ede4d7b032362289c6fccd448fc4a91174/eb693/images/docs/container_evolution.svg)

**Bare metal** comes with the upside of simpler management for end-user software licenses tied to hardware or supporting specialized devices.  In a diverse enterprise user base, there is always a project or two that needs a GPU cluster or specialized Mac hardware to their organization or repository.  Planning to support this at least as an edge case is a good choice for that reason.  However, it comes with the cost of owning and operating the hardware 24/7 even if it isn't in use that entire time.  Since one runner agent corresponds to one job, an agent on a beefy machine will still only run one job to completion before picking up the next one.  If the workloads are primarily targeted to the hardware needed, this isn't a problem, but it can be inefficient if not considered at an enterprise scale.

**Virtual machines** are simple to manage using a wide variety of existing enterprise tooling at all stages of their lifecycle.  They can be as isolated or shared across users as you'd like.  Each runner is another VM to manage that isn't fundamentally different from existing CI build agents, web or database servers, etc.  There are some community options to scale them up or down as needed, such as [Terraform](https://github.com/philips-labs/terraform-aws-github-runner) or [Ansible](https://github.com/MonolithProjects/ansible-github_actions_runner), if that's desired.  The hypervisor that manages the VM infrastructure handles resource allocation in the datacenter or it's :sparkles: magically handled :sparkles: by a private cloud provider such as Azure or AWS.

**Kubernetes** provides a scalable and reproducible environment for containerized workloads.  Declarative deployments and the ephemeral nature of pods used as runner agents creates fewer "works on this agent and not that one" problems by not allowing configuration to drift.  There are a lot of advantages to using Kubernetes (outlined [here](https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/)), but it is more complicated and less widely-understood than the other options.  A managed provider makes this much simpler to run at scale.

> **Note**
>
> Some GitHub Actions ship as Dockerfiles ([documentation](https://docs.github.com/en/actions/creating-actions/about-custom-actions)), meaning the workload builds and runs in the container it defines.  Whichever path is chosen here, a container runtime should be part of the solution if these jobs are required.  This could mean Docker-in-Docker (requiring privileged pods) for Kubernetes-based solutions.

:information_desk_person: **Opinion** - Whatever is currently in use is probably the best path forward.  Doing this means every team involved (operations, security, resource management, etc) already has processes for building and maintaining things without creating exceptions or new processes.  I hesitate to recommend a total infrastructure rebuild for a few more servers in racks, or VMs, or container deployments.  Managed providers of VM infrastructure or Kubernetes clusters take away the hardware management aspect of this.

### Persistence

How persistent or transient do you want the environment that is building the code to be?  Should the state of one random job that runs on this machine/container affect any other random job?

There's a lot to unpack here, so here's a helpful analogy:

> A build environment is like a kitchen. You can make all sorts of food in a kitchen, not just the one dish that you want at any given time. If it's just you and some reasonable roommates, you can all agree to a shared standard of cleanliness. The moment one unreasonable house guest cooks for the team and leaves a mess, it's a bunch of work to get things back in order (broken builds). There could also be food safety issues (code safety issues) when things are left to get fuzzy and gross.
>
> Imagine being able to snap your fingers and get a brand new identical kitchen at every meal - that's the power of ephemeral build environments. Now imagine being able to track changes to those tools in that kitchen to ensure the knives are sharp and produce is fresh - that's putting your build environment in some sort of infrastructure-as-code solution.

The persistence here is somewhat independent of the platform chosen.  Bare metal ephemeral runners are possible, but may require more effort than a solution based on virtual machines or containers.  The _exact_ way this gets implemented depends a lot on the other parts and pieces of your unique platform.

:information_desk_person: **Opinion** - More ephemeral and version-controlled are harder to get started with for building and maintenance, but also have benefits that really shine with lots of diverse teams sharing resources.  In my experience, persistent environments tend to work well for single projects and start to have problems when the project needs change or there are more projects sharing hardware.  In my experience, maintenance of shared tooling tends to be less of an institutional priority over time - so routine patches, upgrades, etc., become overlooked.[^3]

### Compute design

This decision depends a lot on how persistent or ephemeral the compute is and the particulars of the environment it lives in, but the goal here is to figure out how large or lean the environment is at runtime.

- **Larger environments with lots of pre-loaded software decrease job execution time.**  As the user base grows in size and diversity of needs (languages, tools, frameworks, etc.), having the more common things installed in the "base" image allows for faster job execution.  If the compute is discarded and provisioned again after each job, this comes at the expense of bandwidth between the compute and the container registry, storage server, or wherever the "base" image comes from.
- **Persistent environments can have conflicting update needs.**  When there's more software to manage, there's a bigger chance that updates conflict or configuration can drift.  That doesn't mean this isn't the right choice for some projects, such as projects that need software that isn't able to be licensed in a non-persistent state or is difficult to automate.  This can be mitigated somewhat by having persistent compute scoped to only the project(s) that need it (more on this in the next section).
- **Larger environments with lots of pre-loaded software increases vulnerability area.**  If you're scanning the build environment with any sort of infrastructure security scanning tool, there's more things for it to alarm on in larger images.  The validity and volume of these alarms may vary based on tools used, software installed, etc.
- **Smaller ephemeral images that consistently pull in dependencies at setup increases bandwidth use.**  A job that installs build dependencies every time it runs will download those every time.  This isn't necessarily a bad thing, but keep in mind your upstream software sources (such as package registries) may rate-limit the entire source IP, which affects every project in use and not just the offending project.  Installing dependencies at setup also increases your build times.  There are ways to mitigate some of this, including the use of a caching proxy and/or private registries.

:information_desk_person: **Opinion** - This isn't a binary choice and can always change as the project/enterprise needs change.  I wouldn't spend too much time on this, but have tended to prefer larger images with more things in them to minimize traffic out of the corporate network at the cost of bandwidth usage internally.

### Compute scope

GitHub Enterprise can have runners that are only available to an individual repository, all or select repositories within an organization, or all or select organizations within the entire enterprise (detailed [here](https://docs.github.com/en/enterprise-server@latest/actions/hosting-your-own-runners/about-self-hosted-runners)).  What is the ideal state for your company?

:information_desk_person: **Opinion** - All of the above is likely going to happen with any sufficiently diverse user base, so let's make this as secure and easily governable as possible.  Some teams will need to bring their own hardware and not want to share, which is reasonable, so will join their compute to only accept jobs from their code repositories.  This also means that admins can do some networking shenanigans to allow only runners from X subnet to reach Y addresses to meet rules around isolation if needed.  Likewise, as an enterprise-wide administrator, I wanted to make the most commonly-used Linux compute available and usable to most users for most jobs.

### Policy and compliance

Is there any policy you need to consider while building this out?  Examples could be scan your containers/VMs/bare metal machines with some security tool, to have no critical vulnerabilities in production, project isolation, standards from an industry body or government, etc.

Here's some helpful links for security-related _stuff_ on self-hosted runners.  They are all fantastic reads and well worth spending time looking over in-depth (again and again).

- [Security hardening for GitHub Actions](https://docs.github.com/en/enterprise-server@latest/actions/security-guides/security-hardening-for-github-actions)
- [Managing access to self-hosted runners](https://docs.github.com/en/enterprise-server@latest/actions/hosting-your-own-runners/managing-access-to-self-hosted-runners-using-groups)
- [Managing access to actions from GitHub.com](https://docs.github.com/en/enterprise-server@latest/admin/github-actions/managing-access-to-actions-from-githubcom)

:information_desk_person: **Opinion** - I don't know all the policies everywhere at all times, but I've always found it very helpful to gather these requirements up front and keep them in mind.

## Recommendations

Here's a few general recommendations that don't fall neatly into the above, learned from experience:

- Don't underestimate the power of enterprise-wide availability to drive adoption among users.  Just like it's easy to use the GitHub-hosted compute, having a smooth and simple onboarding experience for internal users is critically important.  Offering easy-to-use compute to users is a great "carrot" to keep shadow IT assets to a minimum.
- "Why not both?" is usually a decent answer.  Once you get the hang of how to manage access to unique groups of runners ([documentation](https://docs.github.com/en/enterprise-server@latest/actions/hosting-your-own-runners/managing-access-to-self-hosted-runners-using-groups)), it becomes a low marginal effort to enable more distinct projects.
- Ephemeral compute is great and even better when you have diverse users/workloads.  Each job gets a fresh environment, so no configuration drift or other software maintenance weirdness that develops over time.
- Ephemeral environments still need care and feeding!  Instead of updating software via some central management, images need to be updated, tested, and deployed.
- Docker-in-Docker for Kubernetes is _hard_.  Develop a good foundation of knowledge in Kubernetes, especially around security, before going down this route.  I wrote about this previously [here](https://some-natalie.dev/blog/kubernetes-for-enterprise-ci/#docker-in-docker) and have lots of other references in that talk as well.
- Ship your logs somewhere.  You can view job logs in GitHub and that's handy for teams to troubleshoot their stuff, but it's hard to see trends at scale there.
- Scaling, especially for "peaky" loads like build jobs, is made better by a managed provider.
- Have a central-ish place for users to look for information about the company's specific build-out.  This should probably be wherever the rest of the documentation for the company lives.  If it's not _extremely_ easy to find and in the top couple search results for that internal docs tool, that's probably not the right place for it.
- You're building and operating and securing your own company-wide SaaS.  It's hard.  Do you really need to / want to do this?[^4]

---

### Disclosure

I work at GitHub as a solutions engineer at the time of writing this.  All opinions are my own.  The purpose of writing this is to have a written reference to a conversation I have frequently on architecture decisions and usage patterns for self-hosted GitHub Actions runners within large and diverse companies, which may be helpful more broadly.

---

### Footnotes

[^1]: "Shadow IT" encompasses all types of ungoverned infrastructure set up to workaround a central IT department.  Basically, bring-your-own-device without being allowed to do so.  More about this on [Wikipedia](https://en.wikipedia.org/wiki/Shadow_IT).
[^2]: "Dangerously silly" things I have seen here include ungoverned cloud infrastructure accounts going to purchase cards, random servers in offices that haven't been updated in _years_, a laptop on a shared desk that said "do not unplug or close lid" taped to it, tons of scripts and config files disabling SSL verification entirely so as not to fail with corporate TLS encryption breaking, etc.
[^3]: There's two problems at play here, depending on company structure.  The first is the "tragedy of the commons" ([Wikipedia](https://en.wikipedia.org/wiki/Tragedy_of_the_commons)), where users share resources without responsibility of care back towards that resource.  The company is providing a shared resource, but without direct responsibility of the cost/security/infrastructure management of that resource.  The second is the "front office / back office" divide, where this sort of system falls into a cost center that can be deprioritized over time.
[^4]: I wrote about the "build it or buy it" decision [here](https://some-natalie.dev/blog/waiting-on-builds-pt-3/).  Even if you already _have_ to build it, it's helpful to understand the full costs.
