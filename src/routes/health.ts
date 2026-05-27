import { Hono } from "hono";
import { jsonResponse } from "../constants";
import { countTable, listRecentFetchLogs } from "../db/queries";
import type { Bindings } from "../types";

export const healthRoutes = new Hono<{ Bindings: Bindings }>();

healthRoutes.get("/", async (c) => {
  const datasetSummary = await c.env.DB.prepare(
    `select
      count(*) as total,
      sum(case when enabled = 1 then 1 else 0 end) as enabled
    from datasets`,
  ).first<{ total: number; enabled: number | null }>();

  const lastOpenDataFetch = await c.env.DB.prepare(
    "select fetched_at from fetch_logs where source_type = 'opendata' and status in ('ok', 'catalog_seeded') order by fetched_at desc limit 1",
  ).first<{ fetched_at: string }>();

  const lastRssFetch = await c.env.DB.prepare(
    "select fetched_at from fetch_logs where source_type = 'rss' and status = 'ok' order by fetched_at desc limit 1",
  ).first<{ fetched_at: string }>();

  const [rawRecordsCount, placesCount, rssEntriesCount, recordChangesCount, recentOpenDataFetches, recentRssFetches] =
    await Promise.all([
      countTable(c.env.DB, "raw_records"),
      countTable(c.env.DB, "places"),
      countTable(c.env.DB, "rss_entries"),
      countTable(c.env.DB, "record_changes"),
      listRecentFetchLogs(c.env.DB, "opendata", 10),
      listRecentFetchLogs(c.env.DB, "rss", 10),
    ]);
  const failedOpenDataFetches = recentOpenDataFetches.filter((log) => log.status === "error");
  const failedRssFetches = recentRssFetches.filter((log) => log.status === "error");
  const status = failedOpenDataFetches.length > 0 || failedRssFetches.length > 0 || rawRecordsCount === 0 || placesCount === 0 ? "degraded" : "ok";

  return jsonResponse({
    status,
    datasets: {
      total: datasetSummary?.total ?? 0,
      enabled: datasetSummary?.enabled ?? 0,
      last_success_at: lastOpenDataFetch?.fetched_at ?? null,
      raw_records_count: rawRecordsCount,
      places_count: placesCount,
      record_changes_count: recordChangesCount,
      recent_fetches: recentOpenDataFetches,
      failed: failedOpenDataFetches,
    },
    rss: {
      last_success_at: lastRssFetch?.fetched_at ?? null,
      entries_count: rssEntriesCount,
      recent_fetches: recentRssFetches,
      failed: failedRssFetches,
    },
  });
});
