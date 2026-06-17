import type { Market, MarketGroup, MatchEvent, Outcome, PricePoint } from "./types";
import { priceMetrics } from "./utils";

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

// Only show actual matches ("Brazil vs. Haiti"), never tournament futures
// ("Who will win the World Cup", group winners, top scorer, to-advance, etc.).
const MATCH_RE = /\bvs\.?\b/i;
const FUTURES_RE = /(to win the|winner|top scorer|golden (boot|ball)|to advance|to reach|group [a-l]\b|champion)/i;

function parseField(val: unknown): string[] | null {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
}

function marketGroup(question: string): MarketGroup {
  const q = (question || "").toLowerCase();
  if (/\b\d+\s*[-–]\s*\d+\b/.test(q) || q.includes("exact score") || q.includes("correct score"))
    return "Exact score";
  if (q.includes("total") || q.includes("goals") || q.includes("over") || q.includes("under"))
    return "Total goals";
  if (q.includes(" vs") || q.includes("to win") || q.includes("winner") || q.includes("draw") || q.includes("moneyline"))
    return "Moneyline";
  return "Other";
}

const GROUP_ORDER: Record<MarketGroup, number> = {
  Moneyline: 0,
  "Total goals": 1,
  "Exact score": 2,
  Other: 3,
};

const DEFAULT_TERMS = ["world cup", " vs", " vs.", "v.s", "group "];

async function gammaGet(path: string) {
  const r = await fetch(GAMMA + path, {
    headers: { "User-Agent": "worldcupmoney/2.0" },
    next: { revalidate: 15 },
  });
  if (!r.ok) throw new Error("Polymarket returned HTTP " + r.status);
  return r.json();
}

function isLive(ev: any): boolean {
  const now = Date.now();
  const start = ev.startDate ? Date.parse(ev.startDate) : NaN;
  const end = ev.endDate ? Date.parse(ev.endDate) : NaN;
  if (!Number.isNaN(start) && now >= start && (Number.isNaN(end) || now < end)) return true;
  return false;
}

export async function fetchMatchEvents(query: string): Promise<MatchEvent[]> {
  const terms = query ? [query.toLowerCase()] : DEFAULT_TERMS;
  const out: MatchEvent[] = [];
  const seen = new Set<string>();

  for (const offset of [0, 100, 200]) {
    let events: any[];
    try {
      events = await gammaGet(
        `/events?closed=false&active=true&limit=100&offset=${offset}&order=volume24hr&ascending=false`,
      );
    } catch (e) {
      if (out.length) break;
      throw e;
    }
    if (!events || !events.length) break;

    for (const ev of events) {
      const title: string = ev.title || "";
      // hard gate: must look like a match, must not look like a futures market
      if (!MATCH_RE.test(title) || FUTURES_RE.test(title)) continue;

      const hay = title.toLowerCase();
      const matched =
        terms.some((t) => hay.includes(t)) ||
        (ev.markets || []).some((m: any) => terms.some((t) => (m.question || "").toLowerCase().includes(t)));
      if (!matched) continue;

      const eid = ev.id || ev.slug || title;
      if (seen.has(eid)) continue;
      seen.add(eid);

      const markets: Market[] = [];
      for (const m of ev.markets || []) {
        if (m.closed || m.active === false) continue;
        const names = parseField(m.outcomes);
        const prices = parseField(m.outcomePrices);
        const tokens = parseField(m.clobTokenIds);
        if (!names || !prices || names.length !== prices.length) continue;

        const outcomes: Outcome[] = [];
        let sum = 0;
        for (let i = 0; i < names.length; i++) {
          const mm = priceMetrics(Number(prices[i]));
          if (!mm) continue;
          sum += mm.price;
          outcomes.push({
            name: names[i],
            price: mm.price,
            impliedPct: mm.impliedPct,
            decimalOdds: mm.decimalOdds,
            tokenId: tokens && tokens[i] ? tokens[i] : undefined,
          });
        }
        if (!outcomes.length) continue;
        markets.push({
          question: m.question || title,
          group: marketGroup(m.question || ""),
          outcomes,
          overhead: Math.round((sum - 1) * 1000) / 1000,
        });
      }
      if (!markets.length) continue;
      markets.sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group]);

      out.push({
        title,
        slug: ev.slug,
        endDate: ev.endDate,
        volume24hr: ev.volume24hr,
        live: isLive(ev),
        markets,
      });
    }
    if (events.length < 100) break;
  }
  // live matches first, then by 24h volume
  out.sort((a, b) => Number(b.live) - Number(a.live) || (b.volume24hr || 0) - (a.volume24hr || 0));
  return out.slice(0, 40);
}

export async function fetchPriceHistory(tokenId: string): Promise<PricePoint[]> {
  // fidelity = minutes per point; interval = window. 1d window is plenty for a match.
  const url = `${CLOB}/prices-history?market=${encodeURIComponent(tokenId)}&interval=1d&fidelity=15`;
  const r = await fetch(url, { headers: { "User-Agent": "worldcupmoney/2.0" }, next: { revalidate: 30 } });
  if (!r.ok) throw new Error("history HTTP " + r.status);
  const data = await r.json();
  const pts = (data.history || []) as Array<{ t: number; p: number }>;
  return pts.map((x) => ({ t: x.t, p: x.p }));
}
