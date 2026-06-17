# 郡山市オープンデータ非公式 WebAPI

郡山市オープンデータ非公式 WebAPI の実装リポジトリです。

## Status

Initial API MVP scaffold.

## Stack

- Cloudflare Workers
- Cloudflare D1
- Hono
- TypeScript
- Zod
- React / Vite UI scaffold

## API

The public API is versioned under `/api/v2`.
The canonical public endpoint is `https://koriyama-open-data-hub.alflag.org/`.

Implemented routes:

- `GET /`
- `GET /docs/`
- `GET /api/v2/health`
- `GET /api/v2/datasets`
- `GET /api/v2/datasets/:dataset_id`
- `GET /api/v2/datasets/:dataset_id/records`
- `GET /api/v2/places`
- `GET /api/v2/places/:place_id`
- `GET /api/v2/places.geojson`
- `GET /api/v2/search?q=`
- `GET /api/v2/changes`
- `GET /api/v2/rss/entries`

## Development

```sh
mise install
npm install
python -m pip install -r docs/requirements.txt
npm test
npm run typecheck
npm run docs:build
npm run dev
```

When documentation sources change, rebuild `public/docs` with
`npm run docs:build` before committing so the Worker static assets stay in
sync with the Sphinx source.

`wrangler` is managed by mise. Prefer `wrangler ...` through the mise-managed
toolchain instead of `npx wrangler ...`.

## D1

```sh
npm run db:migrate:local
```

Production D1 database:

- database name: `koriyama-open-data-hub-prod`
- binding: `DB`

Apply production migrations with:

```sh
npm run db:migrate
```

## Deployment

Deployments are handled by GitHub Actions on pushes to `master`.

Required GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Minimum Cloudflare API token permissions:

- `Account` -> `Workers Scripts` -> `Edit`
- `Account` -> `D1` -> `Edit`

Scope the token to the deployment account only. Do not grant `User`
membership, zone, DNS, Pages, KV, R2, or queue permissions for this workflow.

The workflow installs the mise-managed toolchain, runs `npm ci`, typechecks,
runs tests, applies remote D1 migrations through the `DB` binding, and then
deploys the Worker. Wrangler serves the checked-in Sphinx HTML under
`public/docs` as static assets at `/docs/`.

## Source And Attribution

See:

- [docs/attribution.md](docs/attribution.md)
- [docs/datasets.md](docs/datasets.md)
- [docs/operations.md](docs/operations.md)

## Disclaimer

このリポジトリは非公式です。
郡山市公式リポジトリではありません。

データの正確性、完全性、最新性、可用性は保証しません。正確な内容は必ず
郡山市公式ウェブサイトで確認してください。
