# DevTrace

**Understand how you build.**

DevTrace connects to your GitHub account and turns your actual development activity into analytics you can read: what you've been working on, how consistently, in which repositories and languages, and when.

Every number in the app is computed from GitHub data synchronized into PostgreSQL. Where there isn't enough data to say something reliable, the app says so instead of filling the gap.

---

## Features

| Area | What it shows |
| --- | --- |
| **Overview** | Identity, contributions / commits / PRs / issues / active repositories for a range with comparison to the previous period, contribution heatmap (3m / 6m / 1y), activity over time (7d / 30d / 90d / 1y, toggle series), recent events, top repositories, language summary |
| **Activity** | Streaks, active days, busiest weekday/hour, contribution calendar, activity over time, weekday × hour punch card, paginated event timeline. Filterable by repository |
| **Repositories** | Searchable, sortable, paginated table (owned / forks / archived / active / external contributions / language) with your own commit, PR and issue counts |
| **Repository analytics** | Overview facts, your activity over time, development timeline built from real commit messages and PR/issue titles, contributors (from GitHub), languages |
| **Commits** | Totals, this month, average per week, most active day and hour, commits by day / week / month, by weekday and by hour, searchable commit table with original messages |
| **Pull requests** | Opened / merged / closed / open now, merge rate, median and mean time to merge, PRs per period, filterable table |
| **Issues** | Opened / closed / open, median and mean resolution time, filterable table |
| **Languages** | Share of code (GitHub linguist bytes) across selected repositories, with an explicit explanation of what that measures, plus commit share by repository language. Filter by scope, archived status or a hand-picked set of repositories |
| **Insights** | 7/30-day factual recap (counts, merged PRs), and nine calculated observations (trend, consistency, concentration, weekly rhythm, time of day, merge speed, merge rate, issue resolution, new work). Each shows its evidence; each has a minimum sample size and is withheld below it |
| **Profile** | Optional public profile at `/u/<login>`. Private repositories are excluded unless you opt in |
| **Settings** | Display name, theme, default range, default repository filter, timezone, privacy toggles, sync now, disconnect GitHub (revokes the OAuth grant), delete account |
| **Demo** | "Explore demo" signs into a shared, read-only account with clearly labelled fictional data |
| **AI weekly summary** | Optional (off unless `ANTHROPIC_API_KEY` is set). Generated only from aggregated metrics and verbatim PR/issue titles, labelled "AI-generated", and always shown next to the metrics it was given |

---

## Architecture

```
Browser ──► Next.js App Router (server components + route handlers)
              │
              ├── src/app/(app)/*        authenticated pages (server-rendered)
              ├── src/app/api/*          REST controllers (thin)
              │
              └── src/server/            server-only code
                   ├── auth/             NextAuth config, encrypted adapter, sessions, demo sessions
                   ├── github/           GitHub client (REST + GraphQL), queries, normalizers
                   ├── sync/             sync jobs, orchestration, persistence
                   ├── analytics/        SQL aggregations + pure calculation modules
                   ├── services/         preferences, account lifecycle, contributors
                   ├── ai/               optional weekly summary
                   ├── validation.js     zod schemas for every input
                   ├── http.js           auth / CSRF / rate limit / error wrapper for routes
                   └── cache.js          optional Redis cache, per-user namespaced
                        │
                        ▼
                   PostgreSQL (Prisma)          Redis (optional)
```

### Why one Next.js app (no separate Express server)

All server work runs in Next.js server components and route handlers on Node.js. A separate Express service would duplicate auth, validation and data access without adding anything for this workload. The sync engine is plain Node modules (`src/server/sync`), so moving it to a dedicated worker process later means calling `runSyncJob(jobId)` from that process; jobs are already claimed atomically in the database.

Socket.io is deliberately not used: the only live-updating screen is sync progress, and short polling of a single small endpoint is simpler and more robust behind proxies.

### Data model (`prisma/schema.prisma`)

- `User`, `Account`, `Session` — NextAuth adapter tables. `Account.access_token` is AES-256-GCM encrypted.
- `ConnectedAccount` — the GitHub profile. Has a `provider` column.
- `Repository`, `Commit`, `PullRequest`, `Issue`, `LanguageStat`, `RepositoryContributor`, `ContributionDay` — synchronized data. Every row is owned by a `userId`; natural unique keys (`[userId, provider, externalId]`, `[repositoryId, sha]`, `[repositoryId, number]`) make sync idempotent.
- `SyncJob` — status, per-stage progress, error code, retry time, heartbeat.
- `UserPreference`, `WeeklySummary`.

The `Provider` enum and `externalId` columns are where GitLab or Bitbucket would plug in: add a client and normalizers under `src/server/<provider>/` that produce the same normalized shapes, and the storage and analytics layers don't change.

### Synchronization

`src/server/sync/run.js` runs these stages, each persisted to the job record (the sync screen renders those records directly; there is no simulated progress):

1. **Profile** — GraphQL `viewer`
2. **Repositories** — GraphQL, 50 per page with languages inline (one request per 50 repos instead of one per repo). Affiliated repos that GitHub stops returning are marked `removedAt` (history kept, hidden from lists)
3. **Contribution calendar** — GraphQL `contributionsCollection`, last 365 days
4. **Commits** — REST `/repos/{repo}/commits?author=<login>` per repository, Link-header pagination
5. **Pull requests** — GraphQL `viewer.pullRequests`, ordered by update time
6. **Issues** — GraphQL `viewer.issues`
7. **Languages** — written from the data fetched in stage 2

Incremental behaviour:

- Commits use a per-repository cursor (`commitsSyncedAt`). Repositories with no push since their cursor are skipped without an API call; others are fetched with `since` (7-day overlap; duplicates are ignored by the unique key).
- PRs and issues stop paginating at the first item not updated since the previous successful sync (1-hour overlap).
- Up to 5,000 commits per repository per sync, so one huge repository can't exhaust the hourly API budget.

Failure handling:

- Short secondary rate limits are waited out in the client; long primary limits fail the job with `RATE_LIMITED` and `retryAfter`. The next status poll after that time starts a retry automatically. Data synced before the limit is kept.
- 404 / 403 / 451 on a single repository skip that repository; 401 fails the job with a reconnect message.
- 5xx and network errors are retried with backoff.
- Only one job per user can be active; a job without a heartbeat for 10 minutes is marked stalled.
- Data older than 12 hours triggers a background incremental sync when the app is opened.

### Analytics

Aggregation happens in PostgreSQL (`date_trunc`, `FILTER`, `GROUP BY`), never by loading rows into the browser. Days, weeks and hours are computed in the user's timezone (auto-detected, editable in Settings). Pure calculation logic (streaks, medians, peak windows, language shares, insight rules) lives in separate modules with unit tests.

The heatmap uses GitHub's own contribution calendar when available (it includes reviews and other contribution types) and falls back to commits + PRs + issues otherwise. The label on the chart says which.

### Security

- GitHub OAuth via NextAuth with database sessions (HTTP-only, `SameSite=Lax`, `Secure` under HTTPS).
- OAuth tokens are encrypted at rest (AES-256-GCM, `TOKEN_ENCRYPTION_KEY`) and only decrypted server-side when calling GitHub. The session sent to the browser contains id, name, image and a demo flag only.
- Every query is scoped by the user id from the server session. Resource lookups use `findFirst({ id, userId })` and return 404 for other users' ids. Isolation is covered by tests.
- Mutating API routes require same-origin requests (Origin / Fetch Metadata check) and respect per-user rate limits (Redis-backed, in-memory fallback).
- All query and body parameters are validated with zod; sort columns are whitelisted.
- The API is same-origin only (no CORS headers are emitted).
- Security headers: CSP, `X-Frame-Options: DENY`, `nosniff`, referrer policy, HSTS in production.
- Disconnect and delete call GitHub's grant-revocation endpoint, then delete the stored token and data.
- The shared demo account is read-only, and the adapter refuses to link a GitHub account to it.

**OAuth scope:** GitHub OAuth apps have no read-only scope for private repositories, so DevTrace requests `repo` by default. DevTrace only issues GET and GraphQL queries. Set `GITHUB_OAUTH_SCOPE="read:user user:email"` to analyze public data only.

---

## Running locally

Requirements: Node.js 20+, PostgreSQL 14+, optionally Redis.

```bash
cp .env.example .env            # fill in the values below
docker compose up -d postgres redis   # or use local services
npm install
npx prisma migrate deploy
npm run dev
```

1. Create a GitHub OAuth app at <https://github.com/settings/developers>. Homepage `http://localhost:3000`, callback `http://localhost:3000/api/auth/callback/github`.
2. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32` for both secrets).
3. Open <http://localhost:3000> and choose **Connect GitHub**, or **Explore demo**.

To pre-seed the demo account: `npm run db:seed-demo` (otherwise it's created on first use and refreshed daily).

### Docker

```bash
docker compose --profile app up --build
```

The image runs `prisma migrate deploy` on start, then the standalone Next.js server. `/api/health` is used as the container health check.

## Tests

```bash
createdb devtrace_test
TEST_DATABASE_URL=postgresql://localhost:5432/devtrace_test npx prisma migrate deploy
TEST_DATABASE_URL=postgresql://localhost:5432/devtrace_test npm test
```

The test database name must contain `test`; the suite refuses to run otherwise. Coverage includes:

- GitHub client: Link and cursor pagination, rate limits (primary and secondary), retries, error mapping, partial GraphQL data
- Normalization of repositories, commits, PRs, issues, languages and the contribution calendar, including missing data
- The full sync pipeline against a fake GitHub API: all stages, pagination, duplicate prevention across repeated syncs, incremental cursors, removed and empty repositories, rate limits, revoked tokens, empty accounts, concurrent jobs, per-user separation
- SQL aggregations: overview, timezone bucketing, rhythm, rankings, commit/PR/issue summaries, tables, filters, language shares
- Insight rules, including that nothing is claimed for new or low-activity accounts
- Authorization: 401s, session-derived user ids, CSRF checks, demo read-only, rate limits, validation errors, error redaction, token encryption, session payload, demo-account linking guard
- User data isolation and private profiles

CI (`.github/workflows/ci.yml`) runs migrations, lint, tests and a production build against a Postgres service, then builds the Docker image.

## API

All endpoints derive the user from the session. Errors use `{ error: { code, message } }`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/dashboard` | `range`, `heatmap` |
| GET | `/api/activity` | `range`, `heatmap`, `repo` |
| GET | `/api/activity/events` | `before`, `repo`, `limit` |
| GET | `/api/repositories` | `q`, `type`, `language`, `sort`, `page`, `pageSize` |
| GET | `/api/repositories/:id` | 404 unless owned by the user |
| GET | `/api/commits` | `range`, `repo`, `q`, `page` |
| GET | `/api/pull-requests` | `range`, `state`, `repo`, `q`, `page` |
| GET | `/api/issues` | `range`, `state`, `repo`, `q`, `page` |
| GET | `/api/languages` | `scope`, `archived`, `repos` |
| GET | `/api/insights` | |
| GET / POST | `/api/sync` | status / start (`{ auto: true }` only if stale) |
| GET / PATCH | `/api/settings` | |
| POST | `/api/account/disconnect` | |
| DELETE | `/api/account` | body `{ confirm: "<login>" }` |
| GET / POST | `/api/summary` | optional AI summary |
| POST | `/api/demo` | starts a demo session |
| GET | `/api/health` | |

## Project layout

```
prisma/                schema and migrations
scripts/seed-demo.js   seeds the demo account
src/app/               routes (landing, auth error, sync, app pages, profile, API)
src/components/        ui primitives, charts, layout, app components
src/lib/               shared pure helpers (dates, formatting, URLs)
src/server/            server-only modules (see Architecture)
tests/                 unit and database tests
```
