export function nowIso(): string {
  return new Date().toISOString();
}

export function parseDateLike(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
