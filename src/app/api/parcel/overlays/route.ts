import { NextRequest, NextResponse } from "next/server";

// City of Chicago overlay queries
const ZONING_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/1/query";
const WARD_API = "https://gisapps.chicago.gov/arcgis/rest/services/311/311_layers/MapServer/21/query";
const COMAREA_API = "https://gisapps.chicago.gov/arcgis/rest/services/311/311_layers/MapServer/5/query";
const PLANNING_REGION_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/21/query";
const ARO_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/20/query";
const ZONING_MAP_INDEX_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/22/query";
const TIF_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/dpd/MapServer/13/query";
const TSL_BUS_ROUTE_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/14/query";
const EIGHTY_ACRE_API = "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/IndexGrid/MapServer/0/query";

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
  return data.features ?? [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lng = parseFloat(searchParams.get("lng") || "");
  const lat = parseFloat(searchParams.get("lat") || "");

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: "Missing lng/lat" }, { status: 400 });
  }

  const [zoning, ward, comArea, planRegion, aro, mapIndex, tif, tslRoutes, eightyAcre] = await Promise.all([
    queryPoint(ZONING_API, lng, lat, "ZONE_CLASS,ZONE_TYPE"),
    queryPoint(WARD_API, lng, lat, "WARD,ALDERMAN,WARD_PHONE"),
    queryPoint(COMAREA_API, lng, lat, "COMMUNITY,AREA_NUMBER"),
    queryPoint(PLANNING_REGION_API, lng, lat, "REGION_NAME"),
    queryPoint(ARO_API, lng, lat, "STATUS"),
    queryPoint(ZONING_MAP_INDEX_API, lng, lat, "ZONE_MAP,PAGE_NUMBER,GRID,BOOKS"),
    queryPoint(TIF_API, lng, lat, "NAME,REF,EXPIRATION_DATE,TYPE"),
    queryPoint(TSL_BUS_ROUTE_API, lng, lat, "STREET_NAM,SEGMENT_FR,SEGMENT_TO,SERVED_BY_"),
    queryPoint(EIGHTY_ACRE_API, lng, lat, "ALIAS"),
  ]);

  const result: Record<string, unknown> = {};

  if (zoning?.[0]) result.zoning = zoning[0].attributes.ZONE_CLASS || "";
  if (ward?.[0]) {
    const w = ward[0].attributes;
    result.ward = w.WARD || "";
    result.alderman = w.ALDERMAN || "";
    result.wardPhone = w.WARD_PHONE || "";
  }
  if (comArea?.[0]) result.communityArea = comArea[0].attributes.COMMUNITY || "";
  if (planRegion?.[0]) result.planningRegion = planRegion[0].attributes.REGION_NAME || "";
  if (aro?.[0]) result.aro = aro[0].attributes.STATUS || "";
  if (mapIndex?.[0]) {
    const m = mapIndex[0].attributes;
    result.zoningMapIndex = `Grid ${m.ZONE_MAP || ""}, Page ${m.PAGE_NUMBER || ""}`;
    result.waterRecordBooks = (m.BOOKS || "").trim();
  }
  if (tif?.[0]) {
    const t = tif[0].attributes;
    result.tifDistrict = `${t.NAME || ""} (${t.REF || ""})`;
    result.tifExpiration = t.EXPIRATION_DATE || "";
  }
  if (tslRoutes?.length) {
    result.tslBusRoutes = tslRoutes.map((f: { attributes: Record<string, string> }) => {
      const a = f.attributes;
      return `On ${a.STREET_NAM} from ${a.SEGMENT_FR} to ${a.SEGMENT_TO}`;
    });
  }
  if (eightyAcre?.[0]) {
    result.eightyAcrePage = eightyAcre[0].attributes.ALIAS || "";
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
}
