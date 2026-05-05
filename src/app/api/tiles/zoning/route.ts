import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox");

  if (!bbox) {
    return NextResponse.json({ error: "Missing bbox" }, { status: 400 });
  }

  // City of Chicago Zoning MapServer — layer 15 contains all zone types (RS, RT, RM, B, C, DC, DX, M, PD, POS)
  // Using PNG8 for ~70% smaller files and faster transfer
  const url =
    `https://gisapps.chicago.gov/arcgis/rest/services/ExternalApps/Zoning/MapServer/export?` +
    `dpi=96&transparent=true&format=png8&` +
    `layers=show:15&` +
    `bbox=${bbox}&bboxSR=3857&imageSR=3857&size=512,512&f=image`;

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
