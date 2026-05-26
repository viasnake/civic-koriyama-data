# 郡山市オープンデータ非公式 Webapi v2 設計案

## 0. 方針

**v1 は廃止し、v2 は別リポジトリ・別設計で作る**のが適切です。

v1 の `webapi-koriyama` は、`files.json` に郡山市の添付ファイル URL を列挙し、`script.py` で CSV / XLSX を取得して `src/data/{id}.json` に変換する静的生成型の実装でした。`script.py` は `files.json` を読み、CSV は `cp932`、XLSX は `pandas.read_excel()` で読み込んで JSON に書き出す構造です。 `files.json` も `1603` や `1705` のような旧 ID と `uploaded/attachment/...` URL に依存しています。

v2 は、単なる CSV → JSON 変換ではなく、**郡山市オープンデータを安定した API・GeoJSON・検索 UI として再提供する非公式データ流通レイヤー**にします。

---

# 1. プロダクト定義

## 1.1 名称

リポジトリ名は以下を推奨します。

```text
koriyama-open-data-hub
```

理由は、API だけでなく、データ取得、正規化、GeoJSON、地図 UI、RSS 連携まで含められるためです。

## 1.2 サービス構成

```text
Koriyama Open Data Hub
├── 郡山市オープンデータ非公式 Webapi v2
├── 郡山市くらしマップ
├── 郡山市お知らせビューア
└── API Docs / Developer Portal
```

## 1.3 目的

```text
郡山市公式サイトの代替ではなく、
郡山市が公開するオープンデータと RSS を利用しやすい形に変換・整理・検索可能にする。
```

## 1.4 非目的

```text
- 郡山市公式サービスを名乗らない
- 郡山市公式サイトの本文・画像を転載しない
- v1 endpoint を復活させない
- 郡山市の業務システムや防災情報の正本にならない
- 災害時の避難可否・避難所開設状況を保証しない
```

---

# 2. データソース

## 2.1 Primary: 郡山市オープンデータ

現在の郡山市オープンデータは、公共施設一覧、文化財一覧、指定緊急避難場所一覧、地域・年齢別人口、子育て施設、公衆無線 LAN、AED、介護サービス、医療機関、観光施設、イベント、公衆トイレ、食品営業許可、学校、小中学校通学区域情報などを掲載しています。郡山市はこれらをデジタル庁の「自治体標準オープンデータセット」をもとに公開し、定期的に更新・追加すると説明しています。([郡山市公式サイト][1])

公共施設等情報のページでは、公共施設データの項目として、大分類、小分類、施設名、電話、ファックス、メールアドレス、住所、備考、経度、緯度が示され、AED、Wi-Fi、オストメイト対応トイレなども掲載されています。([郡山市公式サイト][2])

## 2.2 Secondary: 防災オープンデータ

防災情報として、指定避難場所、防災行政無線、耐震性貯水槽、防火水槽、消火栓、消防詰所、備蓄倉庫、ヘリコプター臨時離着陸場、浸水関連データなどが公開されています。([郡山市公式サイト][3])

ただし、防災系は責任が重いため、**MVP では API 対象に含めても UI の主導線にはしない**方針が安全です。

## 2.3 Tertiary: RSS

郡山市公式サイトの RSS は、RSS 再分類・新着通知の補助データとして扱います。RSS は本文転載ではなく、タイトル、公開日、元ページリンク、独自カテゴリのみ保存します。

---

# 3. ライセンス・出典表示

郡山市のオープンデータページでは、掲載データが公共データ利用規約のもと提供され、規約は予告なく変更される可能性があると明記されています。([郡山市公式サイト][1]) 公共施設等情報ページでは、掲載データがクリエイティブ・コモンズ表示 4.0 国際ライセンスの下で提供されていると説明されています。([郡山市公式サイト][2])

API・UI・Docs のすべてに以下を表示します。

```text
このサービスは非公式です。
郡山市公式サービスではありません。

本サービスは、郡山市が公開するオープンデータおよび RSS を利用して、
検索・再分類・API 化を行うものです。

データの正確性、完全性、最新性、可用性は保証しません。
正確な内容は必ず郡山市公式ウェブサイトで確認してください。

出典:
郡山市オープンデータ
郡山市公式ウェブサイト RSS
```

API レスポンスにも metadata として含めます。

```json
{
  "meta": {
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City."
  }
}
```

---

# 4. アーキテクチャ

## 4.1 推奨構成

Cloudflare Workers + D1 を基本構成にします。

Cloudflare Workers の Cron Triggers は、cron 式により Worker の `scheduled()` handler を定期実行できる仕組みで、外部 API 呼び出しやデータ収集のような定期ジョブに適しています。([Cloudflare Docs][4]) D1 は Cloudflare Workers と統合された SQL ベースのサーバーレスデータベースとして提供されています。([Cloudflare Workers][5])

```text
Cloudflare Cron Trigger
  ↓
Ingestion Worker
  ↓
Source Fetcher
  ↓
Parser
  ├── CSV
  ├── XLSX
  └── RSS
  ↓
Normalizer
  ↓
Change Detector
  ↓
Cloudflare D1
  ↓
API Worker
  ↓
Web UI / Docs
```

## 4.2 コンポーネント

```text
API Worker:
- REST API
- GeoJSON API
- Search API
- Health API

Ingestion Job:
- オープンデータ取得
- RSS 取得
- 正規化
- 差分検出
- fetch log 保存

D1:
- dataset catalog
- raw records
- normalized places
- change history
- RSS entries

KV:
- ETag
- Last-Modified
- lightweight cache
- fetch cursor

Pages / Static UI:
- くらしマップ
- API Docs
- dataset catalog viewer
```

## 4.3 R2 は MVP では使わない

MVP では、元ファイルを R2 に保存しません。

理由:

```text
- 郡山市の対象データは比較的小さい
- D1 の raw_json で検証可能性は確保できる
- R2 を入れると実装・運用が増える
- まず API と UI の価値検証を優先する
```

将来的に raw source snapshot を時系列保存したくなったら、R2 を追加します。

---

# 5. リポジトリ構成

## 5.1 推奨構成

```text
koriyama-open-data-hub/
├── README.md
├── package.json
├── wrangler.toml
├── migrations/
│   ├── 0001_initial.sql
│   ├── 0002_places.sql
│   └── 0003_rss.sql
├── datasets/
│   └── koriyama.yaml
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── datasets.ts
│   │   ├── places.ts
│   │   ├── search.ts
│   │   ├── rss.ts
│   │   └── health.ts
│   ├── jobs/
│   │   ├── ingest.ts
│   │   └── rss.ts
│   ├── sources/
│   │   ├── koriyama.ts
│   │   └── rss.ts
│   ├── parsers/
│   │   ├── csv.ts
│   │   ├── xlsx.ts
│   │   └── rss.ts
│   ├── normalizers/
│   │   ├── place.ts
│   │   ├── dataset.ts
│   │   └── rss.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── queries.ts
│   ├── geojson/
│   │   └── feature.ts
│   └── utils/
│       ├── hash.ts
│       ├── datetime.ts
│       └── text.ts
├── web/
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── pages/
│       ├── components/
│       └── api/
└── docs/
    ├── api.md
    ├── datasets.md
    ├── attribution.md
    └── operations.md
```

## 5.2 技術スタック

```text
Runtime:
- Cloudflare Workers

Language:
- TypeScript

API framework:
- Hono

Database:
- Cloudflare D1

Validation:
- Zod

Frontend:
- React
- Vite
- Leaflet or MapLibre GL JS

Map:
- OpenStreetMap based tiles

Docs:
- Markdown
- OpenAPI YAML
```

---

# 6. dataset catalog 設計

`datasets/koriyama.yaml` を正とします。

```yaml
version: 1

source:
  id: koriyama_city
  name: 郡山市
  type: municipality
  official_site: https://www.city.koriyama.lg.jp/

datasets:
  - id: public_facilities
    name: 公共施設一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: facility
    enabled: true
    normalize_as: place
    public_api: true

  - id: aed
    name: AED設置個所一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: safety
    enabled: true
    normalize_as: place
    public_api: true

  - id: public_wifi
    name: 公衆無線LANアクセスポイント一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: facility
    enabled: true
    normalize_as: place
    public_api: true

  - id: public_toilets
    name: 公衆トイレ一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: facility
    enabled: true
    normalize_as: place
    public_api: true

  - id: childcare_facilities
    name: 子育て施設一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: childcare
    enabled: true
    normalize_as: place
    public_api: true

  - id: medical_institutions
    name: 医療機関一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: medical
    enabled: true
    normalize_as: place
    public_api: true

  - id: schools
    name: 学校一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: education
    enabled: true
    normalize_as: place
    public_api: true

  - id: shelters
    name: 指定緊急避難場所一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: disaster
    enabled: true
    normalize_as: place
    public_api: true
    warnings:
      - disaster_data
```

重要なのは、**郡山市側の添付ファイル ID を public API に露出しない**ことです。

---

# 7. データモデル

## 7.1 D1 schema

```sql
create table datasets (
  id text primary key,
  name text not null,
  category text not null,
  source_name text not null,
  source_page_url text,
  source_file_url text,
  source_file_type text,
  license text,
  attribution text,
  enabled integer not null default 1,
  public_api integer not null default 1,
  normalize_as text,
  fetched_at text,
  source_updated_at text,
  created_at text not null,
  updated_at text not null
);

create table raw_records (
  id text primary key,
  dataset_id text not null,
  source_record_key text,
  source_row_hash text not null,
  raw_json text not null,
  fetched_at text not null,
  foreign key(dataset_id) references datasets(id)
);

create table places (
  id text primary key,
  dataset_id text not null,
  name text not null,
  category text not null,
  subcategory text,
  address text,
  lat real,
  lng real,
  phone text,
  fax text,
  email text,
  official_url text,
  source_url text,
  source_record_hash text not null,
  attributes_json text not null,
  first_seen_at text not null,
  last_seen_at text not null,
  deleted_at text,
  foreign key(dataset_id) references datasets(id)
);

create table record_changes (
  id integer primary key autoincrement,
  dataset_id text not null,
  record_id text not null,
  change_type text not null,
  changed_at text not null,
  before_json text,
  after_json text
);

create table rss_feeds (
  id text primary key,
  name text not null,
  url text not null,
  enabled integer not null default 1,
  fetched_at text,
  created_at text not null,
  updated_at text not null
);

create table rss_entries (
  id text primary key,
  feed_id text not null,
  title text not null,
  link text not null,
  published_at text,
  fetched_at text not null,
  category text,
  tags_json text not null default '[]',
  source_hash text not null,
  foreign key(feed_id) references rss_feeds(id)
);

create table fetch_logs (
  id integer primary key autoincrement,
  source_type text not null,
  source_id text not null,
  status text not null,
  fetched_at text not null,
  records_count integer,
  error_message text
);
```

## 7.2 place ID

`place_id` は以下で生成します。

```text
place_{dataset_id}_{hash(normalized_name + normalized_address + lat + lng)}
```

例:

```text
place_aed_bf9e3c0d2a
place_public_wifi_3179aa8c21
```

郡山市側の行番号やファイル ID に依存しません。

---

# 8. 正規化ルール

## 8.1 normalized place

```json
{
  "id": "place_aed_bf9e3c0d2a",
  "dataset_id": "aed",
  "name": "郡山市役所",
  "category": "safety",
  "subcategory": "aed",
  "address": "福島県郡山市...",
  "lat": 37.400000,
  "lng": 140.360000,
  "phone": "024-...",
  "source_url": "https://www.city.koriyama.lg.jp/...",
  "attributes": {
    "has_aed": true,
    "raw_category": "...",
    "remarks": "..."
  }
}
```

## 8.2 緯度経度

```text
- 緯度・経度が両方存在する場合のみ GeoJSON に出す
- 片方だけ欠けている場合は places API には出すが geojson には出さない
- 文字列座標は数値に変換する
- 明らかに範囲外の座標は invalid_coordinate として扱う
```

郡山市周辺の大まかな範囲から外れる値は警告にします。

```text
lat: 36.5〜38.0
lng: 139.0〜141.5
```

## 8.3 raw data

raw data は削らず `raw_records.raw_json` に保存します。

```text
目的:
- 公式データとの差分確認
- 正規化バグの追跡
- API 利用者への説明
- 将来の再正規化
```

---

# 9. API 設計

## 9.1 API prefix

```http
/api/v2
```

`/api/latest` は作りません。
API version は URL に明示します。

## 9.2 Endpoints

```http
GET /api/v2/health

GET /api/v2/datasets
GET /api/v2/datasets/{dataset_id}
GET /api/v2/datasets/{dataset_id}/records

GET /api/v2/places
GET /api/v2/places/{place_id}
GET /api/v2/places.geojson

GET /api/v2/search?q=

GET /api/v2/changes
GET /api/v2/changes?since=2026-05-01

GET /api/v2/rss/entries
GET /api/v2/rss/entries?category=childcare
```

## 9.3 places query

```http
GET /api/v2/places?dataset_id=aed
GET /api/v2/places?category=safety
GET /api/v2/places?lat=37.400&lng=140.360&radius=1000
GET /api/v2/places?q=公民館
GET /api/v2/places?bbox=140.30,37.35,140.45,37.45
```

## 9.4 Response format

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-05-08T12:00:00+09:00",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City."
  },
  "data": []
}
```

## 9.5 GeoJSON

```http
GET /api/v2/places.geojson?dataset_id=aed
```

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "place_aed_bf9e3c0d2a",
      "geometry": {
        "type": "Point",
        "coordinates": [140.36, 37.40]
      },
      "properties": {
        "name": "郡山市役所",
        "dataset_id": "aed",
        "category": "safety",
        "source_name": "郡山市オープンデータ",
        "unofficial": true
      }
    }
  ]
}
```

---

# 10. RSS 再分類

RSS は別テーブルに保存し、オープンデータとは疎結合にします。

## 10.1 RSS item

```json
{
  "id": "rss_...",
  "title": "○○のお知らせ",
  "link": "https://www.city.koriyama.lg.jp/...",
  "published_at": "2026-05-08T00:00:00+09:00",
  "category": "childcare",
  "tags": ["子育て", "募集"],
  "source_name": "郡山市公式ウェブサイト",
  "unofficial": true
}
```

## 10.2 分類カテゴリ

```yaml
rss_categories:
  - id: disaster
    name: 防災・安全
    keywords:
      - 防災
      - 災害
      - 避難
      - 警報
      - 注意報
      - 熱中症

  - id: childcare
    name: 子育て・教育
    keywords:
      - 子育て
      - 保育
      - 幼稚園
      - 学校
      - 児童
      - 妊娠

  - id: life
    name: くらし・手続き
    keywords:
      - 住民票
      - 戸籍
      - 税
      - ごみ
      - 国民健康保険
      - マイナンバー

  - id: business
    name: 事業者向け
    keywords:
      - 入札
      - 補助金
      - 契約
      - 事業者
      - 募集

  - id: event
    name: イベント
    keywords:
      - イベント
      - 講座
      - 参加者募集
      - 展示
      - スポーツ

  - id: city_admin
    name: 市政情報
    keywords:
      - 市議会
      - 審議会
      - 計画
      - パブリックコメント
```

---

# 11. Web UI 設計

## 11.1 くらしマップ

MVP の主画面です。

```text
画面:
- 地図
- カテゴリフィルタ
- キーワード検索
- 現在地周辺検索
- データ最終更新日時
- 出典表示
```

対象カテゴリ:

```text
- AED
- Wi-Fi
- 公衆トイレ
- オストメイト対応トイレ
- 子育て施設
- 医療機関
- 学校
- 公共施設
```

## 11.2 施設詳細

```text
施設名
カテゴリ
住所
電話番号
地図
属性
出典
最終取得日時
API link
公式情報確認リンク
```

## 11.3 Developer Portal

```text
- API overview
- endpoint list
- dataset list
- sample requests
- sample responses
- GeoJSON usage
- attribution
- limitations
- changelog
```

---

# 12. 運用設計

## 12.1 cron

```text
Open data ingestion:
- 1日1回
- 早朝 JST
- 失敗時は fetch_logs に記録

RSS ingestion:
- 1時間ごと
- 本文は保存しない
```

Cloudflare Cron Triggers は UTC で実行されるため、日本時間で設計するときは UTC に変換して設定します。([Cloudflare Docs][4])

例:

```toml
[triggers]
crons = [
  "0 18 * * *",   # JST 03:00: open data ingestion
  "0 * * * *"     # hourly RSS ingestion
]
```

## 12.2 fetch policy

```text
- ETag / Last-Modified があれば利用
- 取得失敗しても既存データは消さない
- 連続失敗回数を記録
- source_file_url の変化を検出
- データ件数が極端に減った場合は warning
```

## 12.3 monitoring

```text
GET /api/v2/health

response:
{
  "status": "ok",
  "datasets": {
    "total": 18,
    "enabled": 18,
    "last_success_at": "2026-05-08T03:00:00+09:00",
    "failed": []
  },
  "rss": {
    "last_success_at": "2026-05-08T12:00:00+09:00"
  }
}
```

---

# 13. セキュリティ・制限

## 13.1 API abuse 対策

```text
- Cloudflare rate limiting
- CORS は read-only API として許可
- write endpoint は作らない
- admin endpoint は公開しない
- ingestion は scheduled handler のみ
```

## 13.2 CORS

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

read-only 公開 API なので `*` でよいです。

## 13.3 データ改ざんリスク

```text
- raw hash を保存
- normalized hash を保存
- source URL を保存
- fetched_at を保存
- 公式ページへのリンクを必ず返す
```

---

# 14. v1 repo の扱い

`viasnake/webapi-koriyama` は archive にします。

## 14.1 作業内容

```text
- README.md を追加
- v1 discontinued を明記
- v2 repo へのリンクを追加
- GitHub repository archive を有効化
- public にするかは任意
```

## 14.2 README 文案

```md
# webapi-koriyama

郡山市オープンデータ非公式 Webapi v1 の実装リポジトリです。

この v1 実装は提供を終了しました。

## Status

Archived / discontinued.

## Notes

v1 は、郡山市公式サイト上の CSV / XLSX 添付ファイルを取得し、
JSON に変換して配信する静的生成型の実装でした。

現在の郡山市オープンデータ構成とは前提が異なるため、
v2 との互換性はありません。

## v2

v2 は新しい設計として別リポジトリで開発します。

- stable dataset_id
- JSON API
- GeoJSON API
- normalized place data
- change detection
- API documentation
- map UI
```

---

# 15. 実装フェーズ

## Phase 0: v1 archive

```text
- webapi-koriyama に README 追加
- v1 終了を明記
- archived にする
```

## Phase 1: API MVP

```text
実装:
- D1 schema
- dataset catalog
- ingestion job
- CSV / XLSX parser
- normalized places
- GET /api/v2/health
- GET /api/v2/datasets
- GET /api/v2/places
- GET /api/v2/places.geojson

対象:
- AED
- Wi-Fi
- 公衆トイレ
- 子育て施設
- 医療機関
- 学校
- 公共施設
```

## Phase 2: Web UI MVP

```text
- くらしマップ
- カテゴリフィルタ
- 検索
- 現在地周辺
- 施設詳細
- 出典表示
```

## Phase 3: RSS

```text
- RSS fetcher
- RSS classifier
- お知らせ一覧
- カテゴリ別お知らせ
- 施設詳細との関連表示
```

## Phase 4: 差分・開発者向け強化

```text
- GET /api/v2/changes
- OpenAPI
- API docs
- changelog
- dataset quality report
```

## Phase 5: 防災データ

```text
- 指定緊急避難場所
- 備蓄倉庫
- 防災行政無線
- 浸水関連データ
- 強い免責表示
```

---

# 16. 最終設計判断

```text
Decision:
郡山市オープンデータ非公式 Webapi v2 は、
v1 の後継実装ではなく、別設計の Open Data Hub として作る。

Repository:
koriyama-open-data-hub

Runtime:
Cloudflare Workers

Database:
Cloudflare D1

Main API:
GET /api/v2/datasets
GET /api/v2/places
GET /api/v2/places.geojson

Main UI:
郡山市くらしマップ

v1:
提供終了。互換なし。archive のみ。

Core Value:
郡山市オープンデータを、安定 ID・正規化 JSON・GeoJSON・検索 UI・RSS 再分類で使いやすくする。
