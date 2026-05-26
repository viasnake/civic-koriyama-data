# Operations

## Cron

Cloudflare Cron Triggers run in UTC.

```toml
[triggers]
crons = [
  "0 18 * * *",
  "0 * * * *"
]
```

- `0 18 * * *`: JST 03:00 open data ingestion
- `0 * * * *`: hourly RSS ingestion

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

GitHub Actions runs verification on pull requests and pushes. Pushes to `main`
also apply production D1 migrations and deploy the Worker.

Required repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Use a Cloudflare API token scoped to the deployment account. The token must be
able to deploy Workers and apply D1 migrations.
