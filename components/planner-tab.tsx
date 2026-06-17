"use client";

import * as React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session-context";
import { money, priceMetrics } from "@/lib/utils";

export function PlannerTab() {
  const { state } = useSession();
  const [legsRaw, setLegsRaw] = React.useState("");
  const [start, setStart] = React.useState("");
  const [fraction, setFraction] = React.useState("1");

  const result = React.useMemo(() => {
    const prices = legsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
    const startNum = Number(start) || 0;
    const frac = Math.min(Math.max(Number(fraction), 0), 1);
    if (!prices.length || !startNum) return null;
    let bankroll = startNum;
    let combined = 1;
    const legs = prices.map((p, i) => {
      const m = priceMetrics(p);
      if (!m) return { i: i + 1, error: true as const, price: p };
      const stake = bankroll * frac;
      const after = bankroll - stake + stake * m.payout;
      combined *= m.price;
      const leg = { i: i + 1, error: false as const, price: m.price, impliedPct: m.impliedPct, stake, after };
      bankroll = after;
      return leg;
    });
    return { legs, final: bankroll, profit: bankroll - startNum, combined: combined * 100, start: startNum };
  }, [legsRaw, start, fraction]);

  const chartData = result?.legs.filter((l) => !l.error).map((l: any) => ({ name: "Leg " + l.i, v: Math.round(l.after * 100) / 100 })) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compounding planner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tertiary">Leg prices (0–1, comma separated)</div>
              <Input className="font-mono" placeholder="0.62, 0.55, 0.70, 0.48" value={legsRaw} onChange={(e) => setLegsRaw(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tertiary">Start from ($)</div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-tertiary">$</span>
                  <Input className="pl-6 font-mono" type="number" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tertiary">Stake fraction / leg</div>
                <select
                  className="flex h-10 w-full rounded-sm border border-input bg-secondary px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
                  value={fraction}
                  onChange={(e) => setFraction(e.target.value)}
                >
                  <option value="1">100% (full roll-over)</option>
                  <option value="0.5">50%</option>
                  <option value="0.33">33%</option>
                  <option value="0.25">25%</option>
                </select>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setStart(String(state.bankroll.toFixed(0)))}>
              Use my portfolio value
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projection</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="py-8 text-center text-sm text-tertiary">Enter a start amount and leg prices.</div>
            ) : (
              <div>
                {chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                      <XAxis dataKey="name" tick={{ fill: "#6B6B73", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6B6B73", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{ background: "#1C1C1F", border: "1px solid #26262A", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => [money(v), "if it wins"]}
                      />
                      <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i === chartData.length - 1 ? "#E8501F" : "#3A3A40"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-3 space-y-0">
                  {result.legs.map((l) =>
                    l.error ? (
                      <div key={l.i} className="border-b border-dashed border-border py-2 text-[13px] text-no">
                        Leg {l.i}: price must be 0–1
                      </div>
                    ) : (
                      <div key={l.i} className="flex justify-between border-b border-dashed border-border py-2 text-[13px]">
                        <span className="text-muted-foreground">
                          Leg {l.i} · {Math.round((l as any).price * 100)}¢ ({(l as any).impliedPct}%)
                        </span>
                        <span className="font-mono">
                          {money((l as any).stake)} → <span className="text-yes">{money((l as any).after)}</span>
                        </span>
                      </div>
                    ),
                  )}
                  <div className="flex justify-between py-2.5 text-[13px]">
                    <span className="font-semibold">If all legs win</span>
                    <span className="font-mono text-yes">
                      <b>{money(result.final)}</b> (+{money(result.profit)})
                    </span>
                  </div>
                </div>
                <div className="mt-2 rounded-sm border border-border bg-secondary p-3 text-[12.5px] leading-relaxed text-muted-foreground">
                  <b className="text-warning">Chain success rate:</b> all {result.legs.length} legs landing has about a{" "}
                  <b className="font-mono">{result.combined.toFixed(2)}%</b> combined chance at these prices. More legs =
                  lower odds of the full run.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            <b className="text-warning">Timing rule:</b> a match market only pays out after that match ends, so you can
            only chain matches with staggered kickoffs. The final group matchday runs all six matches at once — no
            compounding those days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
