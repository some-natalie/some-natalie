---
title: "GraphQL patterns to know"
date: 2024-04-24
excerpt: "Handy snippets, tips, and tricks for working in GraphQL I struggled for so you don't have to."
tags:
- graphql
- project-management
---

[Last time](../graphql-intro), we covered the basics of GraphQL to interact with custom fields and other project management properties in GitHub's project boards.  Now that we know how to use it, here's some patterns, tips, and tricks I've found useful in my most recent adventures in GraphQL. 🦉

> This is part 2 of 2 in a short series on GraphQL, where I'm building reports and automation on top of the GraphQL API for GitHub's new project boards.  [Part 1](../graphql-intro) is all about the terms and basics, building into a query that will return data from your custom fields.
{: .prompt-info}

## SQL isn't that far from the truth

It's called **GraphQL** for a reason.  It's a query language, just a little less structured. 😉

It helped me to think about this more like old-school database admin and not CRUD scripting w/ a REST API.  First, think through what you _need_, then ask only for it.  Be careful of ~~JOINS~~ unions, nested queries, and such.  It can get out of hand quickly, just like unoptimized SQL.  I haven't had a reason to use [fragments](https://graphql.org/learn/queries/#fragments) yet, but I can see how they'd be even closer to SQL.

## GET ALL THE DATA is an anti-pattern

![kitten](/assets/graphics/memes/kitten.jpeg){: .shadow .rounded-10 .left }

There's an ambiguous point where GraphQL reaches **an anti-pattern in compiling a comprehensive set of data.**  It's possible to get _all_ issues, pull requests, and every associated activity and custom field and more in a busy repository via GraphQL.  It's just awkward.

GraphQL was designed to return _exclusively_ what you're querying for.  It's great at getting only open issues, or only the labels on a repository, or the latest custom fields.  It's efficient on bandwidth, performant on both the client and server, and straightforward to work with.  This is exactly the opposite of trying to compile a comprehensive report of something - hence the anti-pattern.

I tend to build reports for compliance or data exports to move into another system, which face this problem frequently.  In these cases, grabbing a "total count" or other checksum-type field can act as a good validation if you're picking up a lot of data.  Most objects that can be accessed in GitHub's GraphQL API have that field.  Here's an example for admins to return a total count of all organizations in an enterprise, not only the ones the admin is a part of:

```graphql
query countEnterpriseOrganizations($slug: String!) {
  enterprise(slug: $slug) {
    organizations{
      totalCount
    }
  }
}
```

You can store this `totalCount` number, then use it later to ensure the count of the query below, returning data about every individual organization, are equal to each other.  This will catch unintended directives, improper pagination, and other common ways to accidentally not get all the data.

```graphql
query listEnterpriseOrganizations($slug: String!) {
  enterprise(slug: $slug) {
    organizations(first: 10) {
      edges {
        node {
          login
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
}
```

## Factoring queries

![big-query](/assets/graphics/memes/pipe-maze.jpeg){: .shadow .rounded-10 .w-50 .right }

There are a lot of ways to factor queries.  What's best really depends on your use case.  In general, **more small queries are easier to debug and reuse** than fewer larger queries.  They're **also less fragile** - since [GraphQL APIs are usually not versioned](https://graphql.org/learn/best-practices/#versioning), smaller queries reduce the possible impact of an upstream change.

If you need to grab and manipulate 3 data points on a project, it may be easier to write 3 distinct queries to fetch them individually.  Once you have the data, then you can manipulate it locally.  Going back to [this query from part one](../graphql-intro#aliases), it can be broken up into multiple simple queries a few ways:

- Only return the custom fields
- Query by issue, then ask for data (like labels or assignees) as needed
- Return the labels or assignees in another query
- Filter based on issue status before looking for more data

That said, having a single huge query to do one big task is honestly not _that_ bad if it's well-commented and doesn't need to change frequently.  These big queries excel at generating one comprehensive report.

## Tools make it better

So far, I've found two modes of development around GraphQL - one for writing the queries and another for doing things with the data.  It seems that these two are different enough to use different tools.

For writing and **iterating on queries**, web UI explorers powered by [GraphiQL](https://github.com/graphql/graphiql) are amazingly flexible.  These allow fast syntax highlighting and error recognition, both syntax errors and validation against the schema.  It's been helpful to help me understand the nodes/edges/unions data structures that are able to be used.  Both [GitHub](https://docs.github.com/en/graphql/overview/explorer) and [GitLab](https://gitlab.com/-/graphql-explorer) have their own implementations of this.  As a heads up, the version of GraphiQL available in [Homebrew](https://formulae.brew.sh/cask/graphiql#default) is a little out of date, so you might want to use the web version.

Once I'm working with the **data returned from queries**, the [GraphQL language feature extension](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) is handy to provide some autocompletion and syntax highlighting, if you're already into using VS Code.  It'll also do the same validation on schema as well.  I'll tend to copy/paste mostly working queries in and out of the web UI to get close, then refine from my editor.  Either way, you'll find the path that works best for you.

## Don't fear mixing with REST

Somewhat frustratingly, there isn't 100% feature overlap between what's available in GraphQL and REST for GitHub's API.  The `ProjectsV2` experience is great, but exclusive to GraphQL.  Other parts of the product are exclusively in REST.  Sometimes, you'll need to use both to get stuff done.  This seems common in other products that contain both a RESTful and GraphQL API too.

## Language doesn't seem to matter

Seems like most languages can work with GraphQL without a problem, so **use whatever the rest of the project is in.**

The only exception I'll note is shell scripting.  Functionally, it's more or less wrapping `jq` and `curl` ... which is fine enough I guess?  If you absolutely have to stay in shell scripting, consider adding the [GitHub CLI](https://cli.github.com/manual/gh_api) to your dependencies instead to keep things simpler for humans.

## AI isn't replacing me yet

![copilot-meme](/assets/graphics/memes/copilot.jpg){: .w-50 .shadow .rounded-10 .right }

My AI-powered coding friends weren't nearly as much of a helper as usual, even though most of my work with GraphQL is in uncomplicated CRUD tasks.  They didn't know or hallucinated API endpoints that weren't there, even on one of the most common GraphQL APIs.  I didn't notice this behavior so frequently using RESTful APIs.

I would guess there is significantly more public code to train on using REST APIs versus GraphQL - both overall and for GitHub's API specifically.  This also would also explain why it was still excellent at pointing out what didn't exist out of an error message I'd asked about, yet equally terrible at suggesting any path forward.

What was 🌟 **phenomenally helpful** 🌟 was the built-in [code search](https://github.com/features/code-search), specifically filtering for `.graphql` or `.gql` files.  There are shockingly few public examples of GraphQL APIs overall, and of GitHub's newer projects experience specifically.  I found a few examples of queries for different products or parts of GitHub's API that were helpful enough to understand the structure of the queries and get me unstuck.

## Watch your rate limits

It's much **easier to accidentally ask for way too much data recursively** in GraphQL.  As these `first: number` fields can nest multiplicatively, API limits become much more important to keep an eye on.  This also means that it's easier for developers to scope this poorly, granting too much information w/ a query because these are harder to understand than a REST endpoint.

Lastly, depending on the product you're working with, there are different rate limits.  Rate limits can be on queries, data returned, query depth, and more - or any combination of these.  Shopify is somewhat famous for having [an intricate rate limit structure](https://shopify.dev/docs/api/usage/rate-limits), but GitHub has [an equally complicated point system](https://docs.github.com/en/graphql/overview/rate-limits-and-node-limits-for-the-graphql-api) for GraphQL.

## But why though?

The built-in reporting and automation with the new GitHub project boards has a lot of potential.  In collaborating more with project managers again, I came up against use cases that need _just a little more_ development to be workable.  These tasks fall squarly into the "pretty bespoke implementation of a common theme" part of any project management tool - simple automations like taking an action based on a date (eg, not closed by end of sprint), or notifying if a task is stagnant to check for blockers, or try to understand which tasks take longer for further analysis.

While I can't stand hearing "this is easy to do in `project management tool that shall not be named`" because there's a possibility it'll be back in my life, I can understand the sentiment of just wanting to get things done.

Having a solid understanding of GraphQL opens doors - to automate more, build more robust reports, take your data out of GitHub for any reason whatsoever, and much more.  It's worth the effort to learn such a powerful API system.
