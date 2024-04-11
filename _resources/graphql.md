---
title: "GraphQL queries and mutations"
excerpt: "tricky bits that I always need to find quickly"
layout: post
---

## Resources

- [Introduction to GraphQL](https://graphql.org/learn/), which I need every time I work with it
- GraphQL API docs for [GitHub](https://docs.github.com/en/graphql) and [GitLab](https://docs.gitlab.com/ee/api/graphql/)
- GitHub GraphQL Explorer for [GitHub](https://docs.github.com/en/graphql/overview/explorer) and [GitLab](https://gitlab.com/-/graphql-explorer)

## GitHub projects, issues, and pull requests

### Get UUID of a project board

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

```graphql
mutation ($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    clientMutationId
  }
}
```

### Variables for issues

```json
{
  "org": "organization-name-or-user-name",
  "project": 1,
  "repo": "repo-name"
}
```

## GitHub Enterprise admin stuff

### Get enterprise ID

The enterprise ID is required for many queries and mutations.  It is not the same as the enterprise slug, which is the URL-friendly name of the enterprise (e.g., `my-enterprise` in `https://github.com/enterprises/my-enterprise`).

```graphql
query getEnterpriseId($slug: String!) {
  enterprise(slug: $slug) {
    id
  }
}
```

### Count organizations in an enterprise

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
mutation {
  updateEnterpriseOwnerOrganizationRole(
    input: {
      enterpriseId: "ENTERPRISE_ID"
      organizationId: "ORG_ID"
      organizationRole: ORG_ROLE
    }
  ) {
    clientMutationId
  }
}
```

### Variables for enterprise admin

```json
{
  "slug": "my-enterprise",
  "enterpriseId": "ENTERPRISE_ID",
  "org": "organization-name-or-user-name",
  "orgId": "ORG_ID",
  "orgRole": "owner"
}
```
