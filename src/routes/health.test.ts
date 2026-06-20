import { describe, expect, it } from "vitest";
import { hasCurrentFetchError, toPublicFetchLog } from "./health";

describe("hasCurrentFetchError", () => {
  it("ignores older errors after a newer successful fetch", () => {
    expect(
      hasCurrentFetchError([
        { status: "ok", fetched_at: "2026-06-20T15:25:26.390Z" },
        { status: "error", fetched_at: "2026-06-20T15:21:47.167Z" },
      ]),
    ).toBe(false);
  });

  it("flags errors in the latest fetch group", () => {
    expect(
      hasCurrentFetchError([
        { status: "ok", fetched_at: "2026-06-20T18:00:28.162Z" },
        { status: "error", fetched_at: "2026-06-20T18:00:28.162Z" },
        { status: "ok", fetched_at: "2026-06-19T18:00:28.162Z" },
      ]),
    ).toBe(true);
  });
});

describe("toPublicFetchLog", () => {
  it("omits internal error details", () => {
    const log = toPublicFetchLog({
      id: 1,
      source_type: "rss",
      source_id: "koriyama_city",
      status: "error",
      fetched_at: "2026-06-20T15:21:47.167Z",
      records_count: 0,
      error_message: "D1_ERROR: too many SQL variables at offset 856: SQLITE_ERROR",
    });

    expect(log).toMatchObject({
      id: 1,
      status: "error",
    });
    expect(log).not.toHaveProperty("error_message");
  });
});
