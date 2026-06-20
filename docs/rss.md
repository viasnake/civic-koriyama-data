# RSS API

郡山市公式サイト RSS の feed 一覧と記事情報を JSON で取得できます。防災、子育て、生活、イベント、市政情報などの更新情報を、アプリケーションや一覧画面で扱いやすい形式で返します。

```{admonition} 速報性は保証しません
:class: attention

RSS 記事は定期的に取得しますが、郡山市公式サイトの更新直後に必ず反映されるとは限りません。正確な最新情報が必要な場合は、記事 URL から郡山市公式サイトを確認してください。
```

## 取得対象

この API では、市民向けポータルで扱いやすい次の RSS を取得対象にしています。

| `kind` | 対象 | RSS パス |
| --- | --- | --- |
| `global` | 全体 RSS | `/rss/10/list*.xml` |
| `life` | 生活分類 RSS | `/rss/10/life*.xml` |
| `site` | 特設サイト RSS | `/rss/10/site-*.xml` |

組織別 RSS `/rss/10/soshiki-*.xml` は対象外です。担当課単位の更新をすべて網羅する API ではありません。

## RSS feed を確認する

取得対象の RSS feed は `/api/v2/rss/feeds` で確認できます。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/feeds"
```

カテゴリで絞り込む場合は `kind` を指定します。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/feeds?kind=life"
```

主なレスポンス項目は次の通りです。

| フィールド | 説明 |
| --- | --- |
| `id` | RSS feed ID |
| `kind` | `global`、`life`、`site` のいずれか |
| `title` | feed タイトル |
| `url` | feed URL |
| `enabled` | 取得対象として有効かどうか |
| `verification_status` | feed 確認結果 |
| `verified_at` | feed を確認した日時。未確認の場合は `null` |

## 記事を取得する

RSS 記事は `/api/v2/rss/entries` で取得できます。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/entries?limit=10"
```

カテゴリ、feed、feed 種別、公開日時で絞り込めます。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/entries?category=event&limit=20"
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/entries?kind=life&since=2026-06-01T00:00:00.000Z"
```

主なレスポンス項目は次の通りです。

| フィールド | 説明 |
| --- | --- |
| `id` | RSS 記事 ID |
| `feed_id` | 代表 feed ID |
| `feed_ids` | 記事が出現した feed ID の配列 |
| `feed_kinds` | 記事が出現した feed 種別の配列 |
| `title` | 記事タイトル |
| `link` | 記事 URL |
| `canonical_url` | 重複排除に使う正規化 URL。取得できない場合は `null` |
| `published_at` | 公開日時。RSS にない場合は `null` |
| `fetched_at` | API が記事を取得した日時 |
| `category` | API 側で分類したカテゴリ |
| `tags` | 分類タグ |

RSS カテゴリは `disaster`、`childcare`、`life`、`business`、`event`、`city_admin` です。

## feed 確認レポート

`/api/v2/rss/audit` は、登録済み feed の確認結果と、公式サイト上で検出できる RSS feed との差分を返します。

```bash
curl "https://civic-koriyama-data.alflag.org/api/v2/rss/audit"
```

レポートがまだ作成されていない場合は `404 rss_audit_not_found` を返します。データの鮮度や取得状態を確認したい場合は {doc}`operations` も参照してください。

詳しい query とレスポンス形式は {doc}`api` を参照してください。
