#!/usr/bin/env bash
set -euo pipefail

# CHA Data Pipeline: Download, filter, and convert parcel/zoning data to PMTiles
# Prerequisites: GDAL (ogr2ogr), Tippecanoe
# Run from project root: bash scripts/build-tiles.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
PUBLIC_DIR="$PROJECT_DIR/public"

mkdir -p "$DATA_DIR" "$PUBLIC_DIR"

echo "=== CHA Data Pipeline ==="
echo ""

# --- Step 1: Download data ---
echo "[1/4] Download parcel and zoning shapefiles"
echo "  Parcels: https://datacatalog.cookcountyil.gov/ -> Parcels dataset -> Shapefile"
echo "  Zoning:  https://data.cityofchicago.org/ -> Zoning dataset -> Shapefile"
echo ""
echo "  Place downloaded files in: $DATA_DIR/"
echo "  Expected: $DATA_DIR/parcels.shp (+ .dbf, .prj, .shx)"
echo "            $DATA_DIR/zoning.shp  (+ .dbf, .prj, .shx)"
echo ""

if [ ! -f "$DATA_DIR/parcels.shp" ]; then
  echo "ERROR: $DATA_DIR/parcels.shp not found. Download parcels shapefile first."
  exit 1
fi

# --- Step 2: Filter to Chicago & reproject ---
echo "[2/4] Filtering to Chicago and reprojecting to EPSG:4326..."

if [ -f "$DATA_DIR/parcels.shp" ]; then
  ogr2ogr -f GeoJSON "$DATA_DIR/parcels_chicago.geojson" "$DATA_DIR/parcels.shp" \
    -t_srs EPSG:4326 \
    -where "CITY='CHICAGO' OR MUNICIPALITY='CHICAGO'" \
    -progress
  echo "  Parcels filtered and reprojected."
fi

if [ -f "$DATA_DIR/zoning.shp" ]; then
  ogr2ogr -f GeoJSON "$DATA_DIR/zoning_chicago.geojson" "$DATA_DIR/zoning.shp" \
    -t_srs EPSG:4326 \
    -progress
  echo "  Zoning reprojected."
fi

# --- Step 3: Generate PMTiles ---
echo "[3/4] Generating PMTiles with Tippecanoe..."

if [ -f "$DATA_DIR/parcels_chicago.geojson" ]; then
  tippecanoe -o "$PUBLIC_DIR/parcels.pmtiles" \
    -Z10 -z16 \
    -l parcels \
    --detect-shared-borders \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    -y PIN14 -y ADDR -y CITY -y ZIP \
    --force \
    "$DATA_DIR/parcels_chicago.geojson"
  echo "  parcels.pmtiles created: $(du -h "$PUBLIC_DIR/parcels.pmtiles" | cut -f1)"
fi

if [ -f "$DATA_DIR/zoning_chicago.geojson" ]; then
  tippecanoe -o "$PUBLIC_DIR/zoning.pmtiles" \
    -Z10 -z16 \
    -l zoning \
    --coalesce-densest-as-needed \
    --force \
    -y ZONE_CLASS \
    "$DATA_DIR/zoning_chicago.geojson"
  echo "  zoning.pmtiles created: $(du -h "$PUBLIC_DIR/zoning.pmtiles" | cut -f1)"
fi

# --- Step 4: Done ---
echo ""
echo "[4/4] Done! PMTiles are in $PUBLIC_DIR/"
echo "  Run 'npm run dev' and open http://localhost:3000"
