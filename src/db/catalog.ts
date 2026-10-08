import { parse } from "yaml";
import { KORIYAMA_OPEN_DATA_INDEX_URL } from "../sources/koriyama";
import type { DatasetCatalog, DatasetCatalogItem, DatasetSourceFile, RssCategory } from "../types";

const OPEN_DATA_FILE_BASE_URL = "https://www.city.koriyama.lg.jp/uploaded/life";
const OPEN_DATA_PAGE_LABEL = "郡山市のオープンデータ";

function csv(file: string, label: string, encoding = "utf-8"): DatasetSourceFile {
  return {
    label,
    url: `${OPEN_DATA_FILE_BASE_URL}/${file}`,
    file_type: "csv",
    encoding,
    normalize: true,
  };
}

// File names are published on the open data index page (郡山市のオープンデータ).
const DATASET_SOURCE_FILES: Record<string, DatasetSourceFile[]> = {
  public_facilities: [csv("192867_453609_misc.csv", "公共施設一覧")],
  aed: [csv("192867_453615_misc.csv", "AED設置個所一覧")],
  public_wifi: [csv("192867_453614_misc.csv", "公衆無線LANアクセスポイント一覧")],
  public_toilets: [csv("192867_453620_misc.csv", "公衆トイレ一覧")],
  childcare_facilities: [csv("192867_453613_misc.csv", "子育て施設一覧")],
  medical_institutions: [csv("192867_453617_misc.csv", "医療機関一覧")],
  schools: [csv("192867_453625_misc.csv", "学校一覧", "shift_jis")],
  shelters: [csv("192867_453611_misc.csv", "指定緊急避難場所一覧")],
};

const DATASET_SOURCE_PAGES: Record<string, string> = {
  public_facilities: KORIYAMA_OPEN_DATA_INDEX_URL,
  aed: KORIYAMA_OPEN_DATA_INDEX_URL,
  public_wifi: KORIYAMA_OPEN_DATA_INDEX_URL,
  public_toilets: KORIYAMA_OPEN_DATA_INDEX_URL,
  childcare_facilities: KORIYAMA_OPEN_DATA_INDEX_URL,
  medical_institutions: KORIYAMA_OPEN_DATA_INDEX_URL,
  schools: KORIYAMA_OPEN_DATA_INDEX_URL,
  shelters: KORIYAMA_OPEN_DATA_INDEX_URL,
};

const DATASET_SOURCE_PAGE_LABELS: Record<string, string> = {
  public_facilities: OPEN_DATA_PAGE_LABEL,
  aed: OPEN_DATA_PAGE_LABEL,
  public_wifi: OPEN_DATA_PAGE_LABEL,
  public_toilets: OPEN_DATA_PAGE_LABEL,
  childcare_facilities: OPEN_DATA_PAGE_LABEL,
  medical_institutions: OPEN_DATA_PAGE_LABEL,
  schools: OPEN_DATA_PAGE_LABEL,
  shelters: OPEN_DATA_PAGE_LABEL,
};

export const KORIYAMA_CATALOG_YAML = `version: 1
source:
  id: koriyama_city
  name: 郡山市
  type: municipality
  official_site: https://www.city.koriyama.lg.jp/
datasets:
  - id: public_facilities
    name: 公共施設一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: facility
    enabled: true
    normalize_as: place
    public_api: true
  - id: aed
    name: AED設置個所一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: safety
    enabled: true
    normalize_as: place
    public_api: true
  - id: public_wifi
    name: 公衆無線LANアクセスポイント一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: facility
    enabled: true
    normalize_as: place
    public_api: true
  - id: public_toilets
    name: 公衆トイレ一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: facility
    enabled: true
    normalize_as: place
    public_api: true
  - id: childcare_facilities
    name: 子育て施設一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: childcare
    enabled: true
    normalize_as: place
    public_api: true
  - id: medical_institutions
    name: 医療機関一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: medical
    enabled: true
    normalize_as: place
    public_api: true
  - id: schools
    name: 学校一覧
    source_page: opendata_index
    source_type: file
    format: csv_or_xlsx
    category: education
    enabled: true
    normalize_as: place
    public_api: true
  - id: shelters
    name: 指定緊急避難場所一覧
    source_page: opendata_index
    source_type: file
    format: csv
    category: disaster
    enabled: true
    normalize_as: place
    public_api: true
    warnings:
      - disaster_data
rss_categories:
  - id: disaster
    name: 防災・安全
    keywords: [防災, 災害, 避難, 警報, 注意報, 熱中症]
  - id: childcare
    name: 子育て・教育
    keywords: [子育て, 保育, 幼稚園, 学校, 児童, 妊娠]
  - id: life
    name: くらし・手続き
    keywords: [住民票, 戸籍, 税, ごみ, 国民健康保険, マイナンバー]
  - id: business
    name: 事業者向け
    keywords: [入札, 補助金, 契約, 事業者, 募集]
  - id: event
    name: イベント
    keywords: [イベント, 講座, 参加者募集, 展示, スポーツ]
  - id: city_admin
    name: 市政情報
    keywords: [市議会, 審議会, 計画, パブリックコメント]
`;

export const catalog = enrichCatalog(parse(KORIYAMA_CATALOG_YAML) as DatasetCatalog);

export function listPublicDatasets(): DatasetCatalogItem[] {
  return catalog.datasets.filter((dataset) => dataset.enabled && dataset.public_api);
}

export function findDataset(datasetId: string): DatasetCatalogItem | undefined {
  return catalog.datasets.find((dataset) => dataset.id === datasetId);
}

export function listRssCategories(): RssCategory[] {
  return catalog.rss_categories;
}

function enrichCatalog(input: DatasetCatalog): DatasetCatalog {
  return {
    ...input,
    datasets: input.datasets.map((dataset) => ({
      ...dataset,
      source_page_label: DATASET_SOURCE_PAGE_LABELS[dataset.id],
      source_page_url: DATASET_SOURCE_PAGES[dataset.id],
      source_files: DATASET_SOURCE_FILES[dataset.id] ?? [],
    })),
  };
}
