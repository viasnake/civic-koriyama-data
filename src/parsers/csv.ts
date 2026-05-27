import { parse } from "csv-parse/browser/esm/sync";

export function parseCsv(text: string): Record<string, unknown>[] {
  return parse(text, {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];
}

export function parseCsvBuffer(buffer: ArrayBuffer, encoding = "utf-8"): Record<string, unknown>[] {
  return parseCsv(new TextDecoder(encoding).decode(buffer));
}
