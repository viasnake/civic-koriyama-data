import { XMLParser } from "fast-xml-parser";

export type ParsedRssEntry = {
  title: string;
  link: string;
  publishedAt: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

export function parseRss(xml: string): ParsedRssEntry[] {
  const document = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown[] | unknown } };
    feed?: { entry?: unknown[] | unknown };
  };

  const items = normalizeArray(document.rss?.channel?.item ?? document.feed?.entry);

  return items.flatMap((item) => {
    if (!isRecord(item)) return [];
    const title = textValue(item.title);
    const link = textValue(item.link);
    if (!title || !link) return [];

    return [
      {
        title,
        link,
        publishedAt: textValue(item.pubDate ?? item.published ?? item.updated),
      },
    ];
  });
}

function normalizeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value["#text"] === "string") return value["#text"];
  if (isRecord(value) && typeof value["@_href"] === "string") return value["@_href"];
  return null;
}
