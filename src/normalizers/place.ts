import type { DatasetCatalogItem, Place } from "../types";
import { shortHash } from "../utils/hash";
import { firstString, joinedString, normalizeText, parseNumber } from "../utils/text";

export type NormalizedPlaceInput = {
  dataset: DatasetCatalogItem;
  row: Record<string, unknown>;
  fetchedAt: string;
  sourceUrl?: string | null;
};

export type NormalizedPlace = Place & {
  warnings: string[];
};

const KORIYAMA_LAT_RANGE = [36.5, 38.0] as const;
const KORIYAMA_LNG_RANGE = [139.0, 141.5] as const;

export async function normalizePlace(input: NormalizedPlaceInput): Promise<NormalizedPlace | null> {
  const name = firstString(input.row, ["施設名", "名称", "教育機関_学校名", "name", "Name"]);
  if (!name) return null;

  const address =
    firstString(input.row, ["住所", "所在地", "所在地_連結表記", "address", "Address"]) ??
    joinedString(input.row, [
      "教育機関_学校所在地（市区町村）",
      "教育機関_学校所在地（町字）",
      "教育機関_学校所在地（番地以下）",
    ]);
  const lat = parseNumber(firstString(input.row, ["緯度", "教育機関_緯度", "lat", "latitude", "Latitude"]));
  const lng = parseNumber(firstString(input.row, ["経度", "教育機関_経度", "lng", "lon", "longitude", "Longitude"]));
  const warnings: string[] = [];

  const validLat = lat == null ? null : isWithin(lat, KORIYAMA_LAT_RANGE) ? lat : null;
  const validLng = lng == null ? null : isWithin(lng, KORIYAMA_LNG_RANGE) ? lng : null;

  if ((lat != null && validLat == null) || (lng != null && validLng == null)) {
    warnings.push("invalid_coordinate");
  }

  const stableKey = [
    normalizeText(name),
    normalizeText(address),
    validLat?.toString() ?? "",
    validLng?.toString() ?? "",
  ].join("|");
  const id = `place_${input.dataset.id}_${await shortHash(stableKey)}`;
  const rawHash = await shortHash(JSON.stringify(input.row), 32);

  const attributes = {
    raw: input.row,
    warnings,
  };

  return {
    id,
    dataset_id: input.dataset.id,
    name,
    category: input.dataset.category,
    subcategory: input.dataset.id,
    address,
    lat: validLat,
    lng: validLng,
    phone: firstString(input.row, ["電話", "電話番号", "教育機関_連絡先電話番号", "phone", "Phone"]),
    fax: firstString(input.row, ["ファックス", "FAX", "fax"]),
    email: firstString(input.row, ["メールアドレス", "email", "Email"]),
    official_url: firstString(input.row, ["URL", "url", "公式URL", "official_url"]),
    source_url: input.sourceUrl ?? null,
    source_record_hash: rawHash,
    attributes_json: JSON.stringify(attributes),
    first_seen_at: input.fetchedAt,
    last_seen_at: input.fetchedAt,
    deleted_at: null,
    warnings,
  };
}

function isWithin(value: number, [min, max]: readonly [number, number]): boolean {
  return value >= min && value <= max;
}
