import { describe, expect, it } from "vitest";
import { findDataset } from "./catalog";

describe("dataset catalog source metadata", () => {
  it("points CSV-backed datasets to the current public facilities page", () => {
    const dataset = findDataset("aed");

    expect(dataset?.source_page_url).toBe("https://www.city.koriyama.lg.jp/soshiki/21/176727.html");
    expect(dataset?.source_files).toContainEqual(
      expect.objectContaining({
        label: "AED設置施設",
        url: "https://www.city.koriyama.lg.jp/uploaded/attachment/1727.csv",
        file_type: "csv",
        encoding: "shift_jis",
        normalize: true,
      }),
    );
  });

  it("keeps shapefile-only disaster sources visible but not normalized", () => {
    const dataset = findDataset("shelters");

    expect(dataset?.source_page).toBe("opendata_disaster");
    expect(dataset?.source_page_url).toBe("https://www.city.koriyama.lg.jp/soshiki/21/176726.html");
    expect(dataset?.format).toBe("zip");
    expect(dataset?.source_files?.[0]).toEqual(
      expect.objectContaining({
        label: "指定避難場所",
        file_type: "zip",
        normalize: false,
        warnings: ["unsupported_shapefile_zip"],
      }),
    );
  });
});
