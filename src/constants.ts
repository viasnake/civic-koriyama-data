import type { ApiMeta } from "./types";

export const API_VERSION = "2.0" as const;

export function createMeta(now = new Date()): ApiMeta {
  return {
    api_version: API_VERSION,
    generated_at: now.toISOString(),
    source_name: "郡山市オープンデータ",
    license: "CC BY 4.0",
    attribution_required: true,
    unofficial: true,
    disclaimer: "This API is not affiliated with Koriyama City.",
  };
}

export function jsonResponse<T>(data: T, init?: ResponseInit): Response {
  return Response.json(
    {
      meta: createMeta(),
      data,
    },
    init,
  );
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
