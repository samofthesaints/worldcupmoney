import { NextResponse } from "next/server";
import { fetchPriceHistory } from "@/lib/polymarket";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = (new URL(req.url).searchParams.get("token") || "").trim();
  if (!token) return NextResponse.json({ ok: false, error: "missing token", points: [] });
  try {
    const points = await fetchPriceHistory(token);
    return NextResponse.json({ ok: true, points });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e), points: [] });
  }
}
