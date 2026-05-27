import { Hono } from "hono";
import { cors } from "hono/cors";
import { CORS_HEADERS, jsonResponse } from "./constants";
import { changeRoutes } from "./routes/changes";
import { datasetRoutes } from "./routes/datasets";
import { healthRoutes } from "./routes/health";
import { placeRoutes, placesGeoJsonResponse } from "./routes/places";
import { rssRoutes } from "./routes/rss";
import { searchRoutes } from "./routes/search";
import { countTable } from "./db/queries";
import { ingestOpenData } from "./jobs/ingest";
import { ingestRss } from "./jobs/rss";
import type { Bindings } from "./types";

const OPEN_DATA_INGEST_UTC_HOUR = 18;

export const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
  }),
);

app.options("*", () => new Response(null, { headers: CORS_HEADERS }));

app.get("/", () =>
  jsonResponse({
    name: "Koriyama Open Data Hub",
    description:
      "Unofficial API for Koriyama City open data, RSS entries, places, and GeoJSON.",
    api_base_path: "/api/v2",
    endpoints: [
      "/api/v2/health",
      "/api/v2/datasets",
      "/api/v2/places",
      "/api/v2/places.geojson",
      "/api/v2/search?q=",
      "/api/v2/changes",
      "/api/v2/rss/entries",
    ],
  }),
);

const api = new Hono<{ Bindings: Bindings }>();
api.route("/health", healthRoutes);
api.route("/datasets", datasetRoutes);
api.get("/places.geojson", async (c) =>
  placesGeoJsonResponse(c.env.DB, {
    dataset_id: c.req.query("dataset_id"),
    category: c.req.query("category"),
    q: c.req.query("q"),
    bbox: c.req.query("bbox"),
  }),
);
api.route("/places", placeRoutes);
api.route("/search", searchRoutes);
api.route("/rss", rssRoutes);
api.route("/changes", changeRoutes);

app.route("/api/v2", api);

app.notFound(() => jsonResponse({ error: "not_found" }, { status: 404 }));

export function shouldIngestOpenData(scheduledAt: Date): boolean {
  return scheduledAt.getUTCHours() === OPEN_DATA_INGEST_UTC_HOUR;
}

async function shouldSelfHealOpenData(db: D1Database): Promise<boolean> {
  const [rawRecordsCount, placesCount] = await Promise.all([countTable(db, "raw_records"), countTable(db, "places")]);
  return rawRecordsCount === 0 || placesCount === 0;
}

async function runScheduledJobs(event: ScheduledEvent, env: Bindings): Promise<void> {
  const failures: unknown[] = [];

  try {
    await ingestRss(env.DB);
  } catch (error) {
    failures.push(error);
  }

  if (shouldIngestOpenData(new Date(event.scheduledTime)) || (await shouldSelfHealOpenData(env.DB))) {
    try {
      await ingestOpenData(env.DB);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw failures[0];
  }
}

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledJobs(event, env));
  },
};
