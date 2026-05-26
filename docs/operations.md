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

Local migration:

```sh
npm run db:migrate:local
```

Production migration:

```sh
npm run db:migrate
```
