import { listPublicDatasets } from "../db/catalog";
import { insertFetchLog } from "../db/queries";
import { normalizePlace } from "../normalizers/place";
import { parseCsvBuffer } from "../parsers/csv";
import { fetchSourceFile } from "../sources/koriyama";
import type { DatasetCatalogItem, DatasetSourceFile, Place, RawRecord } from "../types";
import { nowIso } from "../utils/datetime";
import { shortHash } from "../utils/hash";

const INGEST_WRITE_CHUNK_SIZE = 50; // At most 50 lookup bindings and 100 entity/change statements per batch.

type RecordChangeWrite = {
  datasetId: string;
  recordId: string;
  changeType: string;
  beforeJson: string | null;
  afterJson: string;
};

export type OpenDataWritePlan<T> = {
  writes: T[];
  changes: RecordChangeWrite[];
};

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

      await persistRawRecords(db, rawRecords, now);
      await persistPlaces(db, places, now);

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
        source_name = excluded.source_name,
        source_page_url = excluded.source_page_url,
        source_file_url = excluded.source_file_url,
        source_file_type = excluded.source_file_type,
        license = excluded.license,
        attribution = excluded.attribution,
        enabled = excluded.enabled,
        public_api = excluded.public_api,
        normalize_as = excluded.normalize_as,
        updated_at = excluded.updated_at
      where datasets.name is not excluded.name
        or datasets.category is not excluded.category
        or datasets.source_name is not excluded.source_name
        or datasets.source_page_url is not excluded.source_page_url
        or datasets.source_file_url is not excluded.source_file_url
        or datasets.source_file_type is not excluded.source_file_type
        or datasets.license is not excluded.license
        or datasets.attribution is not excluded.attribution
        or datasets.enabled is not excluded.enabled
        or datasets.public_api is not excluded.public_api
        or datasets.normalize_as is not excluded.normalize_as`,
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

async function persistRawRecords(db: D1Database, records: RawRecord[], changedAt: string): Promise<void> {
  for (const chunk of chunks(uniqueById(records), INGEST_WRITE_CHUNK_SIZE)) {
    const existingRecords = await selectExistingRawRecords(db, chunk.map((record) => record.id));
    const plan = planRawRecordWrites(chunk, existingRecords);
    if (plan.writes.length === 0) continue;

    const recordStatement = db.prepare(
      `insert into raw_records (
        id,
        dataset_id,
        source_record_key,
        source_row_hash,
        raw_json,
        fetched_at
      ) values (?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        dataset_id = excluded.dataset_id,
        source_record_key = excluded.source_record_key,
        source_row_hash = excluded.source_row_hash,
        raw_json = excluded.raw_json,
        fetched_at = excluded.fetched_at
      where raw_records.dataset_id is not excluded.dataset_id
        or raw_records.source_record_key is not excluded.source_record_key
        or raw_records.source_row_hash is not excluded.source_row_hash
        or raw_records.raw_json is not excluded.raw_json`,
    );
    await runOpenDataWriteBatch(db, plan, changedAt, (record) =>
      recordStatement.bind(
        record.id,
        record.dataset_id,
        record.source_record_key,
        record.source_row_hash,
        record.raw_json,
        record.fetched_at,
      ),
    );
  }
}

export function planRawRecordWrites(
  records: readonly RawRecord[],
  existingRecords: ReadonlyMap<string, RawRecord>,
): OpenDataWritePlan<RawRecord> {
  const writes: RawRecord[] = [];
  const changes: RecordChangeWrite[] = [];

  for (const record of records) {
    const before = existingRecords.get(record.id);
    if (before && rawRecordContentsEqual(before, record)) continue;

    writes.push(record);
    changes.push({
      datasetId: record.dataset_id,
      recordId: record.id,
      changeType: before ? "raw_updated" : "raw_created",
      beforeJson: before?.raw_json ?? null,
      afterJson: record.raw_json,
    });
  }

  return { writes, changes };
}

function rawRecordContentsEqual(left: RawRecord, right: RawRecord): boolean {
  return (
    left.dataset_id === right.dataset_id &&
    left.source_record_key === right.source_record_key &&
    left.source_row_hash === right.source_row_hash &&
    left.raw_json === right.raw_json
  );
}

async function selectExistingRawRecords(db: D1Database, ids: string[]): Promise<Map<string, RawRecord>> {
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const result = await db.prepare(`select * from raw_records where id in (${placeholders})`).bind(...ids).all<RawRecord>();
  return new Map(result.results.map((record) => [record.id, record]));
}

async function persistPlaces(db: D1Database, places: Place[], changedAt: string): Promise<void> {
  for (const chunk of chunks(uniqueById(places), INGEST_WRITE_CHUNK_SIZE)) {
    const existingPlaces = await selectExistingPlaces(db, chunk.map((place) => place.id));
    const plan = planPlaceWrites(chunk, existingPlaces);
    if (plan.writes.length === 0) continue;

    const placeStatement = db.prepare(
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
        deleted_at = null
      where places.dataset_id is not excluded.dataset_id
        or places.name is not excluded.name
        or places.category is not excluded.category
        or places.subcategory is not excluded.subcategory
        or places.address is not excluded.address
        or places.lat is not excluded.lat
        or places.lng is not excluded.lng
        or places.phone is not excluded.phone
        or places.fax is not excluded.fax
        or places.email is not excluded.email
        or places.official_url is not excluded.official_url
        or places.source_url is not excluded.source_url
        or places.source_record_hash is not excluded.source_record_hash
        or places.attributes_json is not excluded.attributes_json
        or places.deleted_at is not null`,
    );
    await runOpenDataWriteBatch(db, plan, changedAt, (place) =>
      placeStatement.bind(
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
    );
  }
}

export function planPlaceWrites(
  places: readonly Place[],
  existingPlaces: ReadonlyMap<string, Place>,
): OpenDataWritePlan<Place> {
  const writes: Place[] = [];
  const changes: RecordChangeWrite[] = [];

  for (const place of places) {
    const before = existingPlaces.get(place.id);
    const write = {
      ...place,
      first_seen_at: before?.first_seen_at ?? place.first_seen_at,
      deleted_at: null,
    };
    if (before && placeContentsEqual(before, write)) continue;

    writes.push(write);
    changes.push({
      datasetId: write.dataset_id,
      recordId: write.id,
      changeType: before ? "place_updated" : "place_created",
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: JSON.stringify(write),
    });
  }

  return { writes, changes };
}

function placeContentsEqual(left: Place, right: Place): boolean {
  return (
    left.dataset_id === right.dataset_id &&
    left.name === right.name &&
    left.category === right.category &&
    left.subcategory === right.subcategory &&
    left.address === right.address &&
    left.lat === right.lat &&
    left.lng === right.lng &&
    left.phone === right.phone &&
    left.fax === right.fax &&
    left.email === right.email &&
    left.official_url === right.official_url &&
    left.source_url === right.source_url &&
    left.source_record_hash === right.source_record_hash &&
    left.attributes_json === right.attributes_json &&
    left.deleted_at === right.deleted_at
  );
}

async function selectExistingPlaces(db: D1Database, ids: string[]): Promise<Map<string, Place>> {
  if (ids.length === 0) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const result = await db.prepare(`select * from places where id in (${placeholders})`).bind(...ids).all<Place>();
  return new Map(result.results.map((place) => [place.id, place]));
}

async function runOpenDataWriteBatch<T>(
  db: D1Database,
  plan: OpenDataWritePlan<T>,
  changedAt: string,
  bindWrite: (write: T) => D1PreparedStatement,
): Promise<void> {
  const changeStatement = db.prepare(
    `insert into record_changes (
      dataset_id,
      record_id,
      change_type,
      changed_at,
      before_json,
      after_json
    ) select ?, ?, ?, ?, ?, ? where changes() > 0`,
  );

  // Each change statement immediately follows its entity write, so a concurrent no-op UPSERT does not create a false change.
  const statements = plan.writes.flatMap((write, index) => {
    const change = plan.changes[index];
    if (!change) throw new Error("Open-data write is missing its change record");
    return [
      bindWrite(write),
      changeStatement.bind(
        change.datasetId,
        change.recordId,
        change.changeType,
        changedAt,
        change.beforeJson,
        change.afterJson,
      ),
    ];
  });
  await db.batch(statements);
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
