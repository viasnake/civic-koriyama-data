import { describe, expect, it } from "vitest";
import { PUBLIC_API_BASE_URL } from "./constants";
import { app, shouldIngestOpenData } from "./index";
import { API_RATE_LIMIT_REQUESTS, API_RATE_LIMIT_WINDOW_SECONDS } from "./middleware/rateLimit";
import type { Bindings } from "./types";

type ServiceInfoResponse = {
  data: {
    name: string;
    api_endpoint: string;
    api_base_path: string;
    repository_url?: string;
    endpoints: string[];
  };
};

function createEnv(rateLimiter: RateLimit): Bindings {
  return {
    API_RATE_LIMITER: rateLimiter,
    DB: {} as D1Database,
  };
}

function allowAllRateLimiter(calls: RateLimitOptions[] = []): RateLimit {
  return {
    async limit(options) {
      calls.push(options);
      return { success: true };
    },
  };
}

describe("root route", () => {
  it("redirects to the documentation", async () => {
    const response = await app.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/docs/");
  });
});

describe("api root route", () => {
  it("returns service information", async () => {
    const response = await app.request("/api/v2", {}, createEnv(allowAllRateLimiter()));
    const body = (await response.json()) as ServiceInfoResponse;

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      name: "Koriyama Open Data Hub",
      api_endpoint: PUBLIC_API_BASE_URL,
      api_base_path: "/api/v2",
    });
    expect(body.data.repository_url).toBeUndefined();
    expect(body.data.endpoints).toContain("/api/v2/health");
  });

  it("rate limits API requests by client IP", async () => {
    const calls: RateLimitOptions[] = [];
    const response = await app.request(
      "/api/v2",
      { headers: { "CF-Connecting-IP": "203.0.113.10" } },
      createEnv(allowAllRateLimiter(calls)),
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([{ key: "api:v2:203.0.113.10" }]);
  });

  it("returns 429 when the API rate limit is exceeded", async () => {
    const response = await app.request(
      "/api/v2",
      { headers: { "CF-Connecting-IP": "203.0.113.10" } },
      createEnv({
        async limit() {
          return { success: false };
        },
      }),
    );
    const body = (await response.json()) as { data: { error: string; limit: number; retry_after_seconds: number } };

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe(API_RATE_LIMIT_WINDOW_SECONDS.toString());
    expect(body.data).toMatchObject({
      error: "rate_limited",
      limit: API_RATE_LIMIT_REQUESTS,
      retry_after_seconds: API_RATE_LIMIT_WINDOW_SECONDS,
    });
  });
});

describe("scheduled jobs", () => {
  it("runs open data ingestion at the configured UTC hour", () => {
    expect(shouldIngestOpenData(new Date("2026-05-27T18:00:00.000Z"))).toBe(true);
    expect(shouldIngestOpenData(new Date("2026-05-27T17:00:00.000Z"))).toBe(false);
  });
});
