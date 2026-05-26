import type { DatasetCatalogItem, Place, RawRecord, RssEntry } from "../types";

type DatasetRow = Omit<DatasetCatalogItem, "enabled" | "public_api" | "source_type" | "format" | "normalize_as"> & {
  source_page: string;
  source_type: string;
  format: string;
  enabled: number;
  normalize_as: string;
  public_api: number;
};

export async function listDatasets(db: D1Database): Promise<DatasetCatalogItem[]> {
  const result = await db
    .prepare(
      `select
        id,
        name,
        'opendata_index' as source_page,
        'file' as source_type,
        'csv_or_xlsx' as format,
        category,
        enabled,
        normalize_as,
        public_api
      from datasets
      where enabled = 1 and public_api = 1
      order by id`,
    )
    .all<DatasetRow>();

  return result.results.map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    source_page: dataset.source_page,
    source_type: "file",
    format: "csv_or_xlsx",
    category: dataset.category,
    normalize_as: "place",
    enabled: dataset.enabled === 1,
    public_api: dataset.public_api === 1,
  }));
}

export async function getDataset(db: D1Database, datasetId: string): Promise<DatasetCatalogItem | null> {
  const dataset = await db
    .prepare(
      `select
        id,
        name,
        'opendata_index' as source_page,
        'file' as source_type,
        'csv_or_xlsx' as format,
        category,
        enabled,
        normalize_as,
        public_api
      from datasets
      where id = ? and enabled = 1 and public_api = 1`,
    )
    .bind(datasetId)
    .first<DatasetRow>();

  if (!dataset) return null;
  return {
    id: dataset.id,
    name: dataset.name,
    source_page: dataset.source_page,
    source_type: "file",
    format: "csv_or_xlsx",
    category: dataset.category,
    normalize_as: "place",
    enabled: dataset.enabled === 1,
    public_api: dataset.public_api === 1,
  };
}

export async function listRawRecords(db: D1Database, datasetId: string): Promise<RawRecord[]> {
  const result = await db
    .prepare("select * from raw_records where dataset_id = ? order by id limit 1000")
    .bind(datasetId)
    .all<RawRecord>();
  return result.results;
}

export type PlaceFilters = {
  datasetId?: string;
  category?: string;
  query?: string;
  bbox?: [number, number, number, number];
};

export async function listPlaces(db: D1Database, filters: PlaceFilters): Promise<Place[]> {
  const clauses = ["deleted_at is null"];
  const bindings: unknown[] = [];

  if (filters.datasetId) {
    clauses.push("dataset_id = ?");
    bindings.push(filters.datasetId);
  }
  if (filters.category) {
    clauses.push("category = ?");
    bindings.push(filters.category);
  }
  if (filters.query) {
    clauses.push("(name like ? or address like ?)");
    bindings.push(`%${filters.query}%`, `%${filters.query}%`);
  }
  if (filters.bbox) {
    const [minLng, minLat, maxLng, maxLat] = filters.bbox;
    clauses.push("lng between ? and ? and lat between ? and ?");
    bindings.push(minLng, maxLng, minLat, maxLat);
  }

  const result = await db
    .prepare(`select * from places where ${clauses.join(" and ")} order by name limit 1000`)
    .bind(...bindings)
    .all<Place>();
  return result.results;
}

export async function getPlace(db: D1Database, placeId: string): Promise<Place | null> {
  return db.prepare("select * from places where id = ? and deleted_at is null").bind(placeId).first<Place>();
}

export async function listRssEntries(db: D1Database, category?: string): Promise<RssEntry[]> {
  const statement = category
    ? db.prepare("select * from rss_entries where category = ? order by published_at desc limit 100")
    : db.prepare("select * from rss_entries order by published_at desc limit 100");
  const result = await (category ? statement.bind(category) : statement).all<RssEntry>();
  return result.results;
}

export async function insertFetchLog(
  db: D1Database,
  input: {
    sourceType: string;
    sourceId: string;
    status: string;
    fetchedAt: string;
    recordsCount?: number;
    errorMessage?: string;
  },
): Promise<void> {
  await db
    .prepare(
      `insert into fetch_logs (
        source_type,
        source_id,
        status,
        fetched_at,
        records_count,
        error_message
      ) values (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.sourceType,
      input.sourceId,
      input.status,
      input.fetchedAt,
      input.recordsCount ?? null,
      input.errorMessage ?? null,
    )
    .run();
}
