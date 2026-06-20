# 運用・状態確認

このページでは、API 利用者がデータの鮮度やサービス状態を確認するための情報をまとめます。内部実装ではなく、アプリケーションから利用するときに判断材料になる項目を記載します。

## 更新の目安

| 対象 | 更新の目安 | 確認方法 |
| --- | --- | --- |
| オープンデータ | 1 日 1 回程度 | `/api/v2/health` の `data.datasets.last_success_at` |
| RSS 記事 | おおむね 1 時間ごと | `/api/v2/health` の `data.rss.last_success_at` |
| RSS feed 確認レポート | 1 日 1 回程度 | `/api/v2/rss/audit` の `data.generated_at` |

公式サイト側の一時的な不調、ファイル形式の変更、通信失敗などにより、更新が遅れる場合があります。API は取得に失敗した場合でも、原則として既存データをただちに削除しません。

## サービス状態

`/api/v2/health` は、データ件数、直近の取得状況、失敗ログを返します。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/health
```

主な `data` フィールドは次の通りです。

| フィールド | 説明 |
| --- | --- |
| `status` | `ok` または `degraded` |
| `datasets.last_success_at` | オープンデータ取得の直近成功日時 |
| `datasets.raw_records_count` | 元データ行数 |
| `datasets.places_count` | 正規化済み地点データ数 |
| `datasets.record_changes_count` | 変更履歴数 |
| `datasets.recent_fetches` | 直近のオープンデータ取得ログ |
| `datasets.failed` | 直近のオープンデータ取得失敗ログ |
| `rss.last_success_at` | RSS 取得の直近成功日時 |
| `rss.entries_count` | RSS 記事数 |
| `rss.recent_fetches` | 直近の RSS 取得ログ |
| `rss.failed` | 直近の RSS 取得失敗ログ |

`status = degraded` は、直近の取得失敗やデータ未投入など、利用前に確認した方がよい状態を示します。すでに取得済みのデータが返る場合でも、最新の公式情報とは差が出ている可能性があります。

## RSS feed 確認レポート

RSS feed の登録状況や検証結果は `/api/v2/rss/audit` で確認できます。

```bash
curl https://civic-koriyama-data.alflag.org/api/v2/rss/audit
```

主な `data` フィールドは次の通りです。

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

レポートがまだ作成されていない場合は `404 rss_audit_not_found` を返します。

## レート制限

API は、同一クライアント IP アドレスからのリクエストを 60 秒あたり 30 件までに制限します。上限を超えた場合は HTTP `429` と `data.error = "rate_limited"` を返し、`Retry-After` ヘッダーで再試行までの目安秒数を示します。

短時間に同じレスポンスを繰り返し取得する用途では、アプリケーション側でキャッシュしてください。

## 利用時の注意

Civic Koriyama Data は非公式 API です。データの正確性、完全性、最新性、可用性は保証しません。行政手続き、避難、医療、安全確認など、正確性が重要な用途では必ず郡山市公式ウェブサイトまたは関係機関で確認してください。

出典とライセンスは {doc}`attribution` を確認してください。
