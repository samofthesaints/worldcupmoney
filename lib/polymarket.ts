import type { Market, MarketGroup, MatchEvent, Outcome, PricePoint } from "./types";
import { priceMetrics } from "./utils";
import { attachScores } from "./scores";

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";
const DATA = "https://data-api.polymarket.com";

// Only show actual matches ("Brazil vs. Haiti"), never tournament futures
// ("Who will win the World Cup", group winners, top scorer, to-advance, etc.).
const MATCH_RE = /\bvs\.?\b/i;
const FUTURES_RE = /(to win the|winner|top scorer|golden (boot|ball)|to advance|to reach|group [a-l]\b|champion|to qualify)/i;
const WORLDCUP_RE = /world ?cup/i;
const MATCH_WINDOW_MS = 2.75 * 60 * 60 * 1000; // a soccer match is "live" for ~2h45m after kickoff

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

// World Cup match events use the slug "fifwc-<home>-<away>-<date>", e.g.
// "fifwc-eng-hrv-2026-06-17". That prefix is the most reliable way to pick out
// actual matches (and exclude futures like "World Cup goals" / "World Cup winner").
function isWorldCupMatch(ev: any): boolean {
  return (ev.slug || "").toLowerCase().startsWith("fifwc");
}

// Heuristic fallback when slugs aren't available: tags / slug / series + title.
function isWorldCup(ev: any): boolean {
  const direct = `${ev.title || ""} ${ev.slug || ""} ${ev.seriesSlug || ""}`;
  if (WORLDCUP_RE.test(direct)) return true;
  const groups = [...(ev.tags || []), ...(ev.series || [])];
  for (const t of groups) {
    if (typeof t === "string") {
      if (WORLDCUP_RE.test(t)) return true;
    } else if (t && typeof t === "object") {
      if (WORLDCUP_RE.test(`${t.label || ""} ${t.slug || ""} ${t.title || ""}`)) return true;
    }
  }
  return false;
}

function kickoffOf(ev: any): string | undefined {
  if (ev.startDate) return ev.startDate;
  for (const m of ev.markets || []) {
    if (m.gameStartTime) return m.gameStartTime;
  }
  return undefined;
}

function isLiveNow(kickoff?: string, closed?: boolean): boolean {
  if (closed || !kickoff) return false;
  const k = Date.parse(kickoff);
  if (Number.isNaN(k)) return false;
  const now = Date.now();
  return now >= k && now <= k + MATCH_WINDOW_MS;
}

async function gammaGet(path: string) {
  const r = await fetch(GAMMA + path, {
    headers: { "User-Agent": "worldcupmoney/2.0" },
    next: { revalidate: 15 },
  });
  if (!r.ok) throw new Error("Polymarket returned HTTP " + r.status);
  return r.json();
}

const WORLDCUP_TAG_SLUGS = ["world-cup", "fifa-world-cup", "fifa-world-cup-2026", "worldcup"];

export async function fetchMatchEvents(query: string): Promise<MatchEvent[]> {
  const q = query.trim().toLowerCase();

  // Strategy 1: fetch the World Cup tag and keep events whose slug marks them as
  // matches ("fifwc-…"). Try a few possible tag slugs.
  let out: MatchEvent[] = [];
  let lastRaw: any[] = [];
  for (const slug of WORLDCUP_TAG_SLUGS) {
    const raw = await fetchEventsPage(slug);
    if (raw.length) {
      lastRaw = raw;
      const built = buildEvents(raw, q, true);
      if (built.length) {
        out = built;
        break;
      }
    }
  }

  // Strategy 2: broad fetch, still keep only "fifwc-…" match slugs.
  if (!out.length) {
    lastRaw = await fetchEventsPage(undefined);
    out = buildEvents(lastRaw, q, true);
  }

  // Strategy 3: last resort — no fifwc slugs found at all, fall back to the
  // title/tag heuristic so we degrade rather than show nothing.
  if (!out.length) {
    out = buildEvents(lastRaw, q, false);
  }

  // attach live scores / authoritative in-play status (best-effort)
  await attachScores(out);

  out.sort((a, b) => {
    if (a.live !== b.live) return Number(b.live) - Number(a.live);
    const ka = a.kickoff ? Date.parse(a.kickoff) : Infinity;
    const kb = b.kickoff ? Date.parse(b.kickoff) : Infinity;
    if (ka !== kb) return ka - kb;
    return (b.volume24hr || 0) - (a.volume24hr || 0);
  });
  return out.slice(0, 60);
}

async function fetchEventsPage(tagSlug?: string): Promise<any[]> {
  const all: any[] = [];
  for (const offset of [0, 100, 200]) {
    let events: any[];
    try {
      const tag = tagSlug ? `&tag_slug=${tagSlug}` : "";
      events = await gammaGet(
        `/events?closed=false&active=true&limit=100&offset=${offset}&order=volume24hr&ascending=false${tag}`,
      );
    } catch {
      break;
    }
    if (!events || !events.length) break;
    all.push(...events);
    if (events.length < 100) break;
  }
  return all;
}

function buildEvents(raw: any[], q: string, strict: boolean): MatchEvent[] {
  const out: MatchEvent[] = [];
  const seen = new Set<string>();

  for (const ev of raw) {
    const title: string = ev.title || "";
    if (strict) {
      // reliable: a real match has an "fifwc-…" slug
      if (!isWorldCupMatch(ev)) continue;
    } else {
      // heuristic fallback
      if (!isWorldCup(ev)) continue;
      if (!MATCH_RE.test(title) || FUTURES_RE.test(title)) continue;
    }
    if (q && !title.toLowerCase().includes(q)) continue;

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

    const kickoff = kickoffOf(ev);
    out.push({
      title,
      slug: ev.slug,
      endDate: ev.endDate,
      kickoff,
      volume24hr: ev.volume24hr,
      live: isLiveNow(kickoff, ev.closed),
      markets,
    });
  }
  return out;
}

import type { Position } from "./types";

export function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
}

// Read-only: a wallet's current Polymarket positions from the public Data API.
export async function fetchPositions(address: string): Promise<{ value: number; positions: Position[] }> {
  const url = `${DATA}/positions?user=${address}&sizeThreshold=0.1&limit=200&sortBy=CURRENT&sortDirection=DESC`;
  const r = await fetch(url, { headers: { "User-Agent": "worldcupmoney/2.0" }, next: { revalidate: 30 } });
  if (!r.ok) throw new Error("positions HTTP " + r.status);
  const data = await r.json();
  const positions: Position[] = (Array.isArray(data) ? data : []).map((p: any) => ({
    title: p.title || p.slug || "Position",
    outcome: p.outcome ?? "",
    size: Number(p.size) || 0,
    avgPrice: Number(p.avgPrice) || 0,
    curPrice: Number(p.curPrice) || 0,
    value: Number(p.currentValue) || 0,
    pnl: Number(p.cashPnl) || 0,
    pnlPct: Number(p.percentPnl) || 0,
    redeemable: !!p.redeemable,
    slug: p.slug,
  }));
  const value = positions.reduce((s, p) => s + p.value, 0);
  return { value: Math.round(value * 100) / 100, positions };
}

export async function fetchPriceHistory(tokenId: string): Promise<PricePoint[]> {
  const url = `${CLOB}/prices-history?market=${encodeURIComponent(tokenId)}&interval=1d&fidelity=15`;
  const r = await fetch(url, { headers: { "User-Agent": "worldcupmoney/2.0" }, next: { revalidate: 30 } });
  if (!r.ok) throw new Error("history HTTP " + r.status);
  const data = await r.json();
  const pts = (data.history || []) as Array<{ t: number; p: number }>;
  return pts.map((x) => ({ t: x.t, p: x.p }));
}
