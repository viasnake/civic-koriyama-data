import { parseRss } from "../parsers/rss";
import { fetchRssFeed } from "../sources/rss";
import { classifyRssEntry } from "../normalizers/rss";
import { sha256Hex } from "../utils/hash";
import { nowIso, parseDateLike } from "../utils/datetime";
import { insertFetchLog } from "../db/queries";

export async function ingestRss(db: D1Database): Promise<void> {
  const fetchedAt = nowIso();
  try {
    const xml = await fetchRssFeed();
    const entries = parseRss(xml);

    if (entries.length === 0) {
      throw new Error("RSS feed parsed zero entries");
    }

    const statement = db.prepare(
      `insert into rss_entries (
        id,
        feed_id,
        title,
        link,
        published_at,
        fetched_at,
        category,
        tags_json,
        source_hash
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        title = excluded.title,
        link = excluded.link,
        published_at = excluded.published_at,
        fetched_at = excluded.fetched_at,
        category = excluded.category,
        tags_json = excluded.tags_json,
        source_hash = excluded.source_hash`,
    );

    await db.batch(
      await Promise.all(
        entries.map(async (entry) => {
          const classification = classifyRssEntry(entry.title, entry.sourceCategories);
          const sourceHash = await sha256Hex(`${entry.title}|${entry.link}|${entry.publishedAt ?? ""}`);
          const id = `rss_${sourceHash.slice(0, 16)}`;

          return statement.bind(
            id,
            "koriyama_city",
            entry.title,
            entry.link,
            parseDateLike(entry.publishedAt),
            fetchedAt,
            classification.category,
            JSON.stringify(classification.tags),
            sourceHash,
          );
        }),
      ),
    );

    await insertFetchLog(db, {
      sourceType: "rss",
      sourceId: "koriyama_city",
      status: "ok",
      fetchedAt,
      recordsCount: entries.length,
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
