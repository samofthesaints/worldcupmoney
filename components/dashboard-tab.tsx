"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";
import { ArrowUpRight, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/animated-number";
import { SuggestionsPanel } from "@/components/suggestions-panel";
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
  const profitPct = state.startingBankroll > 0 ? (profit / state.startingBankroll) * 100 : 0;

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* LEFT — light feature card + a stat */}
      <div className="space-y-4 lg:col-span-3">
        <Card className="bg-inverse text-[#0A0A0B]">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#52525b]">Portfolio value</span>
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={state.bankroll} format={money} className="font-mono text-[40px] font-medium leading-none tracking-tight" />
            <div className="mt-2.5">
              <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-xs font-medium ${profit >= 0 ? "bg-[#0F2E1C] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                {profit >= 0 ? "+" : ""}
                {money(profit)}
              </span>
            </div>
            <div className="mt-4 h-[120px]">
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-tertiary">Open positions</div>
              <div className="mt-1 font-mono text-2xl font-medium">{state.bets.filter((b) => b.status === "open").length}</div>
            </div>
            <Button variant="secondary" size="icon" onClick={() => onNavigate("portfolio")}>
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE — match list + P&L */}
      <div className="space-y-4 lg:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>
              Matches {liveCount > 0 && <span className="ml-1 font-mono text-[11px] font-normal text-no">{liveCount} live</span>}
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => onNavigate("markets")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-0">
            {events === null && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="my-2 h-9 w-full" />)}
            {events && events.length === 0 && <div className="py-8 text-center text-[13px] text-tertiary">No World Cup matches open right now.</div>}
            {events?.slice(0, 6).map((ev) => {
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

        <Card>
          <CardHeader className="pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-tertiary">Profit today</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <AnimatedNumber
                value={profitPct}
                format={(n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%"}
                className={`font-mono text-[32px] font-medium leading-none ${profit >= 0 ? "text-yes" : "text-no"}`}
              />
              <div className="flex h-12 items-end gap-2">
                <div className="w-7 rounded-t-sm bg-secondary" style={{ height: "55%" }} title="start" />
                <div
                  className="w-7 rounded-t-sm"
                  style={{ height: "100%", backgroundColor: profit >= 0 ? "#22C55E" : "#EF4444" }}
                  title="now"
                />
              </div>
            </div>
            <div className="mt-2 font-mono text-[11px] text-tertiary">
              {state.startingBankroll > 0 ? `from ${money(state.startingBankroll)} start` : "set a starting portfolio in Portfolio"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT — suggestions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-5">
        <SuggestionsPanel limit={6} />
      </motion.div>
    </div>
  );
}
