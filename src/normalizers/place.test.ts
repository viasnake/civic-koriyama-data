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

  it("reads the current index-page schema", async () => {
    const dataset = findDataset("aed");
    const place = await normalizePlace({
      dataset: dataset!,
      fetchedAt: "2026-10-08T00:00:00.000Z",
      row: {
        名称: "郡山市役所",
        所在地_連結表記: "福島県郡山市朝日一丁目23-7",
        電話番号: "024-924-2111",
      },
    });

    expect(place?.name).toBe("郡山市役所");
    expect(place?.address).toBe("福島県郡山市朝日一丁目23-7");
    expect(place?.phone).toBe("024-924-2111");
  });

  it("reads the school schema with split address fields", async () => {
    const dataset = findDataset("schools");
    const place = await normalizePlace({
      dataset: dataset!,
      fetchedAt: "2026-10-08T00:00:00.000Z",
      row: {
        教育機関_学校名: "日和田小学校",
        "教育機関_学校所在地（市区町村）": "郡山市",
        "教育機関_学校所在地（町字）": "日和田町字日向",
        "教育機関_学校所在地（番地以下）": "19",
        教育機関_緯度: "37.447371",
        教育機関_経度: "140.394107",
        教育機関_連絡先電話番号: "(024)958-5493",
      },
    });

    expect(place?.name).toBe("日和田小学校");
    expect(place?.address).toBe("郡山市日和田町字日向19");
    expect(place?.lat).toBe(37.447371);
    expect(place?.lng).toBe(140.394107);
    expect(place?.phone).toBe("(024)958-5493");
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
