import { Hono } from "hono";
import { jsonResponse } from "../constants";
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

  return jsonResponse({
    status: "ok",
    datasets: {
      total: datasetSummary?.total ?? 0,
      enabled: datasetSummary?.enabled ?? 0,
      last_success_at: lastOpenDataFetch?.fetched_at ?? null,
      failed: [],
    },
    rss: {
      last_success_at: lastRssFetch?.fetched_at ?? null,
    },
  });
});
