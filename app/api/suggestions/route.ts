import { NextResponse } from "next/server";
import { fetchMatchEvents } from "@/lib/polymarket";
import { buildSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  try {
    const events = await fetchMatchEvents(q);
    const suggestions = await buildSuggestions(events);
    return NextResponse.json({ ok: true, suggestions });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e), suggestions: [] });
  }
}
