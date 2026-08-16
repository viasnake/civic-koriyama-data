import {
  KORIYAMA_RSS_FEEDS,
  rssFeedUrl,
  type DiscoveredFeed,
  type FeedVerification,
  type RssDiscoveryReport,
  verificationStatusFromResult,
} from "../sources/rss";
import type { DatasetCatalogItem, FetchLog, Place, RawRecord, RssEntry, RssFeed, RssFeedKind } from "../types";

const RSS_SEED_SYNC_CHUNK_SIZE = 8;
const RSS_ENTRY_IDENTITY_LOOKUP_CHUNK_SIZE = 50;
const RSS_ENTRY_FEED_TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000; // last_seen_at is a daily heartbeat, not an event log.

type DatasetRow = Omit<DatasetCatalogItem, "enabled" | "public_api" | "source_type" | "format" | "normalize_as"> & {
  source_page: string;
  source_page_url: string | null;
  source_file_url: string | null;
  source_file_type: string | null;
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
        source_page_url,
        source_file_url,
        source_file_type,
        coalesce(source_page_url, 'opendata_index') as source_page,
        'file' as source_type,
        coalesce(source_file_type, 'csv_or_xlsx') as format,
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
    source_page_url: dataset.source_page_url ?? undefined,
    source_files: dataset.source_file_url
      ? [
          {
            label: dataset.name,
            url: dataset.source_file_url,
            file_type: dataset.source_file_type === "zip" ? "zip" : dataset.source_file_type === "xlsx" ? "xlsx" : "csv",
            normalize: dataset.source_file_type !== "zip",
          },
        ]
      : undefined,
    source_type: "file",
    format: dataset.format === "zip" ? "zip" : dataset.format === "mixed" ? "mixed" : "csv_or_xlsx",
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
        source_page_url,
        source_file_url,
        source_file_type,
        coalesce(source_page_url, 'opendata_index') as source_page,
        'file' as source_type,
        coalesce(source_file_type, 'csv_or_xlsx') as format,
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
    source_page_url: dataset.source_page_url ?? undefined,
    source_files: dataset.source_file_url
      ? [
          {
            label: dataset.name,
            url: dataset.source_file_url,
            file_type: dataset.source_file_type === "zip" ? "zip" : dataset.source_file_type === "xlsx" ? "xlsx" : "csv",
            normalize: dataset.source_file_type !== "zip",
          },
        ]
      : undefined,
    source_type: "file",
    format: dataset.format === "zip" ? "zip" : dataset.format === "mixed" ? "mixed" : "csv_or_xlsx",
    category: dataset.category,
    normalize_as: "place",
    enabled: dataset.enabled === 1,
    public_api: dataset.public_api === 1,
  };
}

export async function listRawRecords(db: D1Database, datasetId: string, limit = 1000, offset = 0): Promise<RawRecord[]> {
  const result = await db
    .prepare("select * from raw_records where dataset_id = ? order by id limit ? offset ?")
    .bind(datasetId, limit, offset)
    .all<RawRecord>();
  return result.results;
}

export type PlaceFilters = {
  datasetId?: string;
  category?: string;
  query?: string;
  bbox?: [number, number, number, number];
  limit?: number;
  offset?: number;
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

  const limit = filters.limit ?? 1000;
  const offset = filters.offset ?? 0;

  const result = await db
    .prepare(`select * from places where ${clauses.join(" and ")} order by name limit ? offset ?`)
    .bind(...bindings, limit, offset)
    .all<Place>();
  return result.results;
}

export async function getPlace(db: D1Database, placeId: string): Promise<Place | null> {
  return db.prepare("select * from places where id = ? and deleted_at is null").bind(placeId).first<Place>();
}

export type RssEntryFilters = {
  category?: string;
  feedId?: string;
  kind?: RssFeedKind;
  since?: string;
  limit?: number;
  offset?: number;
};

export async function listRssEntries(db: D1Database, filters: RssEntryFilters = {}): Promise<RssEntry[]> {
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const clauses: string[] = [];
  const bindings: unknown[] = [];

  if (filters.category) {
    clauses.push("e.category = ?");
    bindings.push(filters.category);
  }
  if (filters.feedId) {
    clauses.push("exists (select 1 from rss_entry_feeds ef_filter where ef_filter.entry_id = e.id and ef_filter.feed_id = ?)");
    bindings.push(filters.feedId);
  }
  if (filters.kind) {
    clauses.push("exists (select 1 from rss_entry_feeds ef_kind join rss_feeds f_kind on f_kind.id = ef_kind.feed_id where ef_kind.entry_id = e.id and f_kind.kind = ?)");
    bindings.push(filters.kind);
  }
  if (filters.since) {
    clauses.push("coalesce(e.published_at, e.fetched_at) >= ?");
    bindings.push(filters.since);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const result = await db
    .prepare(
      `select
        e.id,
        coalesce(e.feed_id, min(ef.feed_id)) as feed_id,
        group_concat(distinct ef.feed_id) as feed_ids,
        group_concat(distinct f.kind) as feed_kinds,
        e.title,
        e.link,
        e.published_at,
        e.fetched_at,
        e.category,
        e.tags_json,
        e.source_hash,
        e.canonical_url
      from rss_entries e
      left join rss_entry_feeds ef on ef.entry_id = e.id
      left join rss_feeds f on f.id = ef.feed_id
      ${where}
      group by e.id
      order by coalesce(e.published_at, e.fetched_at) desc
      limit ? offset ?`,
    )
    .bind(...bindings, limit, offset)
    .all<RssEntry>();
  return result.results;
}

export type RssFeedFilters = {
  includeDisabled?: boolean;
  includeUnverified?: boolean;
  kind?: RssFeedKind;
};

type RssFeedRow = Omit<RssFeed, "enabled"> & {
  enabled: number;
};

export async function syncSeedRssFeeds(db: D1Database, now = new Date().toISOString()): Promise<void> {
  for (let index = 0; index < KORIYAMA_RSS_FEEDS.length; index += RSS_SEED_SYNC_CHUNK_SIZE) {
    const feeds = KORIYAMA_RSS_FEEDS.slice(index, index + RSS_SEED_SYNC_CHUNK_SIZE);
    const values = feeds.map(() => "(?, ?, ?, ?, ?, ?, 'seed', 0, 'unchecked', ?, ?, ?, ?)").join(", ");
    const bindings = feeds.flatMap((feed) => [
      feed.id,
      feed.title,
      feed.title,
      rssFeedUrl(feed.path),
      feed.path,
      feed.kind,
      now,
      now,
      now,
      now,
    ]);

    await db
      .prepare(
        `insert into rss_feeds (
          id,
          name,
          title,
          url,
          path,
          kind,
          source,
          enabled,
          verification_status,
          first_seen_at,
          last_seen_at,
          created_at,
          updated_at
        ) values ${values}
        on conflict(id) do update set
          name = excluded.name,
          title = excluded.title,
          url = excluded.url,
          path = excluded.path,
          kind = excluded.kind,
          source = 'seed',
          last_seen_at = excluded.last_seen_at,
          updated_at = excluded.updated_at
        where rss_feeds.name is not excluded.name
          or rss_feeds.title is not excluded.title
          or rss_feeds.url is not excluded.url
          or rss_feeds.path is not excluded.path
          or rss_feeds.kind is not excluded.kind
          or rss_feeds.source is not 'seed'`,
      )
      .bind(...bindings)
      .run();
  }
}

export async function listRssFeeds(db: D1Database, filters: RssFeedFilters = {}): Promise<RssFeed[]> {
  const clauses: string[] = [];
  const bindings: unknown[] = [];

  if (!filters.includeDisabled) {
    clauses.push("enabled = 1");
  }
  if (!filters.includeUnverified) {
    clauses.push("verification_status = 'ok'");
  }
  if (filters.kind) {
    clauses.push("kind = ?");
    bindings.push(filters.kind);
  }

  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const result = await db
    .prepare(
      `select
        id,
        kind,
        coalesce(title, name) as title,
        url,
        path,
        source,
        enabled,
        verified_at,
        verification_status,
        http_status,
        last_error,
        first_seen_at,
        last_seen_at,
        discovered_from_url
      from rss_feeds
      ${where}
      order by
        case kind when 'global' then 1 when 'life' then 2 when 'site' then 3 else 4 end,
        id`,
    )
    .bind(...bindings)
    .all<RssFeedRow>();

  return result.results.map(mapRssFeed);
}

export async function updateRssFeedVerifications(db: D1Database, verifications: FeedVerification[]): Promise<void> {
  const statement = db.prepare(
    `update rss_feeds
    set
      enabled = ?,
      verified_at = ?,
      verification_status = ?,
      http_status = ?,
      last_error = ?,
      updated_at = ?
    where id = ?`,
  );

  await db.batch(
    verifications.map((verification) => {
      const status = verificationStatusFromResult(verification.result);
      return statement.bind(
        status === "ok" ? 1 : 0,
        verification.verified_at,
        status,
        verification.result.httpStatus,
        verification.result.status === "ok" ? null : verification.result.error,
        verification.verified_at,
        verification.seed.id,
      );
    }),
  );
}

export async function upsertDiscoveredRssFeeds(db: D1Database, feeds: DiscoveredFeed[]): Promise<void> {
  if (feeds.length === 0) return;

  const statement = db.prepare(
    `insert into rss_feeds (
      id,
      name,
      title,
      url,
      path,
      kind,
      source,
      enabled,
      verification_status,
      first_seen_at,
      last_seen_at,
      discovered_from_url,
      created_at,
      updated_at
    ) values (?, ?, ?, ?, ?, ?, 'discovered', 0, 'unchecked', ?, ?, ?, ?, ?)
    on conflict(id) do update set
      last_seen_at = excluded.last_seen_at,
      discovered_from_url = coalesce(rss_feeds.discovered_from_url, excluded.discovered_from_url),
      updated_at = excluded.updated_at`,
  );

  await db.batch(
    feeds.map((feed) =>
      statement.bind(
        feed.id,
        feed.title,
        feed.title,
        feed.url,
        feed.path,
        feed.kind,
        feed.first_seen_at,
        feed.last_seen_at,
        feed.discovered_from_url,
        feed.last_seen_at,
        feed.last_seen_at,
      ),
    ),
  );
}

export type RssEntryUpsert = {
  id: string;
  feedId: string;
  title: string;
  link: string;
  publishedAt: string | null;
  fetchedAt: string;
  category: string | null;
  tags: string[];
  sourceHash: string;
  canonicalUrl: string | null;
};

export type RssEntryIdentityRow = {
  id: string;
  source_hash: string;
  canonical_url: string | null;
  category: string | null;
  tags_json: string;
};

export async function upsertRssEntries(db: D1Database, entries: RssEntryUpsert[]): Promise<void> {
  if (entries.length === 0) return;
  const existingRows = await findExistingRssEntryIdentities(db, entries);
  const resolvedEntries = resolveRssEntryUpsertIds(entries, existingRows);
  const writePlan = planRssEntryWrites(resolvedEntries, existingRows);

  const entryStatement = db.prepare(
    `insert into rss_entries (
      id,
      feed_id,
      title,
      link,
      published_at,
      fetched_at,
      category,
      tags_json,
      source_hash,
      canonical_url
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(id) do update set
      feed_id = coalesce(rss_entries.feed_id, excluded.feed_id),
      title = excluded.title,
      link = excluded.link,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at,
      category = excluded.category,
      tags_json = excluded.tags_json,
      source_hash = excluded.source_hash,
      canonical_url = excluded.canonical_url
    where rss_entries.source_hash is not excluded.source_hash
      or rss_entries.category is not excluded.category
      or rss_entries.tags_json is not excluded.tags_json
      or rss_entries.canonical_url is not excluded.canonical_url`,
  );
  const entryFeedStatement = db.prepare(
    `insert into rss_entry_feeds (
      entry_id,
      feed_id,
      first_seen_at,
      last_seen_at
    ) values (?, ?, ?, ?)
    on conflict(entry_id, feed_id) do update set
      last_seen_at = excluded.last_seen_at
    where rss_entry_feeds.last_seen_at < ?`,
  );

  await runStatementBatches(
    db,
    [
      ...writePlan.entries.map((entry) =>
        entryStatement.bind(
          entry.id,
          entry.feedId,
          entry.title,
          entry.link,
          entry.publishedAt,
          entry.fetchedAt,
          entry.category,
          JSON.stringify(entry.tags),
          entry.sourceHash,
          entry.canonicalUrl,
        ),
      ),
      ...writePlan.relations.map((entry) => {
        const touchCutoff = new Date(Date.parse(entry.fetchedAt) - RSS_ENTRY_FEED_TOUCH_INTERVAL_MS).toISOString();
        return entryFeedStatement.bind(entry.id, entry.feedId, entry.fetchedAt, entry.fetchedAt, touchCutoff);
      }),
    ],
  );
}

export type RssEntryWritePlan = {
  entries: RssEntryUpsert[];
  relations: RssEntryUpsert[];
};

export function planRssEntryWrites(entries: RssEntryUpsert[], existingRows: RssEntryIdentityRow[]): RssEntryWritePlan {
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const entriesById = new Map<string, RssEntryUpsert>();
  const relationsByKey = new Map<string, RssEntryUpsert>();

  for (const entry of entries) {
    const existing = existingById.get(entry.id);
    const current = entriesById.get(entry.id);

    if (!current || (!needsRssEntryWrite(current, existing) && needsRssEntryWrite(entry, existing))) {
      entriesById.set(entry.id, entry);
    }

    relationsByKey.set(`${entry.id}\u0000${entry.feedId}`, entry);
  }

  return {
    entries: [...entriesById.values()].filter((entry) => needsRssEntryWrite(entry, existingById.get(entry.id))),
    relations: [...relationsByKey.values()],
  };
}

function needsRssEntryWrite(entry: RssEntryUpsert, existing: RssEntryIdentityRow | undefined): boolean {
  if (!existing) return true;
  // sourceHash already covers title, link, and publishedAt; compare derived fields separately.
  return (
    existing.source_hash !== entry.sourceHash ||
    existing.category !== entry.category ||
    existing.tags_json !== JSON.stringify(entry.tags) ||
    existing.canonical_url !== entry.canonicalUrl
  );
}

export function resolveRssEntryUpsertIds(entries: RssEntryUpsert[], existingRows: RssEntryIdentityRow[]): RssEntryUpsert[] {
  const idsBySourceHash = new Map<string, string>();
  const idsByCanonicalUrl = new Map<string, string>();

  for (const row of existingRows) {
    idsBySourceHash.set(row.source_hash, row.id);
    if (row.canonical_url) {
      idsByCanonicalUrl.set(row.canonical_url, row.id);
    }
  }

  return entries.map((entry) => {
    const existingId = idsBySourceHash.get(entry.sourceHash) ?? (entry.canonicalUrl ? idsByCanonicalUrl.get(entry.canonicalUrl) : undefined);
    const id = existingId ?? entry.id;

    idsBySourceHash.set(entry.sourceHash, id);
    if (entry.canonicalUrl) {
      idsByCanonicalUrl.set(entry.canonicalUrl, id);
    }

    return id === entry.id ? entry : { ...entry, id };
  });
}

async function findExistingRssEntryIdentities(db: D1Database, entries: RssEntryUpsert[]): Promise<RssEntryIdentityRow[]> {
  const sourceHashes = unique(entries.map((entry) => entry.sourceHash));
  const canonicalUrls = unique(entries.flatMap((entry) => (entry.canonicalUrl ? [entry.canonicalUrl] : [])));
  const rows: RssEntryIdentityRow[] = [];

  for (const chunk of chunks(sourceHashes, RSS_ENTRY_IDENTITY_LOOKUP_CHUNK_SIZE)) {
    rows.push(...(await selectRssEntryIdentities(db, "source_hash", chunk)));
  }

  for (const chunk of chunks(canonicalUrls, RSS_ENTRY_IDENTITY_LOOKUP_CHUNK_SIZE)) {
    rows.push(...(await selectRssEntryIdentities(db, "canonical_url", chunk)));
  }

  return rows;
}

async function selectRssEntryIdentities(
  db: D1Database,
  column: "source_hash" | "canonical_url",
  values: string[],
): Promise<RssEntryIdentityRow[]> {
  if (values.length === 0) return [];
  const placeholders = values.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `select id, source_hash, canonical_url, category, tags_json from rss_entries where ${column} in (${placeholders})`,
    )
    .bind(...values)
    .all<RssEntryIdentityRow>();
  return result.results;
}

export async function insertRssAuditReport(db: D1Database, report: RssDiscoveryReport): Promise<void> {
  await db
    .prepare(
      `insert into rss_audits (
        generated_at,
        seed_count,
        discovered_count,
        verified_ok_count,
        dead_count,
        parse_error_count,
        report_json
      ) values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      report.generated_at,
      report.seed_count,
      report.discovered_count,
      report.verified_ok_count,
      report.dead_count,
      report.parse_error_count,
      JSON.stringify(report),
    )
    .run();
}

export async function getLatestRssAuditReport(db: D1Database): Promise<RssDiscoveryReport | null> {
  const row = await db.prepare("select report_json from rss_audits order by generated_at desc, id desc limit 1").first<{ report_json: string }>();
  if (!row) return null;
  return JSON.parse(row.report_json) as RssDiscoveryReport;
}

export async function listRecentFetchLogs(db: D1Database, sourceType: string, limit = 10): Promise<FetchLog[]> {
  const result = await db
    .prepare(
      `select
        id,
        source_type,
        source_id,
        status,
        fetched_at,
        records_count,
        error_message
      from fetch_logs
      where source_type = ?
      order by fetched_at desc, id desc
      limit ?`,
    )
    .bind(sourceType, limit)
    .all<FetchLog>();
  return result.results;
}

export async function countTable(
  db: D1Database,
  table: "raw_records" | "places" | "rss_entries" | "rss_feeds" | "record_changes",
): Promise<number> {
  const row = await db.prepare(`select count(*) as count from ${table}`).first<{ count: number }>();
  return row?.count ?? 0;
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

function mapRssFeed(row: RssFeedRow): RssFeed {
  return {
    ...row,
    enabled: row.enabled === 1,
  };
}

async function runStatementBatches(db: D1Database, statements: D1PreparedStatement[], chunkSize = 100): Promise<void> {
  for (let index = 0; index < statements.length; index += chunkSize) {
    await db.batch(statements.slice(index, index + chunkSize));
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
