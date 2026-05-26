# Koriyama Open Data Hub

郡山市オープンデータ非公式 Webapi v2 の実装リポジトリです。

このプロジェクトは郡山市公式サービスではありません。郡山市が公開する
オープンデータと RSS を、安定した dataset id、JSON API、GeoJSON、
検索 UI で利用しやすくするための非公式データ流通レイヤーです。

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

Implemented routes:

- `GET /`
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
npm test
npm run typecheck
npm run dev
```

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

The workflow installs the mise-managed toolchain, runs `npm ci`, typechecks,
runs tests, applies remote D1 migrations through the `DB` binding, and then
deploys the Worker.

## Source And Attribution

See:

- [docs/attribution.md](docs/attribution.md)
- [docs/datasets.md](docs/datasets.md)
- [docs/operations.md](docs/operations.md)

## Disclaimer

このサービスは非公式です。郡山市公式サービスではありません。

データの正確性、完全性、最新性、可用性は保証しません。正確な内容は必ず
郡山市公式ウェブサイトで確認してください。
