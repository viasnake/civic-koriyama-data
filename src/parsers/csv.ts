import { parse } from "csv-parse/sync";

export function parseCsv(text: string): Record<string, unknown>[] {
  return parse(text, {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];
}
