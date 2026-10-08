export function normalizeText(value: unknown): string {
  if (value == null) return "";
  return String(value).normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function firstString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeText(row[key]);
    if (value !== "") return value;
  }
  return null;
}

export function joinedString(row: Record<string, unknown>, keys: string[]): string | null {
  const parts = keys.map((key) => normalizeText(row[key])).filter((value) => value !== "");
  return parts.length > 0 ? parts.join("") : null;
}

export function parseNumber(value: unknown): number | null {
  const text = normalizeText(value);
  if (text === "") return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}
