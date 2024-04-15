---
title: "GraphQL queries and mutations"
excerpt: "tricky bits that I always need to find quickly"
layout: post
---

## Resources

- [Introduction to GraphQL](https://graphql.org/learn/), which I need every time I work with it
- GraphQL API docs for [GitHub](https://docs.github.com/en/graphql) and [GitLab](https://docs.gitlab.com/ee/api/graphql/)
- GraphQL Explorer for [GitHub](https://docs.github.com/en/graphql/overview/explorer) and [GitLab](https://gitlab.com/-/graphql-explorer)

## GitHub projects, issues, and pull requests

### Get UUID of a project board

Most users interact with their board via URL - `GITHUB/orgs/ORGNAME/projects/NUMBER/` or `GITHUB/users/USERNAME/projects/NUMBER/`.  Under the hood, each of them have a unique identifier to use with the API.  This query takes the org/user name and board number, then returns the UUID only.

```graphql
query getProjectV2Id($org: String!, $project: Int!) {
  organization(login: $org) {
    projectV2(number: $project) {
      id
    }
  }
}
```

### Count all items on a board

Returns the total number of **non-archived** items on a board - includes issues, pull requests, and notes.

```graphql
query getTotalItemCount($org: String!, $project: Int!) {
  organization(login: $org) {
    projectV2(number: $project) {
      items(first: 1) {
        totalCount
      }
    }
  }
}
```

### List open pull requests in a repo

Pull requests have a lot more info associated with them than what's returned by this query.  ([documentation](https://docs.github.com/en/enterprise-cloud@latest/graphql/reference/objects#pullrequest))

```graphql
query listOpenPRs($repo: String!, $org: String!) {
  repository(owner: $org, name: $repo) {
    pullRequests(states: OPEN, first: 10) {
      nodes {
        id
        title
        url
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

### List open issues in a repo

Issues have a lot more info associated with them than what's returned by this query.  ([documentation](https://docs.github.com/en/enterprise-cloud@latest/graphql/reference/objects#issue))

```graphql
query listOpenIssues($repo: String!, $org: String!) {
  repository(owner: $org, name: $repo) {
    issues(states: OPEN, first: 10) {
      nodes {
        id
        title
        url
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

### Add an issue or PR to a board

Use the `id` field from the issue or PR query above as the `contentId` variable.  The `projectId` variable is the UUID for the project board.

```graphql
mutation ($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    clientMutationId
  }
}
```

### Variables for issues

The `contentId` field is random, but starting with `I_` denotes an issue and `PR_` is a pull request.

```json
{
  "contentId": "I_kwDOENnY2c565dVz",
  "org": "organization-name-or-user-name",
  "project": 1,
  "projectId": "PVT_kwDOAlIw4c4AAVtM",
  "repo": "repo-name"
}
```

## GitHub Enterprise admin stuff

### Get enterprise ID

The enterprise ID is required for many queries and mutations.  It is not the same as the enterprise slug, which is the URL-friendly name of the enterprise (e.g., `my-enterprise` in `GITHUB/enterprises/my-enterprise`).

```graphql
query getEnterpriseId($slug: String!) {
  enterprise(slug: $slug) {
    id
  }
}
```

### Count organizations in an enterprise

Weirdly enough, it's not easy for an enterprise admin to get a count of organizations in their enterprise.  Many built-in reports and dashboards only show things the logged-in user can see, not the total.  This gets a count of them all.

```graphql
query countEnterpriseOrganizations($slug: String!) {
  enterprise(slug: $slug) {
    organizations{
      totalCount
    }
  }
}
```

### List organizations in an enterprise

Same as above, but with a list of them all individually.  The count here should match the total count from the query above.  The `id` field is the UUID for it, stored in that `orgId` variable for other queries.

```graphql
query listEnterpriseOrganizations($slug: String!) {
  enterprise(slug: $slug) {
    organizations(first: 100, after: AFTER) {
      edges {
        node {
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

### Add enterprise owner to organization

This adds an [enterprise owner](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-accounts-and-repositories/managing-users-in-your-enterprise/roles-in-an-enterprise#enterprise-owners) to an [organization role](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization#organization-owners) for a given enterprise, organization, and role.

```graphql
mutation ($enterpriseId: ID!, $orgId: ID!, $orgRole: String!) {
  updateEnterpriseOwnerOrganizationRole(
    input: {
      enterpriseId: $enterpriseId
      organizationId: $orgId
      organizationRole: $orgRole
    }
  ) {
    clientMutationId
  }
}
```

### Variables for enterprise admin

The `enterpriseId` and `orgId` fields seem random.  `O_` seems to be the convention for organizations.  The `orgRole` field can be the name of any role a user may have within an organization.

```json
{
  "slug": "my-enterprise",
  "enterpriseId": "MDEwOaoeuGVycHfpc2UxMTg=",
  "org": "organization-name",
  "orgId": "O_kgDOB5i9ew",
  "orgRole": "owner"
}
```
