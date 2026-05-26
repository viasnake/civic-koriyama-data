import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { toFeatureCollection } from "../geojson/feature";
import { getPlace, listPlaces } from "../db/queries";
import { jsonResponse } from "../constants";
import type { Bindings } from "../types";

const placesQuerySchema = z.object({
  dataset_id: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  bbox: z.string().optional(),
});

export const placeRoutes = new Hono<{ Bindings: Bindings }>();

placeRoutes.get("/", zValidator("query", placesQuerySchema), async (c) => {
  const query = c.req.valid("query");
  return jsonResponse(
    await listPlaces(c.env.DB, {
      datasetId: query.dataset_id,
      category: query.category,
      query: query.q,
      bbox: parseBbox(query.bbox),
    }),
  );
});

placeRoutes.get(".geojson", zValidator("query", placesQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const places = await listPlaces(c.env.DB, {
    datasetId: query.dataset_id,
    category: query.category,
    query: query.q,
    bbox: parseBbox(query.bbox),
  });
  return Response.json(toFeatureCollection(places));
});

placeRoutes.get("/:place_id", async (c) => {
  const place = await getPlace(c.env.DB, c.req.param("place_id"));
  if (!place) return jsonResponse({ error: "place_not_found" }, { status: 404 });
  return jsonResponse(place);
});

function parseBbox(value: string | undefined): [number, number, number, number] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return undefined;
  return parts as [number, number, number, number];
}
