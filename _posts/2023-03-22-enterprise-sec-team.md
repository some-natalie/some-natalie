---
title: "Managing an enterprise-wide application security team on GitHub"
date: 2023-03-22
tags:
  - business
  - security
  - graphql
excerpt: "Create and manage a uniform team enterprise-wide - or how that last mile really is the hardest."
---

<div style="text-align:center"><p style="font-size: 20px"><b>
✨ I built a thing! ✨
<br>
💖 Then open-sourced it for the whole world to use! 💖
</b></p></div>

I wrote a set of Python scripts that creates and manages a team of folks that can access _all_ of the security alerts throughout the entire enterprise's codebase.  The scripts do this by adding an enterprise owner to each and every organization, then creating a team with the [security manager](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization) role, then managing that team's membership.  It's deceptively tricky because there's a few different parts of GitHub's API that need to come together to accomplish this, but it _seems_ simple up front.

> Here's the project - [advanced-security/enterprise-security-team](https://github.com/advanced-security/enterprise-security-team)
{: .prompt-tip}

## Where we're going

- [How do you know how many organizations you even have?](#how-do-you-know-how-many-organizations-you-even-have)
- [Owning all the organizations](#owning-all-the-organizations)
- [Managing the team](#managing-the-team)
- [Putting it all together](#putting-it-all-together)
- [Finishing touches](#finishing-touches)
- [Lessons learned](#lessons-learned)

## How do you know how many organizations you even have?

I spent around 6 years leading the _self-hosted_ GitHub Enterprise product as a customer - controlling so much more of the infrastructure and having access to extra administrative tools (like [SSH access](https://docs.github.com/en/enterprise-server@latest/admin/configuration/configuring-your-enterprise/command-line-utilities), [database access](https://github.com/github/platform-samples/tree/master/sql), and [other silly things](https://github.com/github/platform-samples/tree/master/pre-receive-hooks) you probably shouldn't do).  I'd expected to have an [easy CSV report](https://docs.github.com/en/enterprise-server@latest/admin/configuration/configuring-your-enterprise/site-admin-dashboard#reports) of all my organizations in the cloud SaaS product, just like the self-hosted product.  It's not there.  Instead, there's a lovely GUI with a count and a list by name.

![cloud-vs-server](/assets/graphics/2023-03-22-enterprise-sec-team/cloud-vs-server.jpg)
_How things should never be - dream of feature parity! ♥️_

[Screen-scraping](https://en.wikipedia.org/wiki/Data_scraping#Screen_scraping) literally takes the wings off of angels and makes kittens cry - so that's entirely out of the question.  Surely this info is available via the API.  It is, buuuuuut ... there's an uncomfortable difference in how the APIs work on REST and GraphQL.

Here's what the [list organizations](https://docs.github.com/en/rest/orgs/orgs?apiVersion=2022-11-28#list-organizations) looks like in REST.

```console
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /organizations
```

```json
[
  {
    "login": "errfree",
    "id": 44,
    "node_id": "MDEyOk9yZ2FuaXphdGlvbjQ0",
    "url": "https://api.github.com/orgs/errfree",
    "repos_url": "https://api.github.com/orgs/errfree/repos",
    "events_url": "https://api.github.com/orgs/errfree/events",
    "hooks_url": "https://api.github.com/orgs/errfree/hooks",
    "issues_url": "https://api.github.com/orgs/errfree/issues",
    "members_url": "https://api.github.com/orgs/errfree/members{/member}",
    "public_members_url": "https://api.github.com/orgs/errfree/public_members{/member}",
    "avatar_url": "https://avatars.githubusercontent.com/u/44?v=4",
    "description": null
  }
]
```

That organization isn't in my enterprise account.  It's one of the oldest existing organizations in GitHub.  That does me no good here.  This endpoint lists all organizations in GitHub that you can see and that's a deliberate choice.  However, I only want to list everything my enterprise account owns.  

![no-idea](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/no-idea.gif)
_How I feel every time I have to use GraphQL ... nothing makes it feel normal_

Let's try the [list organizations](https://docs.github.com/en/graphql/reference/objects#enterpriseorganizationmembershipedge) query in GraphQL.  I fired up [GraphiQL](https://github.com/graphql/graphiql) and started poking around to come up with this query.

```graphql
query listEnterpriseOrganizations {
      enterprise(slug: "octodemo") {
        organizations(viewerOrganizationRole: OWNER first: 1) {
          edges{
            node{
              id
              createdAt
              login
              email
              viewerCanAdminister
              viewerIsAMember
              repositories {
                totalCount
                totalDiskUsage
              }
            }
            cursor
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
```

```json
{
  "data": {
    "enterprise": {
      "organizations": {
        "edges": [
          {
            "node": {
              "id": "removed",
              "createdAt": "2018-05-03T09:44:04Z",
              "login": "octodemo",
              "email": "sales@github.com",
              "viewerCanAdminister": true,
              "viewerIsAMember": true,
              "repositories": {
                "totalCount": 347,
                "totalDiskUsage": 21228784
              }
            },
            "cursor": "cursorremoved"
          }
        ],
        "pageInfo": {
          "endCursor": "cursorremoved",
          "hasNextPage": true
        }
      }
    }
  }
}
```

Now that's a lot better!  Even though I struggled on [pagination](https://graphql.org/learn/pagination/) (and just about everything else) in GraphQL, we can get more results per query and iterate over them now get the complete list of organizations in an enterprise (full query [here](https://github.com/advanced-security/enterprise-security-team/blob/main/src/organizations.py#L36-L60)). 🎉

## Owning all the organizations

This is remarkably simple on the self-hosted side.  The command has been baked in for years, called [`ghe-org-admin-promote`](https://docs.github.com/en/enterprise-server@latest/admin/configuration/configuring-your-enterprise/command-line-utilities#ghe-org-admin-promote).  You SSH to the admin console, run the command, and it adds you to every single organization as an owner.  It's no fun to automate and hard to build a robust system around SSH commands, but it does work.  For obvious reasons, this doesn't exist in a multi-tenant SaaS product.

However, there _is_ an API for that available across Cloud and Server - it's just that it's only in GraphQL.  Now to learn how to mutate data in GraphQL - it's kind of like a `POST` or `PUT` request in a REST API, except it's awkward at first. 😅

Here's the [docs for this mutation](https://docs.github.com/en/enterprise-cloud@latest/graphql/reference/mutations#updateenterpriseownerorganizationrole) and the query:

```graphql
mutation promoteEnterpriseAdminToOwner {
  updateEnterpriseOwnerOrganizationRole(input: {enterpriseId: "ENTERPRISE_ID", organizationId: "ORG_ID", organizationRole: ORG_ROLE}) {
    clientMutationId
  }
}
```

## Managing the team

Creating a team and managing the members is easily done with [the REST API](https://docs.github.com/en/enterprise-cloud@latest/rest/teams/teams?apiVersion=2022-11-28) and a bit of Python for [string replacement](https://docs.python.org/3/library/stdtypes.html?highlight=replace#str.replace) and [list operations](https://docs.python.org/3/tutorial/datastructures.html).

The simple architecture is using boring Python functions, broken into two folders.  The scripts in the root directory are designed for an end user to run and ✨ _do a thing_ ✨, like list all orgs and add an enterprise admin as owner.  The functions in the `src` directory _do not_ do anything directly, but are called by the scripts in the root directory.  

No fancy data types were used, there's nothing complicated going on, and it's all super documented because I didn't want to write much code at all.  I want to be kind to future me, debugging this or needing to add/change parts.

## Putting it all together

This solution came together and was tested in a few days between my other job duties.  At around 500 lines (roughly?) of Python code, it's not at all a large project.  It came together so quickly for two reasons - simple architecture and GitHub Copilot.  I wanted to give my pair programmer some context to do all the hard work.

![copilot](/assets/graphics/2023-03-22-enterprise-sec-team/copilot-suggestion.png)
_Why do I even bother anymore?_

GitHub Copilot made fast work of generating functions and navigating around the tricky parts of GraphQL.  It even picked up my preferred coding conventions, giving me pre-formatted code (of course, it's using [black](https://github.com/psf/black)).

## Finishing touches

The last few items to add before releasing this to the world were all templates that only needed a tiny bit of modification.  Having a "paved path" to open sourcing a bit of code is fantastic.  It took me perhaps half an hour to track down _all_ of the community health files and such from our templates, edit as needed, and ask for approval via an Issue.  Not once was I fumbling to figure out how best to write a Code of Conduct or think through what license I really wanted to use.  Once approved, it was another few minutes to hit the big "make it public!" button. 🎉

- A `.gitignore` file from GitHub's massive [template repository](https://github.com/github/gitignore), which was edited to also ignore `token.txt` and all CSV files.  This'll help prevent accidentally checking in data or secrets.
- [Community health files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) like a license, code of conduct, and security policies that came from the organization's template.
- A couple of GitHub Actions to make project maintenance easier.  I'm not going to be checking these every single week, so all automation is welcome here.  🤖
  - The [super-linter](https://github.com/github/super-linter) validates that all Python, Markdown, and GitHub Actions files are valid and formatted correctly (read, `black`ened) at every pull request. ([workflow file](https://github.com/advanced-security/enterprise-security-team/blob/main/.github/workflows/super-linter.yml))
  - [Dependency review](https://github.com/actions/dependency-review-action) looks at `requirements.txt` and makes sure no new dependencies add security debt ([workflow file](https://github.com/advanced-security/enterprise-security-team/blob/main/.github/workflows/dependency-review.yml))
  - [CodeQL](https://docs.github.com/en/enterprise-cloud@latest/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning) does some static analysis and code security checks, keeping the code secure ([workflow file](https://github.com/advanced-security/enterprise-security-team/blob/main/.github/workflows/codeql.yml))
  - [Stale](https://github.com/actions/stale) closes out issues and pull requests after a time of inactivity, keeping everything fresh ([workflow file](https://github.com/advanced-security/enterprise-security-team/blob/main/.github/workflows/weekly-cleanup.yml))
  - [Dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates) version updates send me PRs automatically to update all my external dependencies ([config file](https://github.com/advanced-security/enterprise-security-team/blob/main/.github/dependabot.yml))

## Lessons learned

When I joined GitHub, one of the product managers that I'd talked with a lot as a customer said there's a partnership between field folks like myself and the product team - but it wasn't readily obvious how that worked exactly.  I've dutifully gathered customer feedback, documenting it for later, and retelling those stories as frequently and thoroughly as possible.  It took putting this together myself - with a ton of back-and-forth ideas while iterating over each of the discoveries and design choices I made of "what is that customer story really about?" and "who are you building _for_?" for it to finally click for me.

![jeff-goldblum](https://media.githubusercontent.com/media/some-natalie/some-natalie/main/assets/graphics/gifs/jeff-goldblum-jurassic-park.gif)
_what happens when you don't figure out the problem to solve AND why it's worth solving ... there might have been a movie or two about this_

This is a weird problem to solve for _correctly_.  These scripts strung together lots of API building blocks that were pointed out by said amazing product manager every time I got stuck.  As a set of scripts, it should work for most people needing to do this task, but it has ~~major limitations~~ some broad assumptions like:

- it won't make new accounts for people who don't already exist and are enterprise members
- it won't touch teams that are kept in sync by an identity provider
- you need to _edit_ scripts in line like it's 1999 ... no fancy wrapper scripts or inputs from `stdin`
- it uses the built-in [security manager](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization) role, so there'd need to be some script modification to create/manage a [custom role](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/about-custom-repository-roles) as well

Product hears more stories and thinks further out.  The constant iteration of "why?" and "who?" was critical to figure out an approach that works for a reasonable number of people.  I hope these scripts will make the frantic inventory to determine who needs to drop everything to fix the latest named vulnerability an easy 2-second search and - just maybe - promote developers and operations (and everyone else) working together with security folks. ♥️
