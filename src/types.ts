export type Bindings = {
  DB: D1Database;
};

export type DatasetCatalogItem = {
  id: string;
  name: string;
  source_page: string;
  source_type: "file";
  format: "csv_or_xlsx";
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

export type RawRecord = {
  id: string;
  dataset_id: string;
  source_record_key: string | null;
  source_row_hash: string;
  raw_json: string;
  fetched_at: string;
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
