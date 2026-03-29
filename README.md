# mtl_map_crime

Interactive Montreal crime map built with React, Vite, Leaflet, and Plotly.

![mtl_map_crime screenshot](./SCREENSHOTS/SC1.png)

## What It Does

- Loads Montreal crime data from the public GeoJSON source
- Displays crime intensity as aggregated PDQ shaded areas instead of exact incident points
- Filters by crime category and year
- Shows PDQ hover details with incident count and share of the filtered total
- Opens a chart modal with monthly counts
- Supports comparing the selected year with the previous year in the chart modal
- Shows a bilingual reminder modal on refresh
- Uses a streamed fetch with real byte-progress tracking for the main crime dataset when available

## Notes

- The app fetches the full remote crime GeoJSON in the browser on load
- The loading overlay uses real byte progress when the source provides `Content-Length`
- If the source does not provide total size, the loader falls back to a generic progress state
- Crime polygons are rendered from the local WGS84 PDQ boundary file in `public/limitespdq_wgs84.geojson`
- The chart modal lets users change category and year, and optionally compare the selected year with the previous year

## Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Data Sources

- Crime data: Ville de Montreal / SPVM `actes-criminels.geojson`
- PDQ boundaries: local WGS84 GeoJSON derived from Montreal PDQ boundary data

## Current Tradeoff

The app currently prioritizes direct public-data loading over cached or preprocessed data. That keeps the dataset source simple, but the initial load can still be slow because the browser downloads and parses the full GeoJSON file.
