import { NextRequest, NextResponse } from "next/server";

const EIGHTY_ACRE_API =
  "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/IndexGrid/MapServer/0/query";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lng = parseFloat(searchParams.get("lng") || "");
  const lat = parseFloat(searchParams.get("lat") || "");

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: "Missing lng/lat" }, { status: 400 });
  }

  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "ALIAS",
    f: "json",
    returnGeometry: "false",
  });

  const res = await fetch(`${EIGHTY_ACRE_API}?${params}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json({}, { status: 200 });
  }

  const data = await res.json();
  const alias = data.features?.[0]?.attributes?.ALIAS || "";

  return NextResponse.json(
    { eightyAcrePage: alias },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    }
  );
}
