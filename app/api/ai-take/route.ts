import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      error:
        "AI take is off. Add an ANTHROPIC_API_KEY environment variable (in Vercel: Project → Settings → Environment Variables) to enable it.",
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" });
  }
  const match: string = (body?.match || "").toString().slice(0, 120);
  const odds: Array<{ name: string; price: number }> = Array.isArray(body?.odds) ? body.odds : [];
  if (!match) return NextResponse.json({ ok: false, error: "missing match" });

  const oddsLine =
    odds.map((o) => `${o.name}: ${Math.round(o.price * 100)}¢ (${(o.price * 100).toFixed(0)}%)`).join(", ") ||
    "no odds provided";

  const prompt = `You are a sharp, honest football betting analyst helping someone make small, educated World Cup bets.

Match: ${match}
Current Polymarket odds: ${oddsLine}

Use web search to research THIS specific match and gather:
- FIFA world rankings of both teams
- recent form (each team's last ~5 results) and any momentum
- head-to-head history
- injuries, suspensions, and lineup/rotation news
- what's at stake (group situation, must-win, etc.)

Then write a concise take (max ~180 words, plain text, no markdown headers):
1. 2-4 sentences of the key, current context you found (rankings, form, injuries).
2. Your recommended bet and why it's value vs the Polymarket price — this can be a
   moneyline pick, a total-goals lean (over/under), OR a player prop (e.g. "X to score 2+")
   if the matchup supports it. If the price already looks fair, say "no clear edge".
3. A confidence label: Low, Medium, or High.

Be honest: prediction markets are efficient and hard to beat. Don't manufacture an edge.
End with: "Not financial advice — bet small."`;

  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }] as any,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ ok: true, take: text || "No response generated." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) });
  }
}
