import { NextResponse } from "next/server";
import { fetchPositions, isValidAddress } from "@/lib/polymarket";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const address = (new URL(req.url).searchParams.get("address") || "").trim();
  if (!isValidAddress(address)) {
    return NextResponse.json({ ok: false, error: "Enter a valid 0x… wallet address", value: 0, positions: [] });
  }
  try {
    const { value, positions } = await fetchPositions(address);
    return NextResponse.json({ ok: true, value, positions });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e), value: 0, positions: [] });
  }
}
