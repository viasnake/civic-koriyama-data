# API リファレンス

Civic Koriyama Data API は、郡山市が公開しているオープンデータと公式サイト RSS を読み取り専用で返す非公式 API です。認証は不要です。

```{admonition} 非公式 API です
:class: attention

この API は郡山市公式サービスではありません。データの正確性、完全性、最新性、可用性は保証しません。正確な内容は郡山市公式ウェブサイトで確認してください。
```

## エントリポイント

| URL | 挙動 |
| --- | --- |
| `https://civic-koriyama-data.alflag.org/` | ドキュメントへリダイレクトします。 |
| `https://civic-koriyama-data.alflag.org/docs/` | このドキュメントを表示します。 |
| `https://civic-koriyama-data.alflag.org/api/v2` | API のサービス情報を JSON で返します。 |

API のベースパスは `/api/v2` です。このページの例では、ベース URL を `https://civic-koriyama-data.alflag.org/api/v2` として記載します。

## 共通仕様

### HTTP メソッド

公開 API は `GET` のみを使います。CORS は全 origin からの `GET` と `OPTIONS` を許可しています。

### JSON レスポンス

JSON エンドポイントは、基本的に `meta` と `data` を持つオブジェクトを返します。

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-01-01T00:00:00.000Z",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City."
  },
  "data": []
}
```

`meta.generated_at` は API がレスポンスを生成した日時です。配列を返すエンドポイントでは `meta.result_count` が付きます。ページング対象の一覧では `meta.limit` と `meta.offset` も返ります。

### GeoJSON レスポンス

`GET /places.geojson` は `application/geo+json; charset=utf-8` の GeoJSON FeatureCollection を返します。このエンドポイントは `meta` / `data` の envelope を使いません。

### ページング

一覧系エンドポイントでは `limit` と `offset` を指定できます。

| パラメータ | 説明 | 既定値 |
| --- | --- | --- |
| `limit` | 取得件数です。`1` から `1000` の範囲に丸められます。 | エンドポイントにより `100` または `1000` |
| `offset` | 取得開始位置です。負の値は `0` として扱われます。 | `0` |

### レート制限

API は、同一クライアント IP アドレスからのリクエストを 60 秒あたり 30 件までに制限します。上限を超えた場合は HTTP `429` と `data.error = "rate_limited"` を返し、`Retry-After` ヘッダーで再試行までの目安秒数を示します。更新の目安や状態確認は {doc}`operations` も参照してください。

### エラー

存在しないリソースは HTTP ステータスと `data.error` で区別します。

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-01-01T00:00:00.000Z",
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

| HTTP ステータス | `data.error` | 主な原因 |
| --- | --- | --- |
| `400` | バリデーションエラー | 必須 query がない、query の形式が合わない |
| `404` | `dataset_not_found` | 指定した `dataset_id` が見つからない |
| `404` | `place_not_found` | 指定した `place_id` が見つからない |
| `404` | `not_found` | パスが存在しない |
| `429` | `rate_limited` | 同一クライアント IP アドレスからのリクエスト数が多すぎる |

## エンドポイント一覧

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/api/v2` | API のサービス情報 |
| `GET` | `/api/v2/health` | データ件数、取得ログ、状態 |
| `GET` | `/api/v2/datasets` | 公開データセット一覧 |
| `GET` | `/api/v2/datasets/{dataset_id}` | データセット詳細 |
| `GET` | `/api/v2/datasets/{dataset_id}/records` | データセットの元データ行 |
| `GET` | `/api/v2/places` | 正規化済み地点データ一覧 |
| `GET` | `/api/v2/places/{place_id}` | 地点データ 1 件 |
| `GET` | `/api/v2/places.geojson` | 地点データの GeoJSON |
| `GET` | `/api/v2/search?q=` | 地点データ検索 |
| `GET` | `/api/v2/changes` | 取得・正規化時に検出した変更履歴 |
| `GET` | `/api/v2/rss/feeds` | 検証済み RSS feed 一覧 |
| `GET` | `/api/v2/rss/audit` | RSS feed 確認レポート |
| `GET` | `/api/v2/rss/entries` | 郡山市公式サイト RSS の記事情報 |

## サービス情報

### `GET /api/v2`

API 名、ベースパス、ドキュメント URL、主要エンドポイントを返します。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2
```

主な `data` フィールド:

| フィールド | 説明 |
| --- | --- |
| `name` | API 名 |
| `description` | API の説明 |
| `api_endpoint` | API ベース URL |
| `api_base_path` | API ベースパス |
| `documentation_url` | ドキュメント URL |
| `endpoints` | 主要エンドポイントのパス |

## データセット

データセット系 API の詳細な request / response、フィールド仕様、警告値は {doc}`datasets` を確認してください。

### `GET /api/v2/datasets`

公開 API で利用できるデータセット一覧を返します。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/datasets
```

主な `data[]` フィールド:

| フィールド | 説明 |
| --- | --- |
| `id` | データセット ID |
| `name` | データセット名 |
| `category` | API 側のカテゴリ |
| `source_page_url` | 出典ページ URL |
| `source_files` | 出典ファイルの配列 |
| `format` | `csv_or_xlsx`、`zip`、`mixed` のいずれか |
| `enabled` | API で有効かどうか |
| `public_api` | 公開 API の対象かどうか |
| `warnings` | 注意事項 |

### `GET /api/v2/datasets/{dataset_id}`

データセット 1 件の詳細を返します。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/datasets/aed
```

指定した `dataset_id` が見つからない場合は `404 dataset_not_found` を返します。

### `GET /api/v2/datasets/{dataset_id}/records`

データセットの元データ行を返します。`data[].raw` には、郡山市の公開ファイルから読み取った行データが入ります。

| Query | 説明 |
| --- | --- |
| `limit` | 取得件数。既定値は `1000` です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/datasets/aed/records?limit=10"
```

主な `data[]` フィールド:

| フィールド | 説明 |
| --- | --- |
| `id` | API 内部の元データ行 ID |
| `dataset_id` | データセット ID |
| `source_record_key` | 元データ側の識別キー。ない場合は `null` |
| `source_row_hash` | 元データ行のハッシュ |
| `raw` | 元データ行 |
| `fetched_at` | 取得日時 |

## 地点データ

### `GET /api/v2/places`

正規化済みの地点データを返します。施設、AED、公衆無線 LAN、公衆トイレ、子育て施設、医療機関、学校などを同じ形で取得できます。

| Query | 説明 |
| --- | --- |
| `dataset_id` | データセット ID で絞り込みます。 |
| `category` | カテゴリで絞り込みます。 |
| `q` | 名称または住所を部分一致で検索します。 |
| `bbox` | `minLng,minLat,maxLng,maxLat` の矩形範囲で絞り込みます。 |
| `limit` | 取得件数。既定値は `1000` です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/places?category=facility&limit=20"
```

地点データの主なフィールド:

| フィールド | 説明 |
| --- | --- |
| `id` | 地点 ID |
| `dataset_id` | 元データセット ID |
| `name` | 施設名などの名称 |
| `category` | API 側のカテゴリ |
| `subcategory` | 細分類。ない場合は `null` |
| `address` | 住所 |
| `lat`, `lng` | 緯度・経度。未取得または不正な場合は `null` |
| `phone`, `fax`, `email` | 連絡先 |
| `official_url` | 公式 URL |
| `source_url` | 元ファイル URL |
| `attributes` | 元データや正規化時の警告 |
| `first_seen_at`, `last_seen_at` | API 側で確認した日時 |
| `deleted_at` | 削除済みの場合の日時。通常は `null` |

### `GET /api/v2/places/{place_id}`

地点データを 1 件返します。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/places/place_aed_example
```

指定した `place_id` が見つからない場合は `404 place_not_found` を返します。

### `GET /api/v2/places.geojson`

地点データを GeoJSON FeatureCollection で返します。`/api/v2/places` と同じ絞り込み query を使えます。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/places.geojson?dataset_id=public_wifi"
```

`geometry.coordinates` は `[経度, 緯度]` です。緯度・経度がない地点は GeoJSON には含まれません。

## 検索

### `GET /api/v2/search`

地点データを名称または住所で検索します。`q` は必須です。

| Query | 説明 |
| --- | --- |
| `q` | 検索キーワード |
| `limit` | 取得件数。既定値は `100` です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/search?q=図書館&limit=10"
```

レスポンスの `data.places` に地点データの配列、`data.count` に返却件数が入ります。

## 変更履歴

### `GET /api/v2/changes`

取得・正規化時に検出した変更履歴を返します。

| Query | 説明 |
| --- | --- |
| `since` | 指定日時以降の変更だけを返します。ISO 8601 形式の文字列を指定できます。 |
| `limit` | 取得件数。既定値は `100` です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/changes?since=2026-06-01T00:00:00.000Z"
```

主な `data[]` フィールド:

| フィールド | 説明 |
| --- | --- |
| `id` | 変更 ID |
| `dataset_id` | データセット ID |
| `record_id` | 対象レコード ID |
| `change_type` | `raw_created`、`raw_updated`、`place_created`、`place_updated` など |
| `changed_at` | 変更検出日時 |
| `before` | 変更前の値。ない場合は `null` |
| `after` | 変更後の値。ない場合は `null` |

## RSS

### `GET /api/v2/rss/feeds`

郡山市公式サイトから取得対象にしている RSS feed の一覧を返します。既定では `enabled = true` かつ `verification_status = ok` の feed だけを返します。

| Query | 説明 |
| --- | --- |
| `include_disabled` | `true` の場合、無効 feed も返します。 |
| `include_unverified` | `true` の場合、未検証または検証失敗 feed も返します。 |
| `kind` | `global`、`life`、`site` のいずれかで絞り込みます。 |

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/feeds?kind=life"
```

レスポンスの `data.feeds[]` には、`id`、`kind`、`title`、`url`、`enabled`、`verification_status`、`verified_at` が入ります。

### `GET /api/v2/rss/audit`

RSS feed の最新確認レポートを返します。取得対象 feed の検証状況や、公式サイト上で見つかった feed との差分を確認できます。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/rss/audit
```

主な `data` フィールド:

| フィールド | 説明 |
| --- | --- |
| `generated_at` | レポート生成日時 |
| `seed_count` | 登録済み RSS feed 件数 |
| `discovered_count` | 公式サイト上で検出できた RSS feed 件数 |
| `verified_ok_count` | 確認に成功した登録済み feed 件数 |
| `missing_from_seed` | 公式サイト上では見つかったが、登録対象になっていない feed |
| `seed_not_discovered` | 登録済みだが、公式サイト上の巡回では見つからなかった feed |
| `dead_seed_feeds` | HTTP 200 で取得できなかった登録済み feed |
| `parse_error_seed_feeds` | RSS/XML として読めなかった登録済み feed |

### `GET /api/v2/rss/entries`

郡山市公式サイト RSS の記事情報を返します。

| Query | 説明 |
| --- | --- |
| `category` | API 側で分類した RSS カテゴリで絞り込みます。 |
| `feed_id` | RSS feed ID で絞り込みます。 |
| `kind` | `global`、`life`、`site` のいずれかで絞り込みます。 |
| `since` | 指定日時以降の記事だけを返します。ISO 8601 形式の文字列を指定できます。 |
| `limit` | 取得件数。既定値は `100` です。 |
| `offset` | 取得開始位置です。 |

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/entries?kind=life&limit=10"
```

主な `data[]` フィールド:

| フィールド | 説明 |
| --- | --- |
| `id` | RSS 記事 ID |
| `feed_id` | 代表フィード ID |
| `feed_ids` | 記事が出現したフィード ID の配列 |
| `feed_kinds` | 記事が出現したフィード種別の配列 |
| `title` | 記事タイトル |
| `link` | 記事 URL |
| `canonical_url` | 重複排除に使う正規化 URL |
| `published_at` | 公開日時。RSS にない場合は `null` |
| `fetched_at` | 取得日時 |
| `category` | API 側のカテゴリ |
| `tags` | 分類タグ |
| `source_hash` | 元記事情報のハッシュ |

RSS カテゴリは `disaster`、`childcare`、`life`、`business`、`event`、`city_admin` です。

## ヘルスチェック

### `GET /api/v2/health`

データ件数、RSS の取得状況、直近の取得ログを返します。データベースが空の場合や直近取得に失敗がある場合は、`data.status` が `degraded` になります。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/health
```

主な `data` フィールド:

| フィールド | 説明 |
| --- | --- |
| `status` | `ok` または `degraded` |
| `datasets.total` | データセット数 |
| `datasets.enabled` | 有効なデータセット数 |
| `datasets.last_success_at` | オープンデータ取得の直近成功日時 |
| `datasets.raw_records_count` | 元データ行数 |
| `datasets.places_count` | 地点データ数 |
| `datasets.record_changes_count` | 変更履歴数 |
| `datasets.recent_fetches` | 直近のオープンデータ取得ログ |
| `datasets.failed` | 直近の失敗ログ |
| `rss.last_success_at` | RSS 取得の直近成功日時 |
| `rss.entries_count` | RSS 記事数 |
| `rss.recent_fetches` | 直近の RSS 取得ログ |
| `rss.failed` | 直近の RSS 取得失敗ログ |

更新の目安や `status = degraded` の見方は {doc}`operations` を参照してください。

## 利用時の注意

出典表示が必要です。利用するデータの出典とライセンスは、データセット詳細や {doc}`attribution` を確認してください。
