import { describe, expect, it } from "vitest";
import { toFeature, toFeatureCollection } from "./feature";
import type { Place } from "../types";

const basePlace: Place = {
  id: "place_aed_test",
  dataset_id: "aed",
  name: "郡山市役所",
  category: "safety",
  subcategory: "aed",
  address: null,
  lat: 37.4,
  lng: 140.36,
  phone: null,
  fax: null,
  email: null,
  official_url: null,
  source_url: null,
  source_record_hash: "hash",
  attributes_json: "{}",
  first_seen_at: "2026-05-25T00:00:00.000Z",
  last_seen_at: "2026-05-25T00:00:00.000Z",
  deleted_at: null,
};

describe("GeoJSON feature helpers", () => {
  it("maps lng/lat in GeoJSON coordinate order", () => {
    expect(toFeature(basePlace)?.geometry.coordinates).toEqual([140.36, 37.4]);
  });

  it("omits places without complete coordinates", () => {
    const collection = toFeatureCollection([{ ...basePlace, lat: null }]);
    expect(collection.features).toEqual([]);
  });
});
