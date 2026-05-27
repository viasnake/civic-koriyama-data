# Datasets

The source catalog lives in [../datasets/koriyama.yaml](../datasets/koriyama.yaml).

The public dataset IDs are stable and do not expose Koriyama City attachment IDs.

Initial place datasets:

- `public_facilities`
- `aed`
- `public_wifi`
- `public_toilets`
- `childcare_facilities`
- `medical_institutions`
- `schools`
- `shelters`

`shelters` points to the official disaster open data page, but the current
official files are zipped shapefiles. They are exposed as source metadata and
marked with warnings until shapefile-to-place normalization is implemented.

CSV-backed public facility datasets are ingested into `raw_records` and
normalized into `places` during the open data cron.
