import { NextResponse } from "next/server";

const ADU_QUERY_URL =
  "https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/17/query";

export async function GET() {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "ADU_AREA,ZONE,TEXT",
    f: "geojson",
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: "100",
  });

  const res = await fetch(`${ADU_QUERY_URL}?${params}`, {
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
    },
  });
}
