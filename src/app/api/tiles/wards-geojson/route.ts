import { NextResponse } from "next/server";

const WARD_QUERY_URL =
  "https://gisapps.chicago.gov/arcgis/rest/services/311/311_layers/MapServer/21/query";

export async function GET() {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "WARD",
    f: "geojson",
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: "50",
  });

  const res = await fetch(`${WARD_QUERY_URL}?${params}`, {
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
