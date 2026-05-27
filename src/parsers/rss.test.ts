import { describe, expect, it } from "vitest";
import { parseRss } from "./rss";

describe("parseRss", () => {
  it("parses Koriyama RSS 1.0 RDF entries", () => {
    const entries = parseRss(`<?xml version="1.0" encoding="utf-8" ?>
<rdf:RDF xmlns="http://purl.org/rss/1.0/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <channel rdf:about="">
    <title>郡山市役所RSS（新着情報）</title>
  </channel>
  <item rdf:about="https://www.city.koriyama.lg.jp/soshiki/152/124436.html">
    <title>中央公民館学習スペースの開放状況</title>
    <link>https://www.city.koriyama.lg.jp/soshiki/152/124436.html</link>
    <dc:date>2026-05-26T20:00:00+09:00</dc:date>
  </item>
</rdf:RDF>`);

    expect(entries).toEqual([
      {
        title: "中央公民館学習スペースの開放状況",
        link: "https://www.city.koriyama.lg.jp/soshiki/152/124436.html",
        publishedAt: "2026-05-26T20:00:00+09:00",
      },
    ]);
  });
});
