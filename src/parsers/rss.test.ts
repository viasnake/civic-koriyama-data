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
        sourceCategories: [],
      },
    ]);
  });

  it("extracts Koriyama RSS source categories", () => {
    const entries = parseRss(`<?xml version="1.0" encoding="utf-8" ?>
<rdf:RDF xmlns="http://purl.org/rss/1.0/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:nc="http://www.netcrew.co.jp/rss/1.0/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <item rdf:about="https://www.city.koriyama.lg.jp/example.html">
    <title>保育所のお知らせ</title>
    <link>https://www.city.koriyama.lg.jp/example.html</link>
    <dc:date>2026-05-26T20:00:00+09:00</dc:date>
    <dc:subject>保育課</dc:subject>
    <nc:category01>子育て</nc:category01>
    <nc:category02>保育所</nc:category02>
    <nc:category03>子育て・教育</nc:category03>
  </item>
</rdf:RDF>`);

    expect(entries[0]?.sourceCategories).toEqual(["保育課", "子育て", "保育所", "子育て・教育"]);
  });
});
