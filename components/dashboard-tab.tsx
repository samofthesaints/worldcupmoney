"use client";

import * as React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/animated-number";
import { LiveHero } from "@/components/live-hero";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import { PositionsPanel } from "@/components/positions-panel";
import { useSession } from "@/lib/session-context";
import type { MatchEvent } from "@/lib/types";
import { kickoffLabel, money, outcomeColor } from "@/lib/utils";

export function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { state } = useSession();
  const [events, setEvents] = React.useState<MatchEvent[] | null>(null);

  const load = React.useCallback(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => setEvents([]));
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const settled = state.bets.filter((b) => b.status !== "open");
  const profit = state.bankroll - state.startingBankroll;

  const liveEvent = (events || []).find((e) => e.live) || null;
  const heroEvent = liveEvent || (events && events.length ? events[0] : null);

  const bars = React.useMemo(() => {
    let v = state.startingBankroll;
    const pts = [{ v }];
    settled
      .slice()
      .sort((a, b) => a.placedAt - b.placedAt)
      .forEach((b) => {
        v += b.status === "won" ? b.toReturn - b.stake : -b.stake;
        pts.push({ v: Math.round(v * 100) / 100 });
      });
    return pts;
  }, [settled, state.startingBankroll]);

  const liveCount = (events || []).filter((e) => e.live).length;

  return (
    <div className="space-y-4">
      {/* TOP: live hero + portfolio */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {events === null ? <Skeleton className="h-[260px] w-full" /> : <LiveHero ev={heroEvent} isNext={!liveEvent} />}
        </div>

        <Card className="bg-inverse text-[#0A0A0B] lg:col-span-4">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#52525b]">Portfolio value</span>
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={state.bankroll} format={money} className="font-mono text-[40px] font-medium leading-none tracking-tight" />
            <div className="mt-2.5">
              <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-xs font-medium ${profit >= 0 ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                {profit >= 0 ? "+" : ""}
                {money(profit)}
              </span>
            </div>
            <div className="mt-4 h-[96px]">
              {bars.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                      {bars.map((_, i) => (
                        <Cell key={i} fill={i === bars.length - 1 ? "#E8501F" : "#0A0A0B"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-end gap-1.5">
                  {[40, 70, 45, 90, 60, 30].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm bg-[#0A0A0B]/15" style={{ height: `${h}%` }} />
                  ))}
                </div>
              )}
            </div>
            <Button variant="secondary" size="sm" className="mt-3 w-full !bg-[#d4d4cc] !text-[#0A0A0B] hover:!bg-[#c8c8bf]" onClick={() => onNavigate("portfolio")}>
              Manage bankroll
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* BOTTOM: matches + positions + suggestions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              Matches {liveCount > 0 && <span className="ml-1 font-mono text-[11px] font-normal text-no">{liveCount} live</span>}
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => onNavigate("markets")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {events === null && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="my-2 h-9 w-full" />)}
            {events && events.length === 0 && <div className="py-8 text-center text-[13px] text-tertiary">No World Cup matches open right now.</div>}
            {events?.slice(0, 7).map((ev) => {
              const ml = ev.markets.find((m) => m.group === "Moneyline") ?? ev.markets[0];
              const fav = ml.outcomes.slice().sort((a, b) => b.price - a.price)[0];
              return (
                <button
                  key={ev.slug || ev.title}
                  onClick={() => onNavigate("markets")}
                  className="flex w-full items-center gap-2.5 border-b border-border py-2.5 text-left last:border-0 hover:opacity-80"
                >
                  {ev.live ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-no opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-no" />
                    </span>
                  ) : (
                    <span className="w-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium leading-tight">{ev.title}</div>
                    <div className="font-mono text-[10px] text-tertiary">{ev.live ? "Live now" : kickoffLabel(ev.kickoff) || "—"}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-medium" style={{ color: outcomeColor(0) }}>
                      {fav.impliedPct}%
                    </div>
                    <div className="truncate text-[10px] text-tertiary">{fav.name}</div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <PositionsPanel />
        <SuggestionsPanel limit={5} />
      </div>
    </div>
  );
}
