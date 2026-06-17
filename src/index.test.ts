import { describe, expect, it } from "vitest";
import { PUBLIC_API_ENDPOINT } from "./constants";
import { app, shouldIngestOpenData } from "./index";

type RootResponse = {
  data: {
    name: string;
    api_endpoint: string;
    api_base_path: string;
    repository_url?: string;
    endpoints: string[];
  };
};

describe("root route", () => {
  it("returns service information instead of redirecting", async () => {
    const response = await app.request("/");
    const body = (await response.json()) as RootResponse;

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(body.data).toMatchObject({
      name: "Koriyama Open Data Hub",
      api_endpoint: PUBLIC_API_ENDPOINT,
      api_base_path: "/api/v2",
    });
    expect(body.data.repository_url).toBeUndefined();
    expect(body.data.endpoints).toContain("/api/v2/health");
  });
});

describe("scheduled jobs", () => {
  it("runs open data ingestion at the configured UTC hour", () => {
    expect(shouldIngestOpenData(new Date("2026-05-27T18:00:00.000Z"))).toBe(true);
    expect(shouldIngestOpenData(new Date("2026-05-27T17:00:00.000Z"))).toBe(false);
  });
});
