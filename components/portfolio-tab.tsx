"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/animated-number";
import { useSession } from "@/lib/session-context";
import { money } from "@/lib/utils";

export function PortfolioTab() {
  const { state, startSession, settle, removeBet, exportCSV } = useSession();
  const [start, setStart] = React.useState("");
  const [stop, setStop] = React.useState("");

  const profit = state.bankroll - state.startingBankroll;
  const settled = state.bets.filter((b) => b.status !== "open");
  const wins = settled.filter((b) => b.status === "won").length;
  const winRate = settled.length ? Math.round((wins / settled.length) * 100) : null;
  const stopHit = state.stopLoss > 0 && state.startingBankroll > 0 && state.bankroll <= state.stopLoss;

  // bankroll progression across settled bets
  const series = React.useMemo(() => {
    const pts = [{ i: 0, v: state.startingBankroll }];
    let v = state.startingBankroll;
    settled
      .slice()
      .sort((a, b) => a.placedAt - b.placedAt)
      .forEach((b, idx) => {
        v += b.status === "won" ? b.toReturn - b.stake : -b.stake;
        pts.push({ i: idx + 1, v: Math.round(v * 100) / 100 });
      });
    return pts;
  }, [settled, state.startingBankroll]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-inverse text-[#0A0A0B]">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#52525b]">Portfolio value</span>
          </CardHeader>
          <CardContent>
            <AnimatedNumber value={state.bankroll} format={(n) => money(n)} className="font-mono text-[44px] font-medium leading-none tracking-tight" />
            <div className="mt-2.5">
              <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-xs font-medium ${profit >= 0 ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                {profit >= 0 ? "+" : ""}
                {money(profit)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-tertiary">Realized win rate</span>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-[26px] font-medium">{winRate === null ? "—" : winRate + "%"}</div>
            <div className="mt-2 font-mono text-xs text-tertiary">
              {settled.length ? `${wins} of ${settled.length} settled bets won` : "no settled bets yet"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-tertiary">Stop-loss floor</span>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-[26px] font-medium">{state.stopLoss ? money(state.stopLoss) : "—"}</div>
            <div className="mt-2 font-mono text-xs">
              {stopHit ? <span className="text-no">Hit — walk away today.</span> : <span className="text-tertiary">{state.stopLoss ? "active" : "not set"}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {series.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Bankroll over your settled bets</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8501F" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#E8501F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" tick={{ fill: "#6B6B73", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6B6B73", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip
                  contentStyle={{ background: "#1C1C1F", border: "1px solid #26262A", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#A1A1AA" }}
                  formatter={(v: number) => [money(v), "bankroll"]}
                />
                <Area type="monotone" dataKey="v" stroke="#E8501F" strokeWidth={1.5} fill="url(#bk)" isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Start a session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Starting portfolio ($)" value={start} onChange={setStart} placeholder="20" />
            <Field label="Stop-loss floor ($)" value={stop} onChange={setStop} placeholder="8" />
            <Button className="mt-1 w-full" onClick={() => startSession(Number(start) || 0, Number(stop) || 0)}>
              Start day
            </Button>
            <p className="rounded-sm border border-border bg-secondary p-3 text-[12.5px] leading-relaxed text-muted-foreground">
              Compounding rolls winnings forward, so one loss ends the streak. The stop-loss is the hard line where you
              walk away. Only stake money you&apos;re fine losing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positions &amp; activity</CardTitle>
            <Button variant="secondary" size="sm" onClick={exportCSV}>
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {state.bets.length === 0 ? (
              <div className="py-8 text-center text-sm text-tertiary">No positions yet — fetch odds and place a bet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-tertiary">
                      <th className="border-b border-border py-2 text-left font-medium">Match</th>
                      <th className="border-b border-border py-2 text-left font-medium">Pick</th>
                      <th className="border-b border-border py-2 text-right font-medium">Stake</th>
                      <th className="border-b border-border py-2 text-right font-medium">Return</th>
                      <th className="border-b border-border py-2 text-left font-medium">Status</th>
                      <th className="border-b border-border py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.bets
                      .slice()
                      .reverse()
                      .map((b) => (
                        <tr key={b.id} className="text-[13px]">
                          <td className="border-b border-border py-2.5">{b.match}</td>
                          <td className="border-b border-border py-2.5 text-muted-foreground">{b.pick}</td>
                          <td className="border-b border-border py-2.5 text-right font-mono">{money(b.stake)}</td>
                          <td className="border-b border-border py-2.5 text-right font-mono text-yes">{money(b.toReturn)}</td>
                          <td className="border-b border-border py-2.5">
                            <Badge variant={b.status === "won" ? "yes" : b.status === "lost" ? "no" : "info"} className="normal-case tracking-normal">
                              {b.status}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap border-b border-border py-2.5 text-right">
                            {b.status === "open" ? (
                              <div className="flex justify-end gap-1.5">
                                <Button variant="yes" size="sm" onClick={() => settle(b.id, "won")}>
                                  Won
                                </Button>
                                <Button variant="no" size="sm" onClick={() => settle(b.id, "lost")}>
                                  Lost
                                </Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => removeBet(b.id)}>
                                ✕
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tertiary">{label}</div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-tertiary">$</span>
        <Input className="pl-6 font-mono" type="number" step="1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}
