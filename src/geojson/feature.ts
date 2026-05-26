import type { Place } from "../types";

export type GeoJsonFeature = {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    name: string;
    dataset_id: string;
    category: string;
    source_name: "郡山市オープンデータ";
    unofficial: true;
  };
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export function toFeature(place: Place): GeoJsonFeature | null {
  if (place.lat == null || place.lng == null) return null;

  return {
    type: "Feature",
    id: place.id,
    geometry: {
      type: "Point",
      coordinates: [place.lng, place.lat],
    },
    properties: {
      name: place.name,
      dataset_id: place.dataset_id,
      category: place.category,
      source_name: "郡山市オープンデータ",
      unofficial: true,
    },
  };
}

export function toFeatureCollection(places: Place[]): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: places.flatMap((place) => {
      const feature = toFeature(place);
      return feature ? [feature] : [];
    }),
  };
}
