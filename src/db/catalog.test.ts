import { describe, expect, it } from "vitest";
import { findDataset } from "./catalog";

describe("dataset catalog source metadata", () => {
  it("points CSV-backed datasets to files on the open data index page", () => {
    const dataset = findDataset("aed");

    expect(dataset?.source_page_url).toBe("https://www.city.koriyama.lg.jp/soshiki/21/176730.html");
    expect(dataset?.source_files).toContainEqual(
      expect.objectContaining({
        label: "AED設置個所一覧",
        url: "https://www.city.koriyama.lg.jp/uploaded/life/192867_453615_misc.csv",
        file_type: "csv",
        encoding: "utf-8",
        normalize: true,
      }),
    );
  });

  it("ingests the disaster shelter CSV published on the index page", () => {
    const dataset = findDataset("shelters");

    expect(dataset?.source_page).toBe("opendata_index");
    expect(dataset?.source_page_url).toBe("https://www.city.koriyama.lg.jp/soshiki/21/176730.html");
    expect(dataset?.format).toBe("csv");
    expect(dataset?.source_files?.[0]).toEqual(
      expect.objectContaining({
        label: "指定緊急避難場所一覧",
        url: "https://www.city.koriyama.lg.jp/uploaded/life/192867_453611_misc.csv",
        file_type: "csv",
        normalize: true,
      }),
    );
  });

  it("keeps the shift_jis-encoded school list", () => {
    const dataset = findDataset("schools");

    expect(dataset?.source_files?.[0]).toEqual(
      expect.objectContaining({
        label: "学校一覧",
        url: "https://www.city.koriyama.lg.jp/uploaded/life/192867_453625_misc.csv",
        file_type: "csv",
        encoding: "shift_jis",
        normalize: true,
      }),
    );
  });
});
