import { parse } from "yaml";
import {
  KORIYAMA_DISASTER_OPEN_DATA_URL,
  KORIYAMA_PUBLIC_FACILITIES_URL,
} from "../sources/koriyama";
import type { DatasetCatalog, DatasetCatalogItem, DatasetSourceFile, RssCategory } from "../types";

const ATTACHMENT_BASE_URL = "https://www.city.koriyama.lg.jp/uploaded/attachment";

function csv(id: number, label: string): DatasetSourceFile {
  return {
    label,
    url: `${ATTACHMENT_BASE_URL}/${id}.csv`,
    file_type: "csv",
    encoding: "shift_jis",
    normalize: true,
  };
}

function zip(id: number, label: string, warnings: string[]): DatasetSourceFile {
  return {
    label,
    url: `${ATTACHMENT_BASE_URL}/${id}.zip`,
    file_type: "zip",
    normalize: false,
    warnings,
  };
}

const PUBLIC_FACILITY_FILES = [
  csv(1705, "市の行政サービス"),
  csv(1706, "ふれあいセンター・コミュニティセンター"),
  csv(1707, "公民館"),
  csv(1708, "保健所"),
  csv(1709, "病院"),
  csv(1710, "福祉・子育て支援施設"),
  csv(1711, "働く人のための施設"),
  csv(1712, "上下水道局"),
  csv(1713, "衛生"),
  csv(1714, "霊園"),
  csv(1715, "火葬場"),
  csv(1716, "消防"),
  csv(1717, "郡山水防センター"),
  csv(1718, "保育所（認可保育所）"),
  csv(1719, "その他の私立保育園"),
  csv(1720, "幼稚園（私立幼稚園）"),
  csv(1721, "小学校"),
  csv(1722, "中学校"),
  csv(1723, "文化・教育・社会施設"),
  csv(1724, "スポーツ施設"),
  csv(1725, "観光・産業施設"),
  csv(1726, "市営住宅"),
];

const DATASET_SOURCE_FILES: Record<string, DatasetSourceFile[]> = {
  public_facilities: PUBLIC_FACILITY_FILES,
  aed: [csv(1727, "AED設置施設")],
  public_wifi: [csv(1728, "Wi-Fi設置施設")],
  public_toilets: [csv(1729, "オストメイト対応トイレ設置施設")],
  childcare_facilities: [
    csv(1710, "福祉・子育て支援施設"),
    csv(1718, "保育所（認可保育所）"),
    csv(1719, "その他の私立保育園"),
    csv(1720, "幼稚園（私立幼稚園）"),
  ],
  medical_institutions: [csv(1708, "保健所"), csv(1709, "病院")],
  schools: [csv(1721, "小学校"), csv(1722, "中学校")],
  shelters: [
    zip(1627, "指定避難場所", ["unsupported_shapefile_zip"]),
    zip(1637, "緊急避難場所", ["unsupported_shapefile_zip"]),
    zip(1638, "収容避難場所", ["unsupported_shapefile_zip"]),
  ],
};

const DATASET_SOURCE_PAGES: Record<string, string> = {
  public_facilities: KORIYAMA_PUBLIC_FACILITIES_URL,
  aed: KORIYAMA_PUBLIC_FACILITIES_URL,
  public_wifi: KORIYAMA_PUBLIC_FACILITIES_URL,
  public_toilets: KORIYAMA_PUBLIC_FACILITIES_URL,
  childcare_facilities: KORIYAMA_PUBLIC_FACILITIES_URL,
  medical_institutions: KORIYAMA_PUBLIC_FACILITIES_URL,
  schools: KORIYAMA_PUBLIC_FACILITIES_URL,
  shelters: KORIYAMA_DISASTER_OPEN_DATA_URL,
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
    source_page: opendata_disaster
    source_type: file
    format: zip
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
      source_page_url: DATASET_SOURCE_PAGES[dataset.id],
      source_files: DATASET_SOURCE_FILES[dataset.id] ?? [],
    })),
  };
}
