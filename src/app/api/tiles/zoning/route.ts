import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox");

  if (!bbox) {
    return NextResponse.json({ error: "Missing bbox" }, { status: 400 });
  }

  // City of Chicago Zoning MapServer — show zoning fills (15), Planned Developments (2),
  // Downtown Area (10), and Special Districts (9) to cover all zone types including the Loop
  const url =
    `https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/export?` +
    `dpi=96&transparent=true&format=png32&` +
    `layers=show:2,9,10,15&` +
    `bbox=${bbox}&bboxSR=3857&imageSR=3857&size=256,256&f=image`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
