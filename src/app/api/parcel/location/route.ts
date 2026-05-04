import { NextRequest, NextResponse } from "next/server";
import { fetchParcelByLocation } from "@/lib/assessor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lng = parseFloat(searchParams.get("lng") || "");
  const lat = parseFloat(searchParams.get("lat") || "");

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const data = await fetchParcelByLocation(lng, lat);
  if (!data) {
    return NextResponse.json({ error: "Parcel not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200" },
  });
}
