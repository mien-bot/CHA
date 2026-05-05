import { NextRequest, NextResponse } from "next/server";

// City of Chicago overlay queries
const ZONING_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/1/query";
const WARD_API = "https://gisapps.chicago.gov/arcgis/rest/services/311/311_layers/MapServer/21/query";
const COMAREA_API = "https://gisapps.chicago.gov/arcgis/rest/services/311/311_layers/MapServer/5/query";
const PLANNING_REGION_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/21/query";
const ARO_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/20/query";
const ZONING_MAP_INDEX_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/22/query";
const TIF_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/dpd/MapServer/13/query";

async function queryPoint(url: string, lng: number, lat: number, outFields: string) {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    f: "json",
    returnGeometry: "false",
  });
  const res = await fetch(`${url}?${params}`, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.features?.[0]?.attributes ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lng = parseFloat(searchParams.get("lng") || "");
  const lat = parseFloat(searchParams.get("lat") || "");

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: "Missing lng/lat" }, { status: 400 });
  }

  const [zoning, ward, comArea, planRegion, aro, mapIndex, tif] = await Promise.all([
    queryPoint(ZONING_API, lng, lat, "ZONE_CLASS,ZONE_TYPE"),
    queryPoint(WARD_API, lng, lat, "WARD,ALDERMAN,WARD_PHONE"),
    queryPoint(COMAREA_API, lng, lat, "COMMUNITY,AREA_NUMBER"),
    queryPoint(PLANNING_REGION_API, lng, lat, "REGION_NAME"),
    queryPoint(ARO_API, lng, lat, "STATUS"),
    queryPoint(ZONING_MAP_INDEX_API, lng, lat, "ZONE_MAP,PAGE_NUMBER"),
    queryPoint(TIF_API, lng, lat, "NAME,REF,EXPIRATION_DATE,TYPE"),
  ]);

  const result: Record<string, string> = {};

  if (zoning) result.zoning = zoning.ZONE_CLASS || "";
  if (ward) {
    result.ward = ward.WARD || "";
    result.alderman = ward.ALDERMAN || "";
    result.wardPhone = ward.WARD_PHONE || "";
  }
  if (comArea) result.communityArea = comArea.COMMUNITY || "";
  if (planRegion) result.planningRegion = planRegion.REGION_NAME || "";
  if (aro) result.aro = aro.STATUS || "";
  if (mapIndex) result.zoningMapIndex = `${mapIndex.ZONE_MAP || ""} (Page ${mapIndex.PAGE_NUMBER || ""})`;
  if (tif) {
    result.tifDistrict = `${tif.NAME || ""} (${tif.REF || ""})`;
    result.tifExpiration = tif.EXPIRATION_DATE || "";
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
}
