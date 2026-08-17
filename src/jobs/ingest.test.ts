import { describe, expect, it } from "vitest";
import type { Place, RawRecord } from "../types";
import { planPlaceWrites, planRawRecordWrites } from "./ingest";

function rawRecord(input: Partial<RawRecord> = {}): RawRecord {
  return {
    id: "raw-1",
    dataset_id: "dataset-1",
    source_record_key: "source.csv:1",
    source_row_hash: "row-hash",
    raw_json: '{"name":"Place"}',
    fetched_at: "2026-08-17T00:00:00.000Z",
    ...input,
  };
}

function place(input: Partial<Place> = {}): Place {
  return {
    id: "place-1",
    dataset_id: "dataset-1",
    name: "Place",
    category: "public_facility",
    subcategory: "library",
    address: "郡山市朝日一丁目",
    lat: 37.4,
    lng: 140.3,
    phone: "024-000-0000",
    fax: null,
    email: "place@example.com",
    official_url: "https://example.com/place",
    source_url: "https://example.com/source.csv",
    source_record_hash: "row-hash",
    attributes_json: '{"access":"bus"}',
    first_seen_at: "2026-08-16T00:00:00.000Z",
    last_seen_at: "2026-08-17T00:00:00.000Z",
    deleted_at: null,
    ...input,
  };
}

describe("planRawRecordWrites", () => {
  it("returns no writes when only fetched_at changed", () => {
    const before = rawRecord();
    const current = rawRecord({ fetched_at: "2026-08-18T00:00:00.000Z" });

    expect(planRawRecordWrites([current], new Map([[before.id, before]]))).toEqual({ writes: [], changes: [] });
  });

  it("writes new and materially changed records with matching change records", () => {
    const before = rawRecord();
    const changed = rawRecord({ raw_json: '{"name":"Updated"}', source_row_hash: "new-row-hash" });
    const created = rawRecord({ id: "raw-2", source_record_key: "source.csv:2" });
    const plan = planRawRecordWrites([changed, created], new Map([[before.id, before]]));

    expect(plan.writes).toEqual([changed, created]);
    expect(plan.changes.map((change) => change.changeType)).toEqual(["raw_updated", "raw_created"]);
  });
});

describe("planPlaceWrites", () => {
  it("returns no writes when only observation timestamps changed", () => {
    const before = place();
    const current = place({
      first_seen_at: "2026-08-18T00:00:00.000Z",
      last_seen_at: "2026-08-18T00:00:00.000Z",
    });

    expect(planPlaceWrites([current], new Map([[before.id, before]]))).toEqual({ writes: [], changes: [] });
  });

  it("writes a new place", () => {
    const current = place();
    const plan = planPlaceWrites([current], new Map());

    expect(plan.writes).toEqual([current]);
    expect(plan.changes[0]?.changeType).toBe("place_created");
  });

  it("writes when normalization output changes without a source hash change", () => {
    const before = place();
    const current = place({ category: "education", attributes_json: '{"access":"train"}' });
    const plan = planPlaceWrites([current], new Map([[before.id, before]]));

    expect(plan.writes).toHaveLength(1);
    expect(plan.changes[0]?.changeType).toBe("place_updated");
  });

  it.each([
    ["dataset", { dataset_id: "dataset-2" }],
    ["name", { name: "Updated Place" }],
    ["category", { category: "education" }],
    ["subcategory", { subcategory: "museum" }],
    ["address", { address: "郡山市駅前一丁目" }],
    ["latitude", { lat: 37.5 }],
    ["longitude", { lng: 140.4 }],
    ["phone", { phone: "024-111-1111" }],
    ["fax", { fax: "024-222-2222" }],
    ["email", { email: "updated@example.com" }],
    ["official URL", { official_url: "https://example.com/updated" }],
    ["source URL", { source_url: "https://example.com/updated.csv" }],
    ["source hash", { source_record_hash: "updated-row-hash" }],
    ["attributes", { attributes_json: '{"access":"train"}' }],
  ] satisfies Array<[string, Partial<Place>]>)("writes when %s changes", (_field, update) => {
    const before = place();
    const current = place(update);

    expect(planPlaceWrites([current], new Map([[before.id, before]])).writes).toEqual([current]);
  });

  it("restores a deleted place", () => {
    const before = place({ deleted_at: "2026-08-17T12:00:00.000Z" });
    const current = place({ last_seen_at: "2026-08-18T00:00:00.000Z" });
    const plan = planPlaceWrites([current], new Map([[before.id, before]]));

    expect(plan.writes[0]?.deleted_at).toBeNull();
    expect(plan.changes[0]?.changeType).toBe("place_updated");
  });

  it("preserves first_seen_at when updating an existing place", () => {
    const before = place({ first_seen_at: "2026-01-01T00:00:00.000Z" });
    const current = place({ name: "Updated Place", first_seen_at: "2026-08-18T00:00:00.000Z" });
    const plan = planPlaceWrites([current], new Map([[before.id, before]]));

    expect(plan.writes[0]?.first_seen_at).toBe(before.first_seen_at);
    expect(JSON.parse(plan.changes[0]?.afterJson ?? "{}").first_seen_at).toBe(before.first_seen_at);
  });
});
