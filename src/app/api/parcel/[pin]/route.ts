import { NextRequest, NextResponse } from "next/server";
import { fetchParcelByPIN } from "@/lib/assessor";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  if (!pin || pin.length < 5) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
  }

  const data = await fetchParcelByPIN(pin);
  if (!data) {
    return NextResponse.json({ error: "Parcel not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200" },
  });
}
