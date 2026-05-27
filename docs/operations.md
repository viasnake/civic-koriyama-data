# Operations

## Cron

Cloudflare Cron Triggers run in UTC.

```toml
[triggers]
crons = [
  "0 * * * *"
]
```

- `0 * * * *`: hourly scheduled job

The scheduled handler always ingests RSS. It also ingests open data once per
day when the scheduled UTC hour is `18` (JST 03:00). Keep the trigger hourly so
RSS stays fresh; change the open data hour in `src/index.ts` if the daily
ingestion time must move.

There is intentionally no public admin endpoint for forcing jobs. If
`raw_records` or `places` is empty, the hourly scheduled handler self-heals by
running open data ingestion without waiting for the daily hour.

## Fetch Policy

- Use ETag / Last-Modified when source fetchers expose them.
- Do not delete existing data on fetch failure.
- Store fetch outcomes in `fetch_logs`.
- Detect source file URL changes before normalizing records.
- Warn when record counts drop unexpectedly.

## D1

The production D1 database is `koriyama-open-data-hub-prod` and is bound as
`DB` in `wrangler.toml`.

`wrangler` is provided by mise for this repository. Prefer package scripts or
direct `wrangler ...` commands from the mise-managed environment; avoid
`npx wrangler ...` unless running outside the repository toolchain.

Local migration:

```sh
npm run db:migrate:local
```

Production migration:

```sh
npm run db:migrate
```

## CI/CD

GitHub Actions runs verification on pull requests and pushes. Pushes to `master`
also apply production D1 migrations and deploy the Worker.

Required repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Use a Cloudflare API token scoped to the deployment account only.

Minimum token permissions:

- `Account` -> `Workers Scripts` -> `Edit`
- `Account` -> `D1` -> `Edit`

Do not grant `User` membership, zone, DNS, Pages, KV, R2, or queue permissions
for this workflow. If `CLOUDFLARE_ACCOUNT_ID` is missing, Wrangler may try to
discover accounts through Cloudflare membership APIs; the workflow checks for
the secret before running Wrangler to keep the token scope minimal.
