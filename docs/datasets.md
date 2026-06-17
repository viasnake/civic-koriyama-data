# データセット

API で利用できるデータセット ID は安定した識別子です。郡山市サイト側の添付ファイル ID は公開 API の ID としては使いません。

## 利用できるデータセット

| dataset_id | 名称 | category | 備考 |
| --- | --- | --- | --- |
| `public_facilities` | 公共施設一覧 | `facility` | 市の施設、公民館、文化・教育施設、スポーツ施設などをまとめた地点データ |
| `aed` | AED 設置箇所一覧 | `safety` | AED 設置施設 |
| `public_wifi` | 公衆無線 LAN アクセスポイント一覧 | `facility` | Wi-Fi 設置施設 |
| `public_toilets` | 公衆トイレ一覧 | `facility` | オストメイト対応トイレ設置施設 |
| `childcare_facilities` | 子育て施設一覧 | `childcare` | 福祉・子育て支援施設、保育所、幼稚園など |
| `medical_institutions` | 医療機関一覧 | `medical` | 保健所、病院 |
| `schools` | 学校一覧 | `education` | 小学校、中学校 |
| `shelters` | 指定緊急避難場所一覧 | `disaster` | 防災情報の出典メタデータ。公式ファイルが ZIP shapefile のため、地点正規化は未対応 |

## カテゴリ

| category | 内容 |
| --- | --- |
| `facility` | 公共施設、公衆無線 LAN、公衆トイレなど |
| `safety` | AED など安全に関わる地点 |
| `childcare` | 子育て関連施設 |
| `medical` | 医療機関 |
| `education` | 学校 |
| `disaster` | 避難場所など防災関連データ |

## 出典情報の取得

データセット詳細には、出典ページ URL、出典ファイル、ファイル種別、正規化対象かどうかが含まれます。

```bash
curl https://koriyama-open-data-hub.alflag.org/api/v2/datasets/public_facilities
```

元データ行を確認したい場合は、`records` エンドポイントを使います。

```bash
curl "https://koriyama-open-data-hub.alflag.org/api/v2/datasets/public_facilities/records?limit=5"
```

## 正規化について

地点データは、元データの名称、住所、緯度、経度、連絡先などを共通フィールドへ寄せています。元の行データは `attributes.raw` または `records` エンドポイントの `raw` で確認できます。

緯度・経度が郡山市周辺として妥当でない場合は、地点データでは `lat` / `lng` を `null` にし、`attributes.warnings` に `invalid_coordinate` を入れます。緯度・経度がない地点は GeoJSON には含まれません。
