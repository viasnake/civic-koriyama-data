# Civic Koriyama Data

Civic Koriyama Data は、郡山市が公開しているオープンデータと公式サイト RSS を、アプリケーションから扱いやすい JSON / GeoJSON で取得するための非公式 Web API です。

公共施設、AED 設置箇所、公衆無線 LAN、公衆トイレ、子育て施設、医療機関、学校などの地点データを検索できます。地点データは GeoJSON FeatureCollection としても取得できます。

```{admonition} 非公式 API です
:class: attention

この API は郡山市公式サービスではありません。データの正確性、完全性、最新性、可用性は保証しません。正確な内容は必ず郡山市公式ウェブサイトで確認してください。
```

## 基本情報

| 項目 | 値 |
| --- | --- |
| 公開 URL | <https://civic-koriyama-data.alflag.org/> |
| 旧称 | 郡山市オープンデータ非公式 WebAPI |
| API バージョン | `2.0` |
| API ベースパス | `/api/v2` |
| API ベース URL | <https://civic-koriyama-data.alflag.org/api/v2> |
| レスポンス形式 | JSON、GeoJSON |

旧 v1 API は提供を終了しています。現在は `/api/v2` を利用してください。

## すぐ試す

データセット一覧を取得します。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/datasets
```

AED 設置箇所を 5 件取得します。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/places?dataset_id=aed&limit=5"
```

キーワードで地点データを検索します。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/search?q=公民館"
```

地図アプリなどで使う GeoJSON を取得します。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/places.geojson?category=facility"
```

## 取得できるもの

- 公開データセットの一覧
- データセットごとの出典情報
- 元データ行
- 正規化済み地点データ
- 地点データの GeoJSON
- 取得・正規化時に検出した変更履歴
- 郡山市公式サイト RSS の記事情報
- データ更新状態と取得ログ

## ドキュメント

```{toctree}
:maxdepth: 2

API リファレンス <api>
データセット API <datasets>
RSS API <rss>
運用・状態確認 <operations>
出典・ライセンス <attribution>
```
