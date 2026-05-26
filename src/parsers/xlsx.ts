import readXlsxFile, { type Row } from "read-excel-file/browser";

export async function parseXlsx(buffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const sheets = await readXlsxFile(buffer);
  const rows = sheets[0]?.data ?? [];
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map((cell) => String(cell ?? "").trim());

  return dataRows.map((row: Row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])),
  );
}
