export const KORIYAMA_RSS_FEED_URL = "https://www.city.koriyama.lg.jp/rss/10/list1.xml";

export async function fetchRssFeed(url = KORIYAMA_RSS_FEED_URL): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "koriyama-open-data-hub/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }

  return response.text();
}
