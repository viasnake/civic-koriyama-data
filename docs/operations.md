# Operations

## Fetch Policy

- Use ETag / Last-Modified when source fetchers expose them.
- Do not delete existing data on fetch failure.
- Store fetch outcomes in `fetch_logs`.
- Detect source file URL changes before normalizing records.
- Warn when record counts drop unexpectedly.

## Rate Limiting

- `/api/v2/*` is protected by the Cloudflare Workers Rate Limiting binding `API_RATE_LIMITER`.
- The current policy is 30 requests per 60 seconds per client IP address.
- Keep `wrangler.toml` and `src/middleware/rateLimit.ts` in sync when changing the threshold.
- If Worker invocation cost itself becomes the bottleneck, add an edge-level Cloudflare WAF or Rate Limiting Rule before the Worker runs.
