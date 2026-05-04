import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox");

  if (!bbox) {
    return NextResponse.json({ error: "Missing bbox" }, { status: 400 });
  }

  // City of Chicago Zoning MapServer
  const url =
    `https://gis.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/export?` +
    `dpi=96&transparent=true&format=png32&` +
    `bbox=${bbox}&bboxSR=3857&imageSR=3857&size=256,256&f=image`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
