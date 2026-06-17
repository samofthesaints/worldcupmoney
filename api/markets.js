// Serverless proxy for Polymarket's public Gamma API.
// Runs server-side so the browser never hits Polymarket directly (no CORS issues).
// Returns active events that match the search, each with all its markets grouped
// (moneyline, total goals, exact scores) and per-outcome odds.

const GAMMA = "https://gamma-api.polymarket.com";
const DEFAULT_TERMS = ["world cup", " vs", " vs.", "v.s", "to win", "group "];

function metrics(price) {
  const p = Number(price);
  if (!(p > 0 && p < 1)) return null;
  return {
    price: Math.round(p * 1e4) / 1e4,
    implied_pct: Math.round(p * 1000) / 10,
    decimal_odds: Math.round((1 / p) * 1000) / 1000,
  };
}

function parseField(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return null; } }
  return null;
}

function marketGroup(question) {
  const q = (question || "").toLowerCase();
  if (/\b\d+\s*[-–]\s*\d+\b/.test(q) || q.includes("exact score") || q.includes("correct score"))
    return "Exact score";
  if (q.includes("total") || q.includes("goals") || q.includes("over") || q.includes("under"))
    return "Total goals";
  if (q.includes(" vs") || q.includes("to win") || q.includes("winner") || q.includes("draw") || q.includes("moneyline"))
    return "Moneyline";
  return "Other";
}

async function gammaGet(path) {
  const r = await fetch(GAMMA + path, { headers: { "User-Agent": "worldcupmoney/1.0" } });
  if (!r.ok) throw new Error("Polymarket returned HTTP " + r.status);
  return r.json();
}

async function fetchEvents(query) {
  const terms = query ? [query.toLowerCase()] : DEFAULT_TERMS;
  const out = [];
  const seen = new Set();
  const order = { Moneyline: 0, "Total goals": 1, "Exact score": 2, Other: 3 };

  for (const offset of [0, 100, 200]) {
    let events;
    try {
      events = await gammaGet(
        `/events?closed=false&active=true&limit=100&offset=${offset}&order=volume24hr&ascending=false`
      );
    } catch (e) { if (out.length) break; else throw e; }
    if (!events || !events.length) break;

    for (const ev of events) {
      const title = ev.title || "";
      const hay = title.toLowerCase();
      const matched =
        terms.some((t) => hay.includes(t)) ||
        (ev.markets || []).some((m) => terms.some((t) => (m.question || "").toLowerCase().includes(t)));
      if (!matched) continue;

      const eid = ev.id || ev.slug || title;
      if (seen.has(eid)) continue;
      seen.add(eid);

      const markets = [];
      for (const m of ev.markets || []) {
        if (m.closed || m.active === false) continue;
        const outcomes = parseField(m.outcomes);
        const prices = parseField(m.outcomePrices);
        if (!outcomes || !prices || outcomes.length !== prices.length) continue;
        const opts = [];
        for (let i = 0; i < outcomes.length; i++) {
          const mm = metrics(prices[i]);
          if (mm) opts.push({ name: outcomes[i], ...mm });
        }
        if (!opts.length) continue;
        markets.push({ question: m.question || title, group: marketGroup(m.question || ""), outcomes: opts });
      }
      if (!markets.length) continue;
      markets.sort((a, b) => (order[a.group] ?? 3) - (order[b.group] ?? 3));
      out.push({ title, slug: ev.slug, end_date: ev.endDate, volume24hr: ev.volume24hr, markets });
    }
    if (events.length < 100) break;
  }
  return out.slice(0, 40);
}

export default async function handler(req, res) {
  const q = ((req.query && req.query.q) || "").toString().trim();
  res.setHeader("Cache-Control", "s-maxage=15, stale-while-revalidate=30");
  try {
    const events = await fetchEvents(q);
    res.status(200).json({ ok: true, events });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e.message || e), events: [] });
  }
}
