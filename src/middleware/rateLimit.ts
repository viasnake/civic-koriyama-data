import type { MiddlewareHandler } from "hono";
import { CORS_HEADERS, jsonResponse } from "../constants";
import type { Bindings } from "../types";

export const API_RATE_LIMIT_REQUESTS = 30;
export const API_RATE_LIMIT_WINDOW_SECONDS = 60;

export const apiRateLimit: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  if (c.req.method === "OPTIONS") {
    await next();
    return;
  }

  const clientIp = getClientIp(c.req.raw);
  const outcome = await c.env.API_RATE_LIMITER.limit({ key: `api:v2:${clientIp}` });

  if (!outcome.success) {
    return jsonResponse(
      {
        error: "rate_limited",
        limit: API_RATE_LIMIT_REQUESTS,
        message: "Too many API requests. Please retry later.",
        retry_after_seconds: API_RATE_LIMIT_WINDOW_SECONDS,
      },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": "no-store",
          "Retry-After": API_RATE_LIMIT_WINDOW_SECONDS.toString(),
        },
      },
    );
  }

  await next();
};

function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const forwardedFor = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  return "unknown";
}
