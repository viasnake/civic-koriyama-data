import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getLatestRssAuditReport, listRssEntries, listRssFeeds } from "../db/queries";
import { jsonResponse } from "../constants";
import type { Bindings, RssEntry, RssEntryResponse, RssFeed, RssFeedKind, RssFeedResponse } from "../types";
import { parseJsonArray } from "../utils/json";
import { parsePagination } from "../utils/pagination";

export const rssRoutes = new Hono<{ Bindings: Bindings }>();

const rssFeedKindSchema = z.enum(["global", "life", "site"]);

rssRoutes.get(
  "/feeds",
  zValidator(
    "query",
    z.object({
      include_disabled: z.string().optional(),
      include_unverified: z.string().optional(),
      kind: rssFeedKindSchema.optional(),
    }),
  ),
  async (c) => {
    const query = c.req.valid("query");
    const feeds = await listRssFeeds(c.env.DB, {
      includeDisabled: isTrue(query.include_disabled),
      includeUnverified: isTrue(query.include_unverified),
      kind: query.kind,
    });

    return jsonResponse(
      { feeds: feeds.map(toRssFeedResponse) },
      undefined,
      {
        resultCount: feeds.length,
      },
    );
  },
);

rssRoutes.get("/audit", async (c) => {
  const report = await getLatestRssAuditReport(c.env.DB);
  if (!report) {
    return jsonResponse({ error: "rss_audit_not_found" }, { status: 404 });
  }
  return jsonResponse(report);
});

rssRoutes.get(
  "/entries",
  zValidator(
    "query",
    z.object({
      category: z.string().optional(),
      feed_id: z.string().optional(),
      kind: rssFeedKindSchema.optional(),
      since: z.string().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    }),
  ),
  async (c) => {
    const query = c.req.valid("query");
    const pagination = parsePagination(query, 100);
    const entries = await listRssEntries(c.env.DB, {
      category: query.category,
      feedId: query.feed_id,
      kind: query.kind,
      since: query.since,
      ...pagination,
    });
    return jsonResponse(entries.map(toRssEntryResponse), undefined, pagination);
  },
);

function toRssFeedResponse(feed: RssFeed): RssFeedResponse {
  return {
    id: feed.id,
    kind: feed.kind,
    title: feed.title,
    url: feed.url,
    enabled: feed.enabled,
    verification_status: feed.verification_status,
    verified_at: feed.verified_at,
  };
}

function toRssEntryResponse(entry: RssEntry): RssEntryResponse {
  const { tags_json, feed_ids, feed_kinds, ...response } = entry;
  return {
    ...response,
    feed_ids: parseCsv(feed_ids),
    feed_kinds: parseCsv(feed_kinds).filter(isRssFeedKind),
    tags: parseTags(tags_json),
  };
}

function parseTags(value: string): string[] {
  return parseJsonArray(value).filter((tag): tag is string => typeof tag === "string");
}

function parseCsv(value: string | null | undefined): string[] {
  return value?.split(",").filter((item) => item.trim() !== "") ?? [];
}

function isTrue(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function isRssFeedKind(value: string): value is RssFeedKind {
  return value === "global" || value === "life" || value === "site" || value === "organization" || value === "unknown";
}
