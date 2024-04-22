---
title: "Intro to GraphQL using custom fields in GitHub Projects"
date: 2024-04-22
excerpt: "Getting started with the new GitHub Issues and Projects API, exclusively in GraphQL, doesn't have to be so difficult."
tags:
  - graphql
  - project-management
image: /assets/graphics/2024-04-22-graphql-intro/card-catalog-1.jpg
---

Every now and then, there's a problem that absolutely, positively _must_ be solved with GraphQL - the query language API interface.  It takes me a day or two just to remember how to use it every time it's needed.  Here's some hard-earned wisdom from my most recent adventures in GraphQL. 🦉

> This is part 1 of 2 in a short series on GraphQL, where we'll cover the basics of GraphQL and write some queries to interact with GitHub's new project boards - ending with interacting with the custom fields on a project.
{: .prompt-info}

## GraphQL terms

The first hardship is in understanding that it's fundamentally different from REST.

**It only returns what's explicitly asked for.**

I like to think of REST as giving me the whole restaurant menu, then relying on me to determine what I want and filter out things I can't eat (like `no seafood`).  GraphQL would be me getting a specific, but shorter, menu that will only return options within what I ask for (`pasta dishes with seasonal veggies and no seafood`).

| terms | in plain english |
|---|---|
| [authorization](#authorization) | prove you're allowed to ask for this data |
| [query](#queries) | give me exactly this data |
| [variables](#variables) | make queries reusable with substituting in stored values |
| [type schema](#type-schema) | we have strong opinions here about what's a number, string, UUID, and everything else |
| [introspection](#introspection) | tell me about yourself|
| [pagination](#pagination) | how to traverse lots of results |
| [directives](#directives) | give me exactly this data, but only if this other condition is met |
| [mutations](#mutations) | change this data |
| [aliases](#aliases) | rename things to assemble data meaningfully |

There are a ton more terms and concepts to know about GraphQL.  The [official introduction](https://graphql.org/learn/) is worth going through several times over too.

> The following examples are all using GitHub's API, but the concepts are the same across any other GraphQL API.  My latest adventure is motivated by [avoiding JIRA if at all possible](https://ifuckinghatejira.com), so I'm working on automation and reporting using custom fields in the new GitHub Issues and Projects experience, which is exclusively on GraphQL.  What's needed seems like a common request, but it isn't built-in and that's never stopped me before.
{: .prompt-info}

## Authorization

Many APIs have authorization-gated resources.  I'm using HTTP headers to pass in my token for `Authorization` plus the default media type in the `Accept` header to keep it simple.

```json
{
    "Authorization": "token github-pat-goes-here",
    "Accept": "application/vnd.github.v3+json",
}
```

## Queries

**Queries fetch data.**  It's similar to a `GET` request in REST, except you need to be explicit about what it is you want returned.  Here's a very simple query for the number of issues in a given repository:

```graphql
# graphql supports comments!!!
query {
  # all issues belong inside of a repository
  repository(owner: "some-natalie", name: "kubernoodles") {
    issues {
      totalCount
    }
  }
}
```

Notice the data returned (below) matches structure as your query (above), meaning you can parse the data returned reliably using the exact same structure.  This allows us to use the built-in JSON parsing methods for whatever language we're using.  Here's the raw JSON:

```json
{
  "data": {
    "repository": {
      "issues": {
        "totalCount": 36
      }
    }
  }
}
```

The `jq` filter is `jq '.[].repository.issues.totalCount'` in this query to return the number of issues in the given repository.

## Variables

Notice how the query above is hardcoded with the repository owner and name.  Allowing reuse means swapping in values as needed.  Luckily, GraphQL has a way to do this with **variables stored in JSON.**

Here's the same query with the same results, but reusable with variables:

```graphql
query ($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    issues {
      totalCount
    }
  }
}
```

And the variables to go with it:

```json
{
  "owner": "some-natalie",
  "repo": "kubernoodles"
}
```

![card-catalog-2](/assets/graphics/2024-04-22-graphql-intro/card-catalog-2.jpg){: .shadow .rounded-10 .w-75 }
_know we know what we're looking for, so let's get only the things we want_

## Type schema

GraphQL, both client-side code (like what we're working with) and the server-side code that processes it, can be written in any language.  To prevent being dependent on a specific language, **GraphQL has a built-in type system.**  We're only going to use the most basic functionality today, but there's a lot more to learn about [types and schemas](https://graphql.org/learn/schema/) as they apply to all sorts of deeper topics.

Note how the variables in the query above are both `String!`, meaning that even if you put a number in there, it's going to be treated as a string.

Now let's get the UUID (`string`) and number of items (`int`) on a project board given the organization and number.  We get the inputs from the URL.  As an example, `https://github.com/orgs/octodemo/projects/62` would have `octodemo` as the organization and `62` as the project number.

```graphql
query getProjectV2Id($org: String!, $project: Int!) {
  organization(login: $org) {
    projectV2(number: $project) {
      id
      items {
        totalCount
      }
    }
  }
}
```

This returns the following JSON with the UUID of the project board.

- `id` is a string returned by `jq '.[].organization.projectV2.id'`
- `totalCount` is an integer returned by `jq '.[].organization.projectV2.items.totalCount'`

```json
{
  "data": {
    "organization": {
      "projectV2": {
        "id": "PVT_kwDOAlIw4c4AAVtM",
        "items": {
          "totalCount": 24
        }
      }
    }
  }
}
```

## Introspection

As you can see so far, this can get complicated quickly.  **GraphQL can tell you about itself, called introspection.**

The query below asks for all the types in the schema available to you.  For a big API like GitHub, this is a giant list that I'm not going to include here.

```graphql
{
  __schema {
    types {
      name
    }
  }
}
```

Since I'm working with issues and custom reporting, I want to know more about the `Issue` type.  This query will return the name and description of fields available to me.

```graphql
{
  __type(name: "Issue") {
    description
    fields {
      name
      description
    }
  }
}
```

Issues in GitHub have a lot of fields and a lot more descriptions within those fields, so this is a small snippet of what's returned:

```json
{
  "data": {
    "__type": {
      "description": "An Issue is a place to discuss ideas, enhancements, tasks, and bugs for a project.",
      "fields": [
        {
          "name": "assignees",
          "description": "A list of Users assigned to this object."
        },
        {
          "name": "author",
          "description": "The actor who authored the comment."
        },
        {
          "name": "and-so-on",
          "description": "..."
        }
      ]
    }
  }
}
```

While mature products tend to have fantastic documentation, this will _always_ work and be up-to-date because it's querying the API itself.

## Pagination

GraphQL isn't terribly opinionated on pagination methods, so you might need to consult with the API documentation for the tool you're interacting with.  **Most products will paginate results** to provide the requested or a reasonable default amount of data at a time.  This number may also be capped at lower than what you're wanting.  Just like REST, you can use `first` and `after` to paginate results.

This is sometimes referred to as nodes and edges.  **A node is an object** - the thing we've been looking for, such as the UUID of an Issue or the name of an assignee.  **An edge is the connection between nodes.**  This is useful when you're looking for a specific node in a list of nodes.  Here's an example of a query that returns the first two issues in a repository, but only the URL of the first issue.

```graphql
query listIssues($repo: String!, $owner: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    issues(after: $cursor, first: 2) {
      edges {
        node {
          url
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

Which returns the first three issues in the repository after the `endCursor` provided.  By default, the cursor is null.  If there are even more results, `hasNextPage` will be `true` and `endCursor` will be the next cursor to use in the next query.  This should allow you build simple logic around pagination in most programming languages.

```json
{
  "data": {
    "repository": {
      "issues": {
        "edges": [
          {
            "node": {
              "url": "https://github.com/some-natalie/kubernoodles/issues/4"
            }
          },
          {
            "node": {
              "url": "https://github.com/some-natalie/kubernoodles/issues/5"
            }
          }
        ],
        "pageInfo": {
          "hasNextPage": true,
          "endCursor": "Y3Vyc29yOnYyOpK5MjAyMi0wMy0wOVQxMTozNTozMy0wNzowMM5FZdA-"
        }
      }
    }
  }
}
```

## Directives

This is all well and good, but I only want issues if they're currently open.  Let's add a **directive to return results based on a condition**, in this case, only open issues (line 3).

```graphql
query listOpenIssues($repo: String!, $owner: String!) {
  repository(owner: $owner, name: $repo) {
    issues(states: OPEN, first: 2) {
      nodes {
        url
      }
    }
  }
}
```

Returns only the first two _open_ issues in a given repository, omitting anything closed.

```json
{
  "data": {
    "repository": {
      "issues": {
        "nodes": [
          {
            "url": "https://github.com/some-natalie/kubernoodles/issues/43"
          },
          {
            "url": "https://github.com/some-natalie/kubernoodles/issues/101"
          }
        ]
      }
    }
  }
}
```

## Mutations

Now we need to change some data!  Instead of worrying about `PUT`, `PATCH`, `DELETE` or [other HTTP verbs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods), this is done with a **mutation** in GraphQL.  Here's a simple example adding content (like an issue or pull request) to a project board.  Because there can be many things that share a name on any of these fields, this uses the UUID of the board and the items you're adding to it.  Luckily, we have these from previous queries.

```graphql
mutation ($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    clientMutationId
  }
}
```

## Aliases

Lastly, sometimes you need to start assembling a bunch of data from different queries that may share a name.  **Aliases allow you to rename results** of a query to whatever you'd like.  These can make results more meaningfully named and **query for the same field using different arguments**.

Here's a larger query that grabs data from a given board.  We're only fetching the first 20 issues with pagination data to recurse as deep as needed.  For each of these, it will return:

- URL of each issue
- Title of each issue
- Assignees of each issue (first 10)
- Labels of each issue (first 10)
- Last updated date of each issue
- 🌟 Sprint information such as the name and start date and duration, an iterative value (custom field)
- 🌟 Estimate, a number (custom field)
- 🌟 Status, a single-select value (custom field)

Since each item can have multiple custom fields and multiples of the same type of custom field, this is a handy place to use aliases for keeping things straight.  The aliases are `sprint`, `estimate`, and `status` on lines 24, 31, and 36.

```graphql
query allIssuesFieldsAssignees($org: String!, $projectID: Int!) {
  viewer {
    organization(login: $org) {
      projectV2(number: $projectID) {
        items(first: 20) {
          nodes {
            content {
              ... on Issue {
                url
                title
                assignees(first: 10) {
                  nodes {
                    login
                  }
                }
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
                updatedAt
              }
            }
            sprint: fieldValueByName(name: "Sprint") {
              ... on ProjectV2ItemFieldIterationValue {
                duration
                startDate
                title
              }
            }
            estimate: fieldValueByName(name: "Estimate") {
              ... on ProjectV2ItemFieldNumberValue {
                number
              }
            }
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                description
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
}
```

> This query is somewhat fragile.  If any of the custom fields get renamed, it'll break until it's updated with the new name.  I'll talk about how to make this more robust in the next post.
{: .prompt-warning}

## Now for some wizardry

Doing some quick `jq` to `markdown` magic in the programming language of your choice, you can now have a table looking like this, complete with links to issues and assignees:

| Title | Assignees | Labels | Updated At | Sprint | Estimate | Status |
|---|---|---|---|---|---|---|
| [Fix the thing](https://github.com) | [@some-natalie](https://github.com/some-natalie) | "bug" | 2024-04-22T12:34:56Z | [Sprint 1](https://github.com) | 3 | In Progress |
| Add the fizzbuzz feature | @teammate | "enhancement" | 2024-04-22T12:34:56Z | Sprint 1 | 5 | In Progress |
| Update the thing | @another-teammate | "bug", "enhancement" | 2024-04-22T12:34:56Z | Sprint 1 | 8 | Blocked |

From here, you could also build out reports or automation to

- show items that haven't changed status in a certain amount of time and ping the associated folks
- see which labels are at risk of delay
- automatically ask for a cause if/when an estimate changes
- build out a burn-down chart for the sprint
- see trends in delivery velocity and other long-term metrics

You can also use this as a data export to migrate into another tool for project management without a bunch of manual rework.  There are tons of possibilities!

## Parting thoughts

Once you shift your mind from REST to GraphQL, it's pretty powerful.  It allows you to ask for exactly what you need and nothing more.  It also lets you get data from multiple sources in a single query.  While it's always been a struggle for me to remember how to use it, I've found that the more I use it, the more I like it.  The queries and mutations I've written and reused over the years are assembled in a page of [little book of spells](../../grimoire) called [GraphQL queries and mutations](../../grimoire/graphql).

I hope this helps guide others, both with GraphQL and with writing custom reports to ~~avoid JIRA~~ support your favorite project managers! 💝

> Next up, I'll be writing about **GraphQL patterns to know**.  These are tips, tricks, and design patterns that I've found useful in my GraphQL adventures. 🦉
{: .prompt-info}

![card-catalog-3](/assets/graphics/2024-04-22-graphql-intro/card-catalog-3.jpg){: .w-75 .shadow .rounded-10 }
_a cart full of only the API data needed, ready to be processed_

---

## Resources

- [Introduction to GraphQL](https://graphql.org/learn/) - the official introduction that I need every time I have to work with GraphQL
- GitHub has a handy [introduction to GraphQL](https://docs.github.com/en/graphql/guides/introduction-to-graphql) as well
- AWS has a good [explanation of differences between GraphQL and REST](https://aws.amazon.com/compare/the-difference-between-graphql-and-rest/) with examples on which to choose for different patterns
