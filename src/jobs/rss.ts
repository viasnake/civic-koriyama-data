import { parseRss } from "../parsers/rss";
import { fetchRssFeed } from "../sources/rss";
import { classifyRssEntry } from "../normalizers/rss";
import { sha256Hex } from "../utils/hash";
import { nowIso, parseDateLike } from "../utils/datetime";
import { insertFetchLog } from "../db/queries";

export async function ingestRss(db: D1Database): Promise<void> {
  const fetchedAt = nowIso();
  const xml = await fetchRssFeed();
  const entries = parseRss(xml);

  for (const entry of entries) {
    const classification = classifyRssEntry(entry.title);
    const sourceHash = await sha256Hex(`${entry.title}|${entry.link}|${entry.publishedAt ?? ""}`);
    const id = `rss_${sourceHash.slice(0, 16)}`;

    await db
      .prepare(
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
      )
      .bind(
        id,
        "koriyama_city",
        entry.title,
        entry.link,
        parseDateLike(entry.publishedAt),
        fetchedAt,
        classification.category,
        JSON.stringify(classification.tags),
        sourceHash,
      )
      .run();
  }

  await insertFetchLog(db, {
    sourceType: "rss",
    sourceId: "koriyama_city",
    status: "ok",
    fetchedAt,
    recordsCount: entries.length,
  });
}
