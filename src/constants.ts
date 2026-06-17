import type { ApiMeta } from "./types";

export const API_VERSION = "2.0" as const;
export const PUBLIC_API_ENDPOINT = "https://koriyama-open-data-hub.alflag.org/" as const;
export const PUBLIC_API_BASE_URL = new URL("api/v2", PUBLIC_API_ENDPOINT).toString();

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

export type JsonResponseOptions = {
  limit?: number;
  offset?: number;
};

export function jsonResponse<T>(data: T, init?: ResponseInit, options: JsonResponseOptions = {}): Response {
  return Response.json(
    {
      meta: {
        ...createMeta(),
        ...(Array.isArray(data) ? { result_count: data.length } : {}),
        ...(options.limit == null ? {} : { limit: options.limit }),
        ...(options.offset == null ? {} : { offset: options.offset }),
      },
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
