import { parseRss } from "../parsers/rss";
import { createRssDiscoveryReport, discoverRssFeeds, fetchRssFeed, verifySeedFeeds } from "../sources/rss";
import { classifyRssEntry } from "../normalizers/rss";
import { sha256Hex } from "../utils/hash";
import { nowIso, parseDateLike } from "../utils/datetime";
import {
  insertFetchLog,
  insertRssAuditReport,
  listRssFeeds,
  syncSeedRssFeeds,
  updateRssFeedVerifications,
  upsertDiscoveredRssFeeds,
  upsertRssEntries,
  type RssEntryUpsert,
} from "../db/queries";
import type { RssFeed } from "../types";

export const RSS_FEED_FETCHES_PER_INVOCATION = 40;

type IngestRssOptions = {
  maxFeeds?: number;
  now?: string;
  scheduledAt?: Date;
};

export async function ingestRss(db: D1Database, options: IngestRssOptions = {}): Promise<void> {
  const fetchedAt = options.now ?? nowIso();
  const scheduledAt = options.scheduledAt ?? new Date(fetchedAt);
  try {
    let feeds = await listRssFeeds(db);

    if (feeds.length === 0) {
      feeds = await listRssFeeds(db, { includeUnverified: true });
    }

    if (feeds.length === 0) {
      throw new Error("No verified RSS feeds are enabled");
    }

    const feedsToFetch = selectRssFeedsForIngestion(feeds, scheduledAt, options.maxFeeds ?? RSS_FEED_FETCHES_PER_INVOCATION);
    const upserts: RssEntryUpsert[] = [];
    const errors: string[] = [];
    let successfulFeeds = 0;

    for (const feed of feedsToFetch) {
      try {
        const xml = await fetchRssFeed(feed.url);
        const entries = parseRss(xml);
        successfulFeeds += 1;

        upserts.push(
          ...(await Promise.all(
            entries.map(async (entry) => {
              const canonicalUrl = canonicalizeUrl(entry.link);
              const sourceHash = await sha256Hex(`${entry.title}|${entry.link}|${entry.publishedAt ?? ""}`);
              const idSource = canonicalUrl ?? sourceHash;
              const id = `rss_${(await sha256Hex(idSource)).slice(0, 16)}`;
              const classification = classifyRssEntry(entry.title, entry.sourceCategories);

              return {
                id,
                feedId: feed.id,
                title: entry.title,
                link: entry.link,
                publishedAt: parseDateLike(entry.publishedAt),
                fetchedAt,
                category: classification.category,
                tags: classification.tags,
                sourceHash,
                canonicalUrl,
              };
            }),
          )),
        );
      } catch (error) {
        errors.push(`${feed.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (successfulFeeds === 0) {
      throw new Error(
        errors.length > 0
          ? `RSS fetch failed for selected feeds (${feedsToFetch.length}/${feeds.length}): ${errors.join("; ")}`
          : "RSS feeds parsed zero entries",
      );
    }

    if (upserts.length > 0) {
      await upsertRssEntries(db, upserts);
    }

    await insertFetchLog(db, {
      sourceType: "rss",
      sourceId: "koriyama_city",
      status: errors.length > 0 ? "partial" : "ok",
      fetchedAt,
      recordsCount: upserts.length,
      errorMessage: errors.length > 0 ? `feeds=${feedsToFetch.length}/${feeds.length}; ${errors.join("; ")}` : undefined,
    });
  } catch (error) {
    await insertFetchLog(db, {
      sourceType: "rss",
      sourceId: "koriyama_city",
      status: "error",
      fetchedAt,
      recordsCount: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function selectRssFeedsForIngestion(
  feeds: readonly RssFeed[],
  scheduledAt: Date,
  maxFeeds = RSS_FEED_FETCHES_PER_INVOCATION,
): RssFeed[] {
  if (maxFeeds <= 0) return [];
  if (feeds.length <= maxFeeds) return [...feeds];

  const batchCount = Math.ceil(feeds.length / maxFeeds);
  const hourIndex = Math.floor(scheduledAt.getTime() / 3_600_000);
  const batchIndex = positiveModulo(hourIndex, batchCount);
  const start = batchIndex * maxFeeds;
  return feeds.slice(start, start + maxFeeds);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export async function auditRssRegistry(db: D1Database): Promise<void> {
  const generatedAt = nowIso();
  try {
    await syncSeedRssFeeds(db, generatedAt);
    const [verifications, discovery] = await Promise.all([
      verifySeedFeeds(undefined, generatedAt),
      discoverRssFeeds({ now: generatedAt }),
    ]);
    const report = createRssDiscoveryReport(verifications, discovery, generatedAt);

    await updateRssFeedVerifications(db, verifications);
    await upsertDiscoveredRssFeeds(db, discovery.feeds);
    await insertRssAuditReport(db, report);

    await insertFetchLog(db, {
      sourceType: "rss_audit",
      sourceId: "koriyama_city",
      status:
        report.dead_seed_feeds.length > 0 || report.parse_error_seed_feeds.length > 0 || report.missing_from_seed.length > 0
          ? "warning"
          : "ok",
      fetchedAt: generatedAt,
      recordsCount: report.verified_ok_count,
      errorMessage:
        report.dead_seed_feeds.length > 0 || report.parse_error_seed_feeds.length > 0 || report.missing_from_seed.length > 0
          ? `dead=${report.dead_seed_feeds.length}; parse_error=${report.parse_error_seed_feeds.length}; missing=${report.missing_from_seed.length}`
          : undefined,
    });
  } catch (error) {
    await insertFetchLog(db, {
      sourceType: "rss_audit",
      sourceId: "koriyama_city",
      status: "error",
      fetchedAt: generatedAt,
      recordsCount: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function canonicalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
