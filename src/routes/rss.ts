import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { listRssEntries } from "../db/queries";
import { jsonResponse } from "../constants";
import type { Bindings } from "../types";

export const rssRoutes = new Hono<{ Bindings: Bindings }>();

rssRoutes.get("/entries", zValidator("query", z.object({ category: z.string().optional() })), async (c) => {
  const { category } = c.req.valid("query");
  return jsonResponse(await listRssEntries(c.env.DB, category));
});
