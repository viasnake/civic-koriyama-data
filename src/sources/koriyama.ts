export const KORIYAMA_OPEN_DATA_INDEX_URL = "https://www.city.koriyama.lg.jp/soshiki/21/176730.html";
export const KORIYAMA_PUBLIC_FACILITIES_URL = "https://www.city.koriyama.lg.jp/soshiki/21/176727.html";
export const KORIYAMA_DISASTER_OPEN_DATA_URL = "https://www.city.koriyama.lg.jp/soshiki/21/176726.html";

export type SourceFile = {
  datasetId: string;
  url: string;
  label?: string;
  fileType: "csv" | "xlsx" | "zip";
  encoding?: string;
  normalize?: boolean;
};

export async function fetchSourceFile(file: SourceFile): Promise<ArrayBuffer> {
  const response = await fetch(file.url, {
    headers: {
      "User-Agent": "koriyama-open-data-hub/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${file.datasetId}: ${response.status}`);
  }

  return response.arrayBuffer();
}
