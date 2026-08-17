import { describe, expect, it } from "vitest";
import { KORIYAMA_RSS_FEEDS, rssFeedUrl, type DiscoveredFeed, type FeedVerification } from "../sources/rss";
import {
  findExistingRssEntryFeedRelations,
  planDiscoveredRssFeedWrites,
  planRssFeedVerificationWrites,
  planRssEntryWrites,
  resolveRssEntryUpsertIds,
  updateRssFeedVerifications,
  type DiscoveredRssFeedState,
  type RssEntryIdentityRow,
  type RssEntryUpsert,
} from "./queries";

function entry(input: Partial<RssEntryUpsert> & Pick<RssEntryUpsert, "id" | "sourceHash">): RssEntryUpsert {
  return {
    feedId: "feed-1",
    title: "Entry",
    link: "https://example.com/news/1",
    publishedAt: "2026-06-20T00:00:00.000Z",
    fetchedAt: "2026-06-20T01:00:00.000Z",
    category: null,
    tags: [],
    canonicalUrl: null,
    ...input,
  };
}

function existing(
  input: Partial<RssEntryIdentityRow> & Pick<RssEntryIdentityRow, "id" | "source_hash">,
): RssEntryIdentityRow {
  return {
    canonical_url: null,
    category: null,
    tags_json: "[]",
    ...input,
  };
}

function verification(status: "ok" | "dead" = "ok"): FeedVerification {
  const seed = KORIYAMA_RSS_FEEDS[0];
  return {
    seed,
    url: rssFeedUrl(seed.path),
    verified_at: "2026-08-18T00:00:00.000Z",
    result:
      status === "ok"
        ? { status: "ok", httpStatus: 200, title: seed.title, itemCount: 10 }
        : { status: "dead", httpStatus: 404, error: "HTTP 404" },
  };
}

function discoveredFeed(input: Partial<DiscoveredFeed> = {}): DiscoveredFeed {
  return {
    id: "discovered-1",
    kind: "site",
    title: "Discovered feed",
    url: "https://example.com/feed.xml",
    path: "/feed.xml",
    discovered_from_url: "https://example.com/",
    first_seen_at: "2026-08-17T00:00:00.000Z",
    last_seen_at: "2026-08-18T00:00:00.000Z",
    ...input,
  };
}

function discoveredState(input: Partial<DiscoveredRssFeedState> = {}): DiscoveredRssFeedState {
  return {
    id: "discovered-1",
    name: "Discovered feed",
    title: "Discovered feed",
    url: "https://example.com/feed.xml",
    path: "/feed.xml",
    kind: "site",
    source: "discovered",
    discovered_from_url: "https://example.com/",
    ...input,
  };
}

describe("resolveRssEntryUpsertIds", () => {
  it("reuses an existing id matched by source hash", () => {
    const [resolved] = resolveRssEntryUpsertIds(
      [entry({ id: "rss_new", sourceHash: "same-source-hash", canonicalUrl: "https://example.com/news/1" })],
      [existing({ id: "rss_old", source_hash: "same-source-hash" })],
    );

    expect(resolved?.id).toBe("rss_old");
  });

  it("reuses an existing id matched by canonical URL", () => {
    const [resolved] = resolveRssEntryUpsertIds(
      [entry({ id: "rss_new", sourceHash: "new-source-hash", canonicalUrl: "https://example.com/news/1" })],
      [existing({ id: "rss_existing", source_hash: "old-source-hash", canonical_url: "https://example.com/news/1" })],
    );

    expect(resolved?.id).toBe("rss_existing");
  });

  it("deduplicates entries within the same upsert batch", () => {
    const resolved = resolveRssEntryUpsertIds(
      [
        entry({ id: "rss_first", sourceHash: "same-source-hash" }),
        entry({ id: "rss_second", sourceHash: "same-source-hash", feedId: "feed-2" }),
      ],
      [],
    );

    expect(resolved.map((item) => item.id)).toEqual(["rss_first", "rss_first"]);
  });
});

describe("planRssEntryWrites", () => {
  it("writes one article and one relation per feed when an item is cross-posted", () => {
    const plan = planRssEntryWrites(
      [
        entry({ id: "rss_same", sourceHash: "same-source-hash", feedId: "feed-1" }),
        entry({ id: "rss_same", sourceHash: "same-source-hash", feedId: "feed-2" }),
      ],
      [],
      [],
    );

    expect(plan.entries).toHaveLength(1);
    expect(plan.relations.map((item) => `${item.id}:${item.feedId}`)).toEqual([
      "rss_same:feed-1",
      "rss_same:feed-2",
    ]);
  });

  it("returns no writes for an unchanged article and existing feed relation", () => {
    const plan = planRssEntryWrites(
      [entry({ id: "rss_existing", sourceHash: "same-source-hash", feedId: "feed-1" })],
      [existing({ id: "rss_existing", source_hash: "same-source-hash" })],
      [{ entry_id: "rss_existing", feed_id: "feed-1" }],
    );

    expect(plan.entries).toEqual([]);
    expect(plan.relations).toEqual([]);
  });

  it("writes only a new feed relation when an existing article is cross-posted", () => {
    const plan = planRssEntryWrites(
      [
        entry({ id: "rss_existing", sourceHash: "same-source-hash", feedId: "feed-1" }),
        entry({ id: "rss_existing", sourceHash: "same-source-hash", feedId: "feed-2" }),
      ],
      [existing({ id: "rss_existing", source_hash: "same-source-hash" })],
      [{ entry_id: "rss_existing", feed_id: "feed-1" }],
    );

    expect(plan.entries).toEqual([]);
    expect(plan.relations.map((item) => item.feedId)).toEqual(["feed-2"]);
  });

  it("writes when derived classification changes even if the source hash is unchanged", () => {
    const plan = planRssEntryWrites(
      [entry({ id: "rss_existing", sourceHash: "same-source-hash", tags: ["updated"] })],
      [existing({ id: "rss_existing", source_hash: "same-source-hash" })],
      [{ entry_id: "rss_existing", feed_id: "feed-1" }],
    );

    expect(plan.entries).toHaveLength(1);
  });
});

describe("findExistingRssEntryFeedRelations", () => {
  it("chunks more than 50 IDs without approaching the 100 parameter limit", async () => {
    const queries: Array<{ sql: string; bindings: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...bindings: unknown[]) {
            queries.push({ sql, bindings });
            return {
              async all() {
                return { results: [] };
              },
            };
          },
        };
      },
    } as unknown as D1Database;
    const entryIds = Array.from({ length: 121 }, (_, index) => `rss-${index}`);

    await findExistingRssEntryFeedRelations(db, entryIds);

    expect(queries.map((query) => query.bindings.length)).toEqual([50, 50, 21]);
    expect(queries.every((query) => query.bindings.length <= 100)).toBe(true);
    expect(queries.every((query) => query.sql.includes("from rss_entry_feeds"))).toBe(true);
  });
});

describe("planRssFeedVerificationWrites", () => {
  it("keeps indexed status columns out of an unchanged-status observation", () => {
    const current = verification("ok");
    const plan = planRssFeedVerificationWrites(
      [current],
      [{ id: current.seed.id, enabled: 1, verification_status: "ok" }],
    );

    expect(plan.statusChanges).toEqual([]);
    expect(plan.observations).toHaveLength(1);
  });

  it("writes indexed columns when verification status changes", () => {
    const current = verification("ok");
    const plan = planRssFeedVerificationWrites(
      [current],
      [{ id: current.seed.id, enabled: 0, verification_status: "dead" }],
    );

    expect(plan.statusChanges).toHaveLength(1);
    expect(plan.observations).toEqual([]);
  });

  it("uses a statement without indexed columns when status is unchanged", async () => {
    const current = verification("ok");
    const batches: Array<Array<{ sql: string; bindings: unknown[] }>> = [];
    const db = {
      prepare(sql: string) {
        const prepared = (bindings: unknown[] = []) => ({
          sql,
          bindings,
          bind(...nextBindings: unknown[]) {
            return prepared(nextBindings);
          },
          async all() {
            return {
              results: [{ id: current.seed.id, enabled: 1, verification_status: "ok" }],
            };
          },
        });
        return prepared();
      },
      async batch(statements: D1PreparedStatement[]) {
        batches.push(statements as unknown as Array<{ sql: string; bindings: unknown[] }>);
        return [];
      },
    } as unknown as D1Database;

    await updateRssFeedVerifications(db, [current]);

    const statement = batches[0]?.[0];
    expect(statement?.sql).not.toContain("enabled = ?");
    expect(statement?.sql).not.toContain("verification_status = ?");
    expect(statement?.sql).toContain("verified_at = ?");
  });
});

describe("planDiscoveredRssFeedWrites", () => {
  it("skips an unchanged feed even when it was observed again", () => {
    expect(planDiscoveredRssFeedWrites([discoveredFeed()], [discoveredState()])).toEqual([]);
  });

  it("writes new feeds and material changes", () => {
    const created = discoveredFeed({ id: "discovered-2" });
    const changed = discoveredFeed({ title: "Updated title" });

    expect(planDiscoveredRssFeedWrites([created], [discoveredState()])).toEqual([created]);
    expect(planDiscoveredRssFeedWrites([changed], [discoveredState()])).toEqual([changed]);
  });
});
