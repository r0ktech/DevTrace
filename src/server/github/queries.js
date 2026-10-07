// GraphQL documents used by the sync service. Kept separate so the shape of
// the data we request is easy to audit.

const REPO_REF_FIELDS = `
  databaseId
  name
  nameWithOwner
  owner { login }
  description
  url
  homepageUrl
  primaryLanguage { name }
  stargazerCount
  forkCount
  diskUsage
  isPrivate
  isFork
  isArchived
  createdAt
  pushedAt
  defaultBranchRef { name }
`;

export const VIEWER_PROFILE = `
  query ViewerProfile {
    viewer {
      databaseId
      login
      name
      email
      avatarUrl
      bio
      company
      location
      websiteUrl
      url
      createdAt
      followers { totalCount }
      following { totalCount }
      repositories(ownerAffiliations: OWNER, privacy: PUBLIC) { totalCount }
    }
  }
`;

export const VIEWER_REPOSITORIES = `
  query ViewerRepositories($after: String) {
    viewer {
      repositories(
        first: 50
        after: $after
        affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          ${REPO_REF_FIELDS}
          issues(states: OPEN) { totalCount }
          languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
            edges { size node { name color } }
          }
        }
      }
    }
  }
`;

export const VIEWER_CONTRIBUTION_CALENDAR = `
  query ViewerContributions($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

export const VIEWER_PULL_REQUESTS = `
  query ViewerPullRequests($after: String) {
    viewer {
      pullRequests(first: 50, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          databaseId
          number
          title
          state
          isDraft
          url
          createdAt
          updatedAt
          mergedAt
          closedAt
          additions
          deletions
          changedFiles
          headRefName
          baseRefName
          author { login }
          repository { ${REPO_REF_FIELDS} }
        }
      }
    }
  }
`;

export const VIEWER_ISSUES = `
  query ViewerIssues($after: String) {
    viewer {
      issues(first: 50, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo { hasNextPage endCursor }
        nodes {
          databaseId
          number
          title
          state
          url
          createdAt
          updatedAt
          closedAt
          author { login }
          comments { totalCount }
          labels(first: 10) { nodes { name } }
          repository { ${REPO_REF_FIELDS} }
        }
      }
    }
  }
`;
