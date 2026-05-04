import { NextRequest, NextResponse } from "next/server";

const FLOOD_FEATURE_URL =
  "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Flood_Hazard_Reduced_Set_gdb/FeatureServer/0/query";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox");

  if (!bbox) {
    return NextResponse.json({ error: "Missing bbox" }, { status: 400 });
  }

  const params = new URLSearchParams({
    where: "FLD_ZONE <> 'AREA NOT INCLUDED'",
    geometry: bbox,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "3857",
    outSR: "4326",
    outFields: "FLD_ZONE,ZONE_SUBTY",
    returnGeometry: "true",
    f: "geojson",
    resultRecordCount: "1000",
  });

  const res = await fetch(`${FLOOD_FEATURE_URL}?${params}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const data = await res.text();
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/geo+json",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
