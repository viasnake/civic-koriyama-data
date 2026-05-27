import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { listRssEntries } from "../db/queries";
import { jsonResponse } from "../constants";
import type { Bindings, RssEntry, RssEntryResponse } from "../types";

export const rssRoutes = new Hono<{ Bindings: Bindings }>();

rssRoutes.get("/entries", zValidator("query", z.object({ category: z.string().optional() })), async (c) => {
  const { category } = c.req.valid("query");
  const entries = await listRssEntries(c.env.DB, category);
  return jsonResponse(entries.map(toRssEntryResponse));
});

function toRssEntryResponse(entry: RssEntry): RssEntryResponse {
  return {
    ...entry,
    tags: parseTags(entry.tags_json),
  };
}

function parseTags(value: string): string[] {
  try {
    const tags = JSON.parse(value) as unknown;
    return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}
