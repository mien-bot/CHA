import { NextRequest, NextResponse } from "next/server";

// Convert tile coordinates to EPSG:3857 bounding box
function tileToBBox(z: number, x: number, y: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const n2 = Math.PI - (2 * Math.PI * (y + 1)) / Math.pow(2, z);

  const lng1 = (x / Math.pow(2, z)) * 360 - 180;
  const lng2 = ((x + 1) / Math.pow(2, z)) * 360 - 180;

  // Convert to Web Mercator (EPSG:3857)
  const toMercX = (lng: number) => (lng * 20037508.3427892) / 180;
  const toMercY = (lat: number) => {
    const rad = (lat * Math.PI) / 180;
    return (Math.log(Math.tan(Math.PI / 4 + rad / 2)) / Math.PI) * 20037508.3427892;
  };

  const lat1 = (Math.atan(Math.exp(n)) * 360) / Math.PI - 90;
  const lat2 = (Math.atan(Math.exp(n2)) * 360) / Math.PI - 90;

  return `${toMercX(lng1)},${toMercY(lat2)},${toMercX(lng2)},${toMercY(lat1)}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ z: string; y: string; x: string }> }
) {
  const { z, y, x } = await params;
  const zi = parseInt(z), yi = parseInt(y), xi = parseInt(x);

  const bbox = tileToBBox(zi, xi, yi);

  // Cook County GIS dynamic export for parcel outlines
  const url =
    `https://gis.cookcountyil.gov/traditional/rest/services/CookViewer3Parcels/MapServer/export?` +
    `dpi=96&transparent=true&format=png32&` +
    `bbox=${bbox}&bboxSR=3857&imageSR=3857&size=512,512&f=image`;

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
