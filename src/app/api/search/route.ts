import { NextRequest, NextResponse } from "next/server";
import { searchParcels } from "@/lib/assessor";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const results = await searchParcels(q);
  return NextResponse.json(results);
}
