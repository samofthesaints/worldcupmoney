import { fetchPriceHistory } from "./polymarket";
import type { MatchEvent, Signal, Suggestion } from "./types";
import { cents } from "./utils";

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

// How much an outcome's price moved over the available window, from price history.
async function priceDelta(tokenId?: string): Promise<number | null> {
  if (!tokenId) return null;
  try {
    const pts = await fetchPriceHistory(tokenId);
    if (pts.length < 2) return null;
    const last = pts[pts.length - 1].p;
    // baseline ~6h back if we have enough points (15-min fidelity -> 24 points)
    const baseIdx = Math.max(0, pts.length - 24);
    const base = pts[baseIdx].p;
    return last - base;
  } catch {
    return null;
  }
}

/**
 * Build ranked, explainable suggestions purely from prediction-market data.
 * These are signals, not certainties — the market is hard to beat.
 */
export async function buildSuggestions(events: MatchEvent[]): Promise<Suggestion[]> {
  const top = events.slice(0, 8);
  const suggestions: Suggestion[] = [];

  for (const ev of top) {
    const ml = ev.markets.find((m) => m.group === "Moneyline") ?? ev.markets[0];
    if (!ml) continue;

    // price movement per outcome (best-effort; null if history unavailable)
    const deltas = await Promise.all(ml.outcomes.map((o) => priceDelta(o.tokenId)));

    let bestIdx = -1;
    let bestScore = -Infinity;
    ml.outcomes.forEach((o, i) => {
      const delta = deltas[i] ?? 0;
      const valueScore = clamp((0.05 - ev.markets[0].overhead) / 0.05); // fairer book = better
      const momentumScore = clamp((delta + 0.08) / 0.16); // -8c..+8c -> 0..1
      const sweetSpot = clamp(1 - Math.abs(o.price - 0.45) * 1.4); // avoid heavy favs/longshots
      let score = 0.42 * momentumScore + 0.33 * valueScore + 0.25 * sweetSpot;
      if (ev.live) score += 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    if (bestIdx < 0) continue;

    const pick = ml.outcomes[bestIdx];
    const delta = deltas[bestIdx] ?? 0;
    const signals: Signal[] = [];

    if (ev.live) signals.push({ kind: "live", label: "Live now", detail: "Match is in play — prices move fast." });
    if (delta >= 0.03)
      signals.push({
        kind: "momentum",
        label: "Money moving in",
        detail: `Price rose ${cents(delta).replace("¢", "")}¢ recently toward ${pick.name}.`,
      });
    if (ev.markets[0].overhead <= 0.03)
      signals.push({
        kind: "value",
        label: "Low overhead",
        detail: `Tight pricing (${(ev.markets[0].overhead * 100).toFixed(1)}% vig) — fair value.`,
      });
    if (pick.price >= 0.6)
      signals.push({ kind: "favorite", label: "Solid favorite", detail: "Lower payout, safer leg to anchor a chain." });
    if (!signals.length)
      signals.push({ kind: "value", label: "Balanced price", detail: "Reasonable risk/reward at this price." });

    const reasoning = buildReasoning(ev.title, pick.name, pick.price, delta, ev.markets[0].overhead, ev.live);

    suggestions.push({
      match: ev.title,
      pick: pick.name + " — " + ml.group,
      group: ml.group,
      price: pick.price,
      impliedPct: pick.impliedPct,
      decimalOdds: pick.decimalOdds,
      score: Math.round(bestScore * 1000) / 10,
      signals,
      reasoning,
      odds: ml.outcomes.map((o) => ({ name: o.name, price: o.price })),
      endDate: ev.endDate,
      kickoff: ev.kickoff,
      live: ev.live,
    });
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, 10);
}

function buildReasoning(
  match: string,
  pick: string,
  price: number,
  delta: number,
  overhead: number,
  live?: boolean,
): string {
  const parts: string[] = [];
  parts.push(`In ${match}, the market prices ${pick} at ${cents(price)} (${(price * 100).toFixed(0)}% implied).`);
  if (delta >= 0.03) parts.push(`That price has been climbing — money is flowing toward this side.`);
  else if (delta <= -0.03) parts.push(`The price has drifted down lately, so treat the lean cautiously.`);
  if (overhead <= 0.03) parts.push(`Pricing is tight (${(overhead * 100).toFixed(1)}% overhead), so there's little built-in house edge.`);
  if (price >= 0.6) parts.push(`As a favorite it's a lower-payout, steadier pick — a sensible first leg in a compounding chain.`);
  else if (price <= 0.4) parts.push(`It carries a bigger payout but more risk — size it small.`);
  if (live) parts.push(`The match is live, so this can change minute to minute.`);
  return parts.join(" ");
}
