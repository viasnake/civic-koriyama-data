import { describe, expect, it } from "vitest";
import { findDataset } from "../db/catalog";
import { normalizePlace } from "./place";

describe("normalizePlace", () => {
  it("creates a stable place with valid coordinates", async () => {
    const dataset = findDataset("aed");
    expect(dataset).toBeDefined();

    const place = await normalizePlace({
      dataset: dataset!,
      fetchedAt: "2026-05-25T00:00:00.000Z",
      row: {
        施設名: "郡山市役所",
        住所: "福島県郡山市朝日一丁目23-7",
        緯度: "37.400",
        経度: "140.360",
      },
    });

    expect(place?.id).toMatch(/^place_aed_/);
    expect(place?.lat).toBe(37.4);
    expect(place?.lng).toBe(140.36);
    expect(place?.warnings).toEqual([]);
  });

  it("removes out-of-range coordinates from GeoJSON candidates", async () => {
    const dataset = findDataset("aed");
    const place = await normalizePlace({
      dataset: dataset!,
      fetchedAt: "2026-05-25T00:00:00.000Z",
      row: {
        施設名: "範囲外",
        緯度: "10",
        経度: "10",
      },
    });

    expect(place?.lat).toBeNull();
    expect(place?.lng).toBeNull();
    expect(place?.warnings).toContain("invalid_coordinate");
  });
});
