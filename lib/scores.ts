import type { MatchEvent } from "./types";

// ESPN's public (unofficial, no-key) scoreboard for the men's World Cup.
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export type ScoreInfo = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  state: "pre" | "in" | "post" | string;
  clock: string;
  detail: string;
  date?: string;
};

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function teamInTitle(team: string, title: string): boolean {
  const nt = norm(title);
  const full = norm(team);
  if (!full) return false;
  if (nt.includes(full)) return true;
  // fall back to the distinctive words (e.g. "South Korea" -> "korea")
  return full
    .split(" ")
    .filter((w) => w.length > 3)
    .some((w) => nt.includes(w));
}

async function fetchScoreboard(): Promise<ScoreInfo[]> {
  const r = await fetch(ESPN, { headers: { "User-Agent": "worldcupmoney/2.0" }, next: { revalidate: 20 } });
  if (!r.ok) throw new Error("scoreboard HTTP " + r.status);
  const d = await r.json();
  const out: ScoreInfo[] = [];
  for (const ev of d.events || []) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const cs = comp.competitors || [];
    const h = cs.find((c: any) => c.homeAway === "home") || cs[0];
    const a = cs.find((c: any) => c.homeAway === "away") || cs[1];
    if (!h || !a) continue;
    const st = comp.status || ev.status || {};
    out.push({
      home: h.team?.displayName || h.team?.name || "",
      away: a.team?.displayName || a.team?.name || "",
      homeScore: Number(h.score) || 0,
      awayScore: Number(a.score) || 0,
      state: st.type?.state || "pre",
      clock: st.displayClock || "",
      detail: st.type?.shortDetail || st.type?.detail || "",
      date: ev.date || comp.date || undefined,
    });
  }
  return out;
}

// Attach live scores to events and make `live` authoritative from game state.
export async function attachScores(events: MatchEvent[]): Promise<void> {
  let board: ScoreInfo[];
  try {
    board = await fetchScoreboard();
  } catch {
    return; // best-effort; odds still work without scores
  }
  for (const ev of events) {
    const s = board.find((b) => teamInTitle(b.home, ev.title) && teamInTitle(b.away, ev.title));
    if (!s) continue;
    ev.score = s;
    // ESPN's kickoff time is authoritative for ordering "next match" correctly.
    if (s.date) ev.kickoff = s.date;
    if (s.state === "in") ev.live = true;
    else if (s.state === "post") ev.live = false;
  }
}
