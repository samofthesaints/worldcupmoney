"use client";

import * as React from "react";
import { toast } from "sonner";
import { Wallet, ExternalLink, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session-context";
import type { Position } from "@/lib/types";
import { money } from "@/lib/utils";

export function PositionsPanel() {
  const { address, setAddress, importSettled, state } = useSession();
  const [draft, setDraft] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [data, setData] = React.useState<{ value: number; positions: Position[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    if (!address) return;
    fetch(`/api/positions?address=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) setError(d.error || "Couldn't load positions");
        else setError(null);
        setData({ value: d.value || 0, positions: d.positions || [] });
      })
      .catch((e) => setError(String(e)));
  }, [address]);

  React.useEffect(() => {
    if (!address) {
      setData(null);
      return;
    }
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [address, load]);

  const showInput = !address || editing;

  const save = () => {
    setAddress(draft.trim());
    setEditing(false);
  };

  const logPosition = (p: Position) => {
    const key = `${p.slug || p.title}|${p.outcome}|${p.size}`;
    const result: "won" | "lost" = p.redeemable || p.curPrice >= 0.5 ? "won" : "lost";
    const cost = p.size * p.avgPrice;
    importSettled(key, p.title, `${p.outcome} (Polymarket)`, cost, p.avgPrice || 0.5, result);
    toast.success(`Logged ${result} to bankroll`, { description: p.title });
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Your Polymarket
        </CardTitle>
        {address && !editing && data && <span className="font-mono text-sm font-medium">{money(data.value)}</span>}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {showInput ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Type your Polymarket wallet address to see your live positions and P&amp;L. Read-only — it never moves
              funds, and the address is saved only in this browser. Change it anytime.
            </p>
            <Input
              className="font-mono text-[12px]"
              placeholder="0x…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={save}>
                {editing ? "Update address" : "Connect address"}
              </Button>
              {editing && (
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <a
                href={`https://polymarket.com/profile/${address}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-mono text-[11px] text-tertiary hover:text-foreground"
              >
                {address.slice(0, 6)}…{address.slice(-4)} <ExternalLink className="h-3 w-3" />
              </a>
              <button
                className="text-[11px] text-tertiary hover:text-foreground"
                onClick={() => {
                  setDraft(address);
                  setEditing(true);
                }}
              >
                change
              </button>
            </div>

            {data === null && [0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-12 w-full" />)}
            {data && error && <div className="text-[12.5px] text-warning">{error}</div>}
            {data && !error && data.positions.length === 0 && (
              <div className="py-8 text-center text-[13px] text-tertiary">No open positions on this wallet.</div>
            )}

            <div className="space-y-2">
              {data?.positions.map((p, i) => {
                const key = `${p.slug || p.title}|${p.outcome}|${p.size}`;
                const resolved = p.redeemable || p.curPrice >= 0.99 || p.curPrice <= 0.01;
                const imported = state.importedPositions.includes(key);
                const result = p.redeemable || p.curPrice >= 0.5 ? "won" : "lost";
                return (
                  <div key={i} className="rounded-md border border-border bg-secondary/60 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-medium">{p.title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {p.outcome} · {p.size.toFixed(1)} @ {Math.round(p.avgPrice * 100)}%
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[13px] font-medium">{money(p.value)}</div>
                        <div className={`font-mono text-[11px] ${p.pnl >= 0 ? "text-yes" : "text-no"}`}>
                          {p.pnl >= 0 ? "+" : ""}
                          {money(p.pnl)} ({p.pnlPct >= 0 ? "+" : ""}
                          {p.pnlPct.toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                    {resolved &&
                      (imported ? (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-yes">
                          <Check className="h-3 w-3" /> Logged to bankroll
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" className="mt-2 h-7 px-2.5 text-[12px]" onClick={() => logPosition(p)}>
                          Log {result} to bankroll
                        </Button>
                      ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
