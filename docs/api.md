# API

All public endpoints are read-only and versioned under `/api/v2`.

Every JSON endpoint returns:

```json
{
  "meta": {
    "api_version": "2.0",
    "generated_at": "2026-05-25T00:00:00.000Z",
    "source_name": "郡山市オープンデータ",
    "license": "CC BY 4.0",
    "attribution_required": true,
    "unofficial": true,
    "disclaimer": "This API is not affiliated with Koriyama City."
  },
  "data": []
}
```

## Endpoints

- `GET /api/v2/health`
- `GET /api/v2/datasets`
- `GET /api/v2/datasets/{dataset_id}`
- `GET /api/v2/datasets/{dataset_id}/records`
- `GET /api/v2/places`
- `GET /api/v2/places/{place_id}`
- `GET /api/v2/places.geojson`
- `GET /api/v2/search?q=`
- `GET /api/v2/changes`
- `GET /api/v2/rss/entries`

## Places Filters

- `dataset_id`
- `category`
- `q`
- `bbox=minLng,minLat,maxLng,maxLat`

Example:

```http
GET /api/v2/places?dataset_id=aed
GET /api/v2/places.geojson?category=facility
```
