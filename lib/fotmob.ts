// Best-effort FotMob client — same plain endpoints the raycast_gfb extension uses
// (https://www.fotmob.com/api/...). FotMob is an unofficial API and may rate-limit
// or require a signed header from datacenter IPs, so every call is wrapped and the
// caller treats a null result as "no data" (we fall back to web search).

const FM = "https://www.fotmob.com/api";

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ymd(d: Date): string {
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

function nameMatches(fmName: string, team: string): boolean {
  const a = norm(fmName);
  const b = norm(team);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const tok = (s: string) => s.split(" ").filter((w) => w.length > 3);
  return tok(a).some((w) => b.includes(w)) || tok(b).some((w) => a.includes(w));
}

async function fmGet(path: string): Promise<any> {
  const r = await fetch(FM + path, {
    headers: { "User-Agent": "Mozilla/5.0 worldcupmoney/2.0", Accept: "application/json" },
    next: { revalidate: 25 },
  });
  if (!r.ok) throw new Error("fotmob HTTP " + r.status);
  return r.json();
}

export type FotmobInsight = {
  matchId: number;
  league: string;
  scoreStr?: string;
  status?: string;
  momentum?: string;
  url: string;
  summary: string;
};

function teamsFromTitle(title: string): [string, string] | null {
  const parts = title.split(/\s+vs\.?\s+|\s+v\.?\s+/i);
  if (parts.length < 2) return null;
  return [parts[0].trim(), parts[1].replace(/\(.*\)/, "").trim()];
}

export async function getFotmobInsight(title: string, isoDate?: string): Promise<FotmobInsight | null> {
  const teams = teamsFromTitle(title);
  if (!teams) return null;
  const [home, away] = teams;

  // candidate dates: the kickoff date (if known), then today and ±1 day
  const dates: Date[] = [];
  if (isoDate) {
    const d = new Date(isoDate);
    if (!Number.isNaN(d.getTime())) dates.push(d);
  }
  const now = new Date();
  dates.push(now, new Date(now.getTime() + 864e5), new Date(now.getTime() - 864e5));

  let found: { id: number; league: string; scoreStr?: string; status?: string } | null = null;
  for (const d of dates) {
    let data: any;
    try {
      data = await fmGet(`/matches?date=${ymd(d)}`);
    } catch {
      continue;
    }
    for (const lg of data?.leagues || []) {
      if (!/world cup/i.test(lg?.name || "")) continue;
      for (const m of lg?.matches || []) {
        const h = m?.home?.name || "";
        const a = m?.away?.name || "";
        if (nameMatches(h, home) && nameMatches(a, away)) {
          found = { id: m.id, league: lg.name, scoreStr: m?.status?.scoreStr, status: m?.status?.liveTime?.short || (m?.status?.finished ? "FT" : "") };
          break;
        }
      }
      if (found) break;
    }
    if (found) break;
  }
  if (!found) return null;

  // pull momentum from match details (best-effort)
  let momentum: string | undefined;
  try {
    const det = await fmGet(`/matchDetails?matchId=${found.id}`);
    const mdata = det?.content?.matchFacts?.momentum?.main?.data;
    if (Array.isArray(mdata) && mdata.length) {
      const recent = mdata.slice(-12);
      const avg = recent.reduce((s: number, p: any) => s + (Number(p?.value) || 0), 0) / recent.length;
      momentum = avg > 3 ? `recent momentum favors ${home}` : avg < -3 ? `recent momentum favors ${away}` : "momentum roughly even";
    }
  } catch {
    /* ignore */
  }

  const bits = [`FotMob (${found.league})`];
  if (found.scoreStr) bits.push(`score ${found.scoreStr}${found.status ? " " + found.status : ""}`);
  if (momentum) bits.push(momentum);
  return {
    matchId: found.id,
    league: found.league,
    scoreStr: found.scoreStr,
    status: found.status,
    momentum,
    url: `https://www.fotmob.com/match/${found.id}`,
    summary: bits.join(" · "),
  };
}
