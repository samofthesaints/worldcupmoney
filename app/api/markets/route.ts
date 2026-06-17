import { NextResponse } from "next/server";
import { fetchMatchEvents } from "@/lib/polymarket";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  try {
    const events = await fetchMatchEvents(q);
    return NextResponse.json({ ok: true, events });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e), events: [] });
  }
}
