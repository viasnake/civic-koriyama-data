import { listPublicDatasets } from "../db/catalog";
import { insertFetchLog } from "../db/queries";
import { normalizePlace } from "../normalizers/place";
import { parseCsvBuffer } from "../parsers/csv";
import { fetchSourceFile } from "../sources/koriyama";
import type { DatasetCatalogItem, DatasetSourceFile, Place, RawRecord } from "../types";
import { nowIso } from "../utils/datetime";
import { shortHash } from "../utils/hash";

export async function ingestOpenData(db: D1Database): Promise<void> {
  const now = nowIso();
  const datasets = listPublicDatasets();

  for (const dataset of datasets) {
    await upsertDataset(db, dataset, now);

    const sourceFiles = dataset.source_files ?? [];
    const normalizableFiles = sourceFiles.filter((sourceFile) => sourceFile.normalize);

    if (normalizableFiles.length === 0) {
      await insertFetchLog(db, {
        sourceType: "opendata",
        sourceId: dataset.id,
        status: sourceFiles.length > 0 ? "skipped_unsupported" : "catalog_seeded",
        fetchedAt: now,
        recordsCount: 0,
        errorMessage: sourceFiles.flatMap((sourceFile) => sourceFile.warnings ?? []).join(",") || undefined,
      });
      continue;
    }

    try {
      const rowsBySource = await fetchRows(dataset, normalizableFiles);
      const rawRecords: RawRecord[] = [];
      const places: Place[] = [];

      for (const source of rowsBySource) {
        for (const [index, row] of source.rows.entries()) {
          rawRecords.push(await toRawRecord(dataset.id, source.file, row, index, now));
          const place = await normalizePlace({
            dataset,
            row,
            fetchedAt: now,
            sourceUrl: source.file.url,
          });
          if (place) places.push(place);
        }
      }

      await upsertRawRecords(db, rawRecords);
      await upsertPlaces(db, places);

      await insertFetchLog(db, {
        sourceType: "opendata",
        sourceId: dataset.id,
        status: "ok",
        fetchedAt: now,
        recordsCount: rawRecords.length,
      });
    } catch (error) {
      await insertFetchLog(db, {
        sourceType: "opendata",
        sourceId: dataset.id,
        status: "error",
        fetchedAt: now,
        recordsCount: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function upsertDataset(db: D1Database, dataset: DatasetCatalogItem, now: string): Promise<void> {
  const firstFile = dataset.source_files?.[0];

  await db
    .prepare(
      `insert into datasets (
        id,
        name,
        category,
        source_name,
        source_page_url,
        source_file_url,
        source_file_type,
        license,
        attribution,
        enabled,
        public_api,
        normalize_as,
        created_at,
        updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        name = excluded.name,
        category = excluded.category,
        source_page_url = excluded.source_page_url,
        source_file_url = excluded.source_file_url,
        source_file_type = excluded.source_file_type,
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
      dataset.source_page_url ?? null,
      firstFile?.url ?? null,
      firstFile?.file_type ?? null,
      "CC BY 4.0",
      "郡山市オープンデータ",
      dataset.enabled ? 1 : 0,
      dataset.public_api ? 1 : 0,
      dataset.normalize_as,
      now,
      now,
    )
    .run();
}

async function fetchRows(
  dataset: DatasetCatalogItem,
  files: DatasetSourceFile[],
): Promise<Array<{ file: DatasetSourceFile; rows: Record<string, unknown>[] }>> {
  const rowsBySource = [];

  for (const file of files) {
    const buffer = await fetchSourceFile({
      datasetId: dataset.id,
      label: file.label,
      url: file.url,
      fileType: file.file_type,
      encoding: file.encoding,
      normalize: file.normalize,
    });
    rowsBySource.push({
      file,
      rows: await parseSourceRows(file, buffer),
    });
  }

  return rowsBySource;
}

async function parseSourceRows(file: DatasetSourceFile, buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  if (file.file_type === "csv") {
    return parseCsvBuffer(buffer, file.encoding ?? "utf-8");
  }
  if (file.file_type === "xlsx") {
    throw new Error(`Unsupported XLSX source: ${file.label}`);
  }
  return [];
}

async function toRawRecord(
  datasetId: string,
  sourceFile: DatasetSourceFile,
  row: Record<string, unknown>,
  index: number,
  fetchedAt: string,
): Promise<RawRecord> {
  const sourceRecordKey = `${sourceFile.label}:${index + 1}`;
  const rawJson = JSON.stringify(row);
  const sourceRowHash = await shortHash(rawJson, 32);
  const id = `raw_${datasetId}_${await shortHash(`${sourceFile.url}|${sourceRecordKey}|${sourceRowHash}`, 20)}`;

  return {
    id,
    dataset_id: datasetId,
    source_record_key: sourceRecordKey,
    source_row_hash: sourceRowHash,
    raw_json: rawJson,
    fetched_at: fetchedAt,
  };
}

async function upsertRawRecords(db: D1Database, records: RawRecord[]): Promise<void> {
  const statement = db.prepare(
    `insert into raw_records (
          id,
          dataset_id,
          source_record_key,
          source_row_hash,
          raw_json,
          fetched_at
        ) values (?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          source_record_key = excluded.source_record_key,
          source_row_hash = excluded.source_row_hash,
          raw_json = excluded.raw_json,
          fetched_at = excluded.fetched_at`,
  );

  for (const chunk of chunks(records, 100)) {
    await db.batch(
      chunk.map((record) =>
        statement.bind(
          record.id,
          record.dataset_id,
          record.source_record_key,
          record.source_row_hash,
          record.raw_json,
          record.fetched_at,
        ),
      ),
    );
  }
}

async function upsertPlaces(db: D1Database, places: Place[]): Promise<void> {
  const statement = db.prepare(
    `insert into places (
          id,
          dataset_id,
          name,
          category,
          subcategory,
          address,
          lat,
          lng,
          phone,
          fax,
          email,
          official_url,
          source_url,
          source_record_hash,
          attributes_json,
          first_seen_at,
          last_seen_at,
          deleted_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(id) do update set
          dataset_id = excluded.dataset_id,
          name = excluded.name,
          category = excluded.category,
          subcategory = excluded.subcategory,
          address = excluded.address,
          lat = excluded.lat,
          lng = excluded.lng,
          phone = excluded.phone,
          fax = excluded.fax,
          email = excluded.email,
          official_url = excluded.official_url,
          source_url = excluded.source_url,
          source_record_hash = excluded.source_record_hash,
          attributes_json = excluded.attributes_json,
          last_seen_at = excluded.last_seen_at,
          deleted_at = null`,
  );

  for (const chunk of chunks(places, 100)) {
    await db.batch(
      chunk.map((place) =>
        statement.bind(
          place.id,
          place.dataset_id,
          place.name,
          place.category,
          place.subcategory,
          place.address,
          place.lat,
          place.lng,
          place.phone,
          place.fax,
          place.email,
          place.official_url,
          place.source_url,
          place.source_record_hash,
          place.attributes_json,
          place.first_seen_at,
          place.last_seen_at,
          place.deleted_at,
        ),
      ),
    );
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
