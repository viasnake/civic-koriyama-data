import { describe, expect, it } from "vitest";
import {
  planRssEntryWrites,
  resolveRssEntryUpsertIds,
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
    );

    expect(plan.entries).toHaveLength(1);
    expect(plan.relations.map((item) => `${item.id}:${item.feedId}`)).toEqual([
      "rss_same:feed-1",
      "rss_same:feed-2",
    ]);
  });

  it("skips an unchanged article while retaining its feed relation", () => {
    const plan = planRssEntryWrites(
      [entry({ id: "rss_existing", sourceHash: "same-source-hash", feedId: "feed-1" })],
      [existing({ id: "rss_existing", source_hash: "same-source-hash" })],
    );

    expect(plan.entries).toEqual([]);
    expect(plan.relations).toHaveLength(1);
  });

  it("writes when derived classification changes even if the source hash is unchanged", () => {
    const plan = planRssEntryWrites(
      [entry({ id: "rss_existing", sourceHash: "same-source-hash", tags: ["updated"] })],
      [existing({ id: "rss_existing", source_hash: "same-source-hash" })],
    );

    expect(plan.entries).toHaveLength(1);
  });
});
