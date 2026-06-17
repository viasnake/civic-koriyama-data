# API リファレンス

すべての公開エンドポイントは読み取り専用です。API リソースは `/api/v2` 配下で提供します。

## 共通レスポンス

JSON エンドポイントは、基本的に `meta` と `data` を持つ形式で返します。

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-06-09T00:00:00.000Z",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City."
  },
  "data": []
}
```

配列を返すエンドポイントでは `meta.result_count` が付きます。ページング対象の一覧では `meta.limit` と `meta.offset` も返ります。

存在しないリソースは HTTP ステータスで区別され、`data.error` にエラー名が入ります。

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-06-09T00:00:00.000Z",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City."
  },
  "data": {
    "error": "dataset_not_found"
  }
}
```

## ページング

一覧系エンドポイントでは `limit` と `offset` を指定できます。

| パラメータ | 説明 | 既定値 |
| --- | --- | --- |
| `limit` | 取得件数。最大 `1000` 件です。 | エンドポイントにより `100` または `1000` |
| `offset` | 取得開始位置です。 | `0` |

## エンドポイント一覧

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/` | サービス情報と主要エンドポイント |
| `GET` | `/api/v2/health` | データ件数、RSS 取得状況、最近の更新状況 |
| `GET` | `/api/v2/datasets` | 公開データセット一覧 |
| `GET` | `/api/v2/datasets/{dataset_id}` | データセット詳細と出典情報 |
| `GET` | `/api/v2/datasets/{dataset_id}/records` | データセットの元データ行 |
| `GET` | `/api/v2/places` | 正規化済み地点データ一覧 |
| `GET` | `/api/v2/places/{place_id}` | 地点データ 1 件 |
| `GET` | `/api/v2/places.geojson` | 地点データの GeoJSON FeatureCollection |
| `GET` | `/api/v2/search?q=` | 地点データ検索 |
| `GET` | `/api/v2/changes` | 取得・正規化時に検出した変更履歴 |
| `GET` | `/api/v2/rss/entries` | 郡山市公式サイト RSS の記事情報 |

## データセット

### `GET /api/v2/datasets`

公開データセットの一覧を返します。

```bash
curl https://koriyama-open-data-hub.alflag.org/api/v2/datasets
```

### `GET /api/v2/datasets/{dataset_id}`

データセット 1 件の詳細と出典情報を返します。

```bash
curl https://koriyama-open-data-hub.alflag.org/api/v2/datasets/aed
```

### `GET /api/v2/datasets/{dataset_id}/records`

データセットの元データ行を返します。`raw` に郡山市の公開ファイルから読み取った行データが入ります。

```bash
curl "https://koriyama-open-data-hub.alflag.org/api/v2/datasets/aed/records?limit=10"
```

## 地点データ

### `GET /api/v2/places`

正規化済みの地点データを返します。

| パラメータ | 説明 |
| --- | --- |
| `dataset_id` | データセット ID で絞り込みます。 |
| `category` | カテゴリで絞り込みます。 |
| `q` | 名称または住所を部分一致で検索します。 |
| `bbox` | `minLng,minLat,maxLng,maxLat` の矩形範囲で絞り込みます。 |
| `limit` | 取得件数です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://koriyama-open-data-hub.alflag.org/api/v2/places?category=facility&limit=20"
```

地点データの主なフィールドは次のとおりです。

| フィールド | 説明 |
| --- | --- |
| `id` | 地点 ID |
| `dataset_id` | 元データセット ID |
| `name` | 施設名などの名称 |
| `category` | API 側のカテゴリ |
| `subcategory` | データセット ID をもとにした細分類 |
| `address` | 住所 |
| `lat`, `lng` | 緯度・経度 |
| `phone`, `fax`, `email` | 連絡先 |
| `official_url` | 公式 URL |
| `source_url` | 元ファイル URL |
| `attributes` | 元データや正規化時の警告 |

### `GET /api/v2/places/{place_id}`

地点データを 1 件返します。

```bash
curl https://koriyama-open-data-hub.alflag.org/api/v2/places/place_aed_example
```

### `GET /api/v2/places.geojson`

地点データを `application/geo+json; charset=utf-8` の GeoJSON FeatureCollection で返します。`/api/v2/places` と同じ絞り込みパラメータを利用できます。

```bash
curl "https://koriyama-open-data-hub.alflag.org/api/v2/places.geojson?dataset_id=public_wifi"
```

GeoJSON の `geometry.coordinates` は `[経度, 緯度]` です。緯度・経度がない地点は GeoJSON には含まれません。

## 検索

### `GET /api/v2/search?q=`

地点データを名称または住所で検索します。`q` は必須です。

| パラメータ | 説明 |
| --- | --- |
| `q` | 検索キーワード |
| `limit` | 取得件数。最大 `1000` 件です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://koriyama-open-data-hub.alflag.org/api/v2/search?q=図書館&limit=10"
```

レスポンスの `data.places` に地点配列、`data.count` に返却件数が入ります。

## 変更履歴

### `GET /api/v2/changes`

取得・正規化時に検出した変更履歴を返します。

| パラメータ | 説明 |
| --- | --- |
| `since` | 指定日時以降の変更だけを返します。ISO 8601 形式の文字列を指定できます。 |
| `limit` | 取得件数です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://koriyama-open-data-hub.alflag.org/api/v2/changes?since=2026-06-01T00:00:00.000Z"
```

`change_type` には `raw_created`、`raw_updated`、`place_created`、`place_updated` などが入ります。

## RSS

### `GET /api/v2/rss/entries`

郡山市公式サイト RSS の記事情報を返します。

| パラメータ | 説明 |
| --- | --- |
| `category` | API 側で分類した RSS カテゴリで絞り込みます。 |
| `limit` | 取得件数です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://koriyama-open-data-hub.alflag.org/api/v2/rss/entries?category=disaster&limit=10"
```

RSS カテゴリは `disaster`、`childcare`、`life`、`business`、`event`、`city_admin` です。

## ヘルスチェック

### `GET /api/v2/health`

データ件数、RSS の取得状況、直近の取得ログを返します。データベースが空の場合や直近取得に失敗がある場合は、`data.status` が `degraded` になります。

```bash
curl https://koriyama-open-data-hub.alflag.org/api/v2/health
```
