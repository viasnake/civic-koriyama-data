export type Bindings = {
  API_RATE_LIMITER: RateLimit;
  DB: D1Database;
};

export type DatasetSourceFile = {
  label: string;
  url: string;
  file_type: "csv" | "xlsx" | "zip";
  encoding?: string;
  normalize: boolean;
  warnings?: string[];
};

export type DatasetCatalogItem = {
  id: string;
  name: string;
  source_page: string;
  source_page_label?: string;
  source_page_url?: string;
  source_files?: DatasetSourceFile[];
  source_type: "file";
  format: "csv_or_xlsx" | "zip" | "mixed";
  category: string;
  enabled: boolean;
  normalize_as: "place";
  public_api: boolean;
  warnings?: string[];
};

export type RssCategory = {
  id: string;
  name: string;
  keywords: string[];
};

export type DatasetCatalog = {
  version: number;
  source: {
    id: string;
    name: string;
    type: "municipality";
    official_site: string;
  };
  datasets: DatasetCatalogItem[];
  rss_categories: RssCategory[];
};

export type ApiMeta = {
  api_version: "2.0";
  generated_at: string;
  source_name: "郡山市オープンデータ";
  license: "CC BY 4.0";
  attribution_required: true;
  unofficial: true;
  disclaimer: "This API is not affiliated with Koriyama City.";
  result_count?: number;
  limit?: number;
  offset?: number;
};

export type ApiResponse<T> = {
  meta: ApiMeta;
  data: T;
};

export type Place = {
  id: string;
  dataset_id: string;
  name: string;
  category: string;
  subcategory: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  official_url: string | null;
  source_url: string | null;
  source_record_hash: string;
  attributes_json: string;
  first_seen_at: string;
  last_seen_at: string;
  deleted_at: string | null;
};

export type PlaceResponse = Omit<Place, "attributes_json"> & {
  attributes: unknown;
};

export type RawRecord = {
  id: string;
  dataset_id: string;
  source_record_key: string | null;
  source_row_hash: string;
  raw_json: string;
  fetched_at: string;
};

export type RawRecordResponse = Omit<RawRecord, "raw_json"> & {
  raw: unknown;
};

export type RssEntry = {
  id: string;
  feed_id: string;
  title: string;
  link: string;
  published_at: string | null;
  fetched_at: string;
  category: string | null;
  tags_json: string;
  source_hash: string;
};

export type RssEntryResponse = Omit<RssEntry, "tags_json"> & {
  tags: string[];
};

export type RecordChange = {
  id: number;
  dataset_id: string;
  record_id: string;
  change_type: string;
  changed_at: string;
  before_json: string | null;
  after_json: string | null;
};

export type RecordChangeResponse = Omit<RecordChange, "before_json" | "after_json"> & {
  before: unknown;
  after: unknown;
};

export type FetchLog = {
  id: number;
  source_type: string;
  source_id: string;
  status: string;
  fetched_at: string;
  records_count: number | null;
  error_message: string | null;
};
