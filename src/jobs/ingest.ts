import { listPublicDatasets } from "../db/catalog";
import { insertFetchLog } from "../db/queries";
import { nowIso } from "../utils/datetime";

export async function ingestOpenData(db: D1Database): Promise<void> {
  const now = nowIso();
  const datasets = listPublicDatasets();

  for (const dataset of datasets) {
    await db
      .prepare(
        `insert into datasets (
          id,
          name,
          category,
          source_name,
          license,
          attribution,
          enabled,
          public_api,
          normalize_as,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          name = excluded.name,
          category = excluded.category,
          enabled = excluded.enabled,
          public_api = excluded.public_api,
          normalize_as = excluded.normalize_as,
          updated_at = excluded.updated_at`,
      )
      .bind(
        dataset.id,
        dataset.name,
        dataset.category,
        "郡山市オープンデータ",
        "CC BY 4.0",
        "郡山市オープンデータ",
        dataset.enabled ? 1 : 0,
        dataset.public_api ? 1 : 0,
        dataset.normalize_as,
        now,
        now,
      )
      .run();

    await insertFetchLog(db, {
      sourceType: "opendata",
      sourceId: dataset.id,
      status: "catalog_seeded",
      fetchedAt: now,
      recordsCount: 0,
    });
  }
}
