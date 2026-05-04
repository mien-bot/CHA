import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ z: string; y: string; x: string }> }
) {
  const { z, y, x } = await params;

  // Cook County GIS Parcel tile service
  const url = `https://gis.cookcountyil.gov/traditional/rest/services/cookVoterParcels/MapServer/tile/${z}/${y}/${x}`;

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
