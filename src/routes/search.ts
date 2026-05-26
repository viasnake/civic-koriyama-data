import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { listPlaces } from "../db/queries";
import { jsonResponse } from "../constants";
import type { Bindings } from "../types";

export const searchRoutes = new Hono<{ Bindings: Bindings }>();

searchRoutes.get("/", zValidator("query", z.object({ q: z.string().min(1) })), async (c) => {
  const { q } = c.req.valid("query");
  const places = await listPlaces(c.env.DB, { query: q });
  return jsonResponse({ places });
});
