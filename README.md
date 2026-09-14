# DevTrace

DevTrace is a developer analytics platform that connects to a GitHub account and turns real development activity into a clear view of how a developer builds.

## Product goals

- Surface meaningful contribution patterns from real GitHub data
- Show repository, commit, PR, issue, and language insights
- Keep analytics grounded in actual repository activity
- Support a future expansion beyond GitHub without rewriting the product model

## Stack

- Next.js
- React
- Tailwind CSS
- Prisma
- PostgreSQL
- GitHub OAuth
- Octokit
- Redis
- Vitest
- Docker

## Local setup

1. Copy `.env.example` to `.env` and fill in your values.
2. Start PostgreSQL and Redis with Docker.
3. Run `npm install`.
4. Run `npx prisma generate`.
5. Run `npx prisma migrate dev`.
6. Run `npm run dev`.

## Environment variables

```bash
DATABASE_URL="postgresql://devtrace:devtrace_local@localhost:5432/devtrace"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-me"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
REDIS_URL="redis://localhost:6379"
```

## Architecture overview

- `src/app` contains the Next.js app routes and UI pages.
- `src/lib` contains auth, database, analytics, and GitHub sync logic.
- `src/components` contains shared UI shell and layout patterns.
- `prisma/schema.prisma` defines the normalized data model.
- `src/lib/github` handles API normalization and GitHub synchronization.

## Notes

This version includes demo data for local product exploration and a core architecture that can be connected to live GitHub OAuth and real sync data once credentials are configured.
