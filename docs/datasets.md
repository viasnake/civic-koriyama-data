# データセット API リファレンス

データセット API は、Civic Koriyama Data で公開しているデータセットの一覧、出典メタデータ、元データ行を取得するための API です。

このページの例では、ベース URL を `https://civic-koriyama-data.alflag.org/api/v2` として記載します。API 全体の共通仕様、認証、CORS、JSON envelope は {doc}`api` を確認してください。

```{admonition} dataset_id は安定した識別子です
:class: note

郡山市サイト側の添付ファイル ID やファイル URL は、公開 API の識別子としては使いません。アプリケーションでは `dataset_id` を保存し、最新の出典ファイル URL はデータセット詳細から取得してください。
```

## エンドポイント一覧

| メソッド | パス | 用途 |
| --- | --- | --- |
| `GET` | `/api/v2/datasets` | 公開データセットの一覧を取得します。 |
| `GET` | `/api/v2/datasets/{dataset_id}` | データセット 1 件の出典、ファイル、正規化状態を取得します。 |
| `GET` | `/api/v2/datasets/{dataset_id}/records` | データセットから読み取った元データ行を取得します。 |

## データセット一覧

| `dataset_id` | 名称 | `category` | `format` | 正規化 | 主な内容 |
| --- | --- | --- | --- | --- | --- |
| `public_facilities` | 公共施設一覧 | `facility` | `csv_or_xlsx` | あり | 市の行政サービス、公民館、文化・教育施設、スポーツ施設など |
| `aed` | AED設置個所一覧 | `safety` | `csv_or_xlsx` | あり | AED 設置施設 |
| `public_wifi` | 公衆無線LANアクセスポイント一覧 | `facility` | `csv_or_xlsx` | あり | Wi-Fi 設置施設 |
| `public_toilets` | 公衆トイレ一覧 | `facility` | `csv_or_xlsx` | あり | オストメイト対応トイレ設置施設 |
| `childcare_facilities` | 子育て施設一覧 | `childcare` | `csv_or_xlsx` | あり | 福祉・子育て支援施設、保育所、幼稚園など |
| `medical_institutions` | 医療機関一覧 | `medical` | `csv_or_xlsx` | あり | 保健所、病院 |
| `schools` | 学校一覧 | `education` | `csv_or_xlsx` | あり | 小学校、中学校 |
| `shelters` | 指定緊急避難場所一覧 | `disaster` | `zip` | なし | 防災情報の出典メタデータ。公式ファイルが ZIP shapefile のため、地点正規化は未対応 |

正規化ありのデータセットは、`/places`、`/places.geojson`、`/search` から共通フィールドの地点データとしても取得できます。`shelters` は出典メタデータと元ファイル情報のみを公開しています。

(datasets-list)=
## `GET /api/v2/datasets`

公開 API の対象になっているデータセット一覧を返します。アプリケーションの初期表示、`dataset_id` の選択 UI、出典表示の候補取得に使います。

### リクエスト

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/datasets
```

Query パラメータはありません。

### レスポンス

| 項目 | 内容 |
| --- | --- |
| ステータス | `200 OK` |
| `data` | データセットオブジェクトの配列 |
| `meta.result_count` | 返却したデータセット数 |

レスポンス例:

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-06-17T20:07:57.338Z",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City.",
    "result_count": 8
  },
  "data": [
    {
      "id": "aed",
      "name": "AED設置個所一覧",
      "source_page": "opendata_index",
      "source_page_url": "https://www.city.koriyama.lg.jp/soshiki/21/176727.html",
      "source_files": [
        {
          "label": "AED設置施設",
          "url": "https://www.city.koriyama.lg.jp/uploaded/attachment/1727.csv",
          "file_type": "csv",
          "encoding": "shift_jis",
          "normalize": true
        }
      ],
      "source_type": "file",
      "format": "csv_or_xlsx",
      "category": "safety",
      "normalize_as": "place",
      "enabled": true,
      "public_api": true,
      "source_page_label": "公共施設等情報"
    }
  ]
}
```

(datasets-detail)=
## `GET /api/v2/datasets/{dataset_id}`

指定したデータセットの詳細を返します。出典ページ、出典ファイル、ファイル形式、正規化対象かどうかを確認できます。

### パスパラメータ

| 名前 | 必須 | 内容 |
| --- | --- | --- |
| `dataset_id` | 必須 | データセット一覧で返る `id`。例: `aed` |

### リクエスト

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/datasets/aed
```

### レスポンス

| 項目 | 内容 |
| --- | --- |
| ステータス | `200 OK` |
| `data` | データセットオブジェクト |

レスポンス例:

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-06-17T20:07:57.333Z",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City."
  },
  "data": {
    "id": "aed",
    "name": "AED設置個所一覧",
    "source_page": "opendata_index",
    "source_page_url": "https://www.city.koriyama.lg.jp/soshiki/21/176727.html",
    "source_files": [
      {
        "label": "AED設置施設",
        "url": "https://www.city.koriyama.lg.jp/uploaded/attachment/1727.csv",
        "file_type": "csv",
        "encoding": "shift_jis",
        "normalize": true
      }
    ],
    "source_type": "file",
    "format": "csv_or_xlsx",
    "category": "safety",
    "normalize_as": "place",
    "enabled": true,
    "public_api": true,
    "source_page_label": "公共施設等情報"
  }
}
```

(datasets-records)=
## `GET /api/v2/datasets/{dataset_id}/records`

指定したデータセットの元データ行を返します。`raw` には、郡山市が公開している CSV / Excel などから読み取った行データが入ります。

正規化済みの地点データが必要な場合は `/api/v2/places?dataset_id={dataset_id}` を使ってください。`records` は、元ファイルの列名や値を確認したい場合、正規化前後の差分を調べたい場合に使います。

### パスパラメータ

| 名前 | 必須 | 内容 |
| --- | --- | --- |
| `dataset_id` | 必須 | データセット一覧で返る `id`。例: `aed` |

### Query パラメータ

| 名前 | 必須 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `limit` | 任意 | `1000` | 取得件数。`1` から `1000` の範囲に丸められます。 |
| `offset` | 任意 | `0` | 取得開始位置。負の値は `0` として扱われます。 |

`meta.result_count` はこのレスポンスで返した件数です。全件数ではありません。

### リクエスト

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/datasets/aed/records?limit=1"
```

### レスポンス

| 項目 | 内容 |
| --- | --- |
| ステータス | `200 OK` |
| `data` | 元データ行オブジェクトの配列 |
| `meta.limit` | 適用された取得件数 |
| `meta.offset` | 適用された取得開始位置 |
| `meta.result_count` | 返却した件数 |

レスポンス例:

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-06-17T20:07:57.351Z",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City.",
    "result_count": 1,
    "limit": 1,
    "offset": 0
  },
  "data": [
    {
      "id": "raw_aed_00ce039ec68d27220422",
      "dataset_id": "aed",
      "source_record_key": "AED設置施設:6",
      "source_row_hash": "12314d02c284034db80cf201a19493c7",
      "fetched_at": "2026-06-17T18:00:30.065Z",
      "raw": {
        "番号": "6",
        "施設区分": "A医療施設",
        "名称": "星ヶ丘病院",
        "住所": "片平町字北三天7",
        "電話番号": "024-952-6411",
        "設置場所": "1F外来･A-1病棟・A-2病棟・A-3病棟・C-1病棟",
        "台数": "5",
        "経度": "140.3194175",
        "緯度": "37.43489759"
      }
    }
  ]
}
```

## フィールド仕様

### データセットオブジェクト

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `id` | string | API で使う安定したデータセット ID。 |
| `name` | string | データセット名。 |
| `source_page` | string | 出典ページの内部識別子。 |
| `source_page_label` | string | 出典ページの表示名。 |
| `source_page_url` | string | 出典ページ URL。 |
| `source_files` | array | 出典ファイルの配列。 |
| `source_type` | string | 現在は `file`。 |
| `format` | string | `csv_or_xlsx`、`zip`、`mixed` のいずれか。 |
| `category` | string | API 側のカテゴリ。 |
| `normalize_as` | string | 正規化先の種類。現在は `place`。 |
| `enabled` | boolean | API 側で有効なデータセットかどうか。 |
| `public_api` | boolean | 公開 API の対象かどうか。 |
| `warnings` | string[] | データセット単位の注意事項。ない場合は省略されます。 |

### `source_files[]`

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `label` | string | 出典ファイルの表示名。 |
| `url` | string | 出典ファイル URL。 |
| `file_type` | string | `csv`、`xlsx`、`zip` のいずれか。 |
| `encoding` | string | 文字コード。CSV では `shift_jis` の場合があります。 |
| `normalize` | boolean | 正規化済み地点データへ取り込む対象かどうか。 |
| `warnings` | string[] | ファイル単位の注意事項。ない場合は省略されます。 |

### 元データ行オブジェクト

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `id` | string | API 内部の元データ行 ID。 |
| `dataset_id` | string | 元データが属するデータセット ID。 |
| `source_record_key` | string or null | 元データ側の識別キー。ない場合は `null`。 |
| `source_row_hash` | string | 元データ行から計算したハッシュ。 |
| `fetched_at` | string | 現在返している元データ行の内容を最後に保存した日時。ISO 8601 形式。 |
| `raw` | object | 元データ行。キー名と値は出典ファイルに依存します。 |

元データ行の内容が変わらない取得では `fetched_at` は更新されません。データセット全体の直近取得成功日時と取得ログは `/api/v2/health` の `data.datasets.last_success_at` と `data.datasets.recent_fetches` で確認してください。

## カテゴリ

| `category` | 内容 |
| --- | --- |
| `facility` | 公共施設、公衆無線 LAN、公衆トイレなど |
| `safety` | AED など安全に関わる地点 |
| `childcare` | 子育て関連施設 |
| `medical` | 医療機関 |
| `education` | 学校 |
| `disaster` | 避難場所など防災関連データ |

## 注意事項と警告値

| 値 | 出る場所 | 内容 |
| --- | --- | --- |
| `disaster_data` | `data.warnings[]` | 防災系データセットです。出典や更新状況を公式ページで確認してください。 |
| `unsupported_shapefile_zip` | `source_files[].warnings[]` | 公式ファイルが ZIP shapefile のため、現在は地点データへ正規化していません。 |

警告値は今後追加される可能性があります。未知の警告値を受け取っても処理が止まらないようにしてください。

## エラー

存在しない `dataset_id` を指定した場合は、`404 dataset_not_found` を返します。

```bash
curl -i https://civic-koriyama-data.alflag.org/api/v2/datasets/not_found
```

レスポンス例:

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-06-17T20:08:48.008Z",
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

## よく使う取得パターン

データセット ID を選ばせてから地点データを取得する:

```javascript
const apiBaseUrl = "https://civic-koriyama-data.alflag.org/api/v2";

const datasetsResponse = await fetch(`${apiBaseUrl}/datasets`);
const datasets = (await datasetsResponse.json()).data;

const selectedDatasetId = datasets[0].id;
const placesResponse = await fetch(`${apiBaseUrl}/places?dataset_id=${selectedDatasetId}&limit=100`);
const places = (await placesResponse.json()).data;
```

出典表示に必要な情報を取得する:

```javascript
const response = await fetch("https://civic-koriyama-data.alflag.org/api/v2/datasets/aed");
const { data: dataset } = await response.json();

console.log(dataset.source_page_label);
console.log(dataset.source_page_url);
console.log(dataset.source_files.map((file) => file.url));
```

元データの列名を確認する:

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/datasets/aed/records?limit=1"
```

## 関連エンドポイント

| 目的 | エンドポイント |
| --- | --- |
| 正規化済み地点データを取得する | `/api/v2/places?dataset_id={dataset_id}` |
| 地図用 GeoJSON を取得する | `/api/v2/places.geojson?dataset_id={dataset_id}` |
| 名称や住所で地点を検索する | `/api/v2/search?q={keyword}` |
| 取得・正規化時の変更履歴を見る | `/api/v2/changes` |

出典表示、ライセンス、免責事項は {doc}`attribution` も確認してください。
