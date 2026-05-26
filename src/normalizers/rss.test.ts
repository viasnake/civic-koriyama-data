import { describe, expect, it } from "vitest";
import { classifyRssEntry } from "./rss";

describe("classifyRssEntry", () => {
  it("classifies childcare titles", () => {
    expect(classifyRssEntry("子育て講座の参加者募集")).toEqual({
      category: "childcare",
      tags: ["子育て"],
    });
  });

  it("returns null for unknown titles", () => {
    expect(classifyRssEntry("通常のお知らせ")).toEqual({
      category: null,
      tags: [],
    });
  });
});
