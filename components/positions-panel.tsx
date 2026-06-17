"use client";

import * as React from "react";
import { Wallet, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session-context";
import type { Position } from "@/lib/types";
import { money } from "@/lib/utils";

export function PositionsPanel() {
  const { address, setAddress } = useSession();
  const [draft, setDraft] = React.useState("");
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

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Your Polymarket
        </CardTitle>
        {address && data && (
          <span className="font-mono text-sm font-medium">{money(data.value)}</span>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {!address ? (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Paste your Polymarket wallet address to see your live positions and P&amp;L here. Read-only — it never
              moves funds, and the address is stored only in this browser.
            </p>
            <Input className="font-mono text-[12px]" placeholder="0x…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button size="sm" className="w-full" onClick={() => setAddress(draft.trim())}>
              Connect address
            </Button>
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
              <button className="text-[11px] text-tertiary hover:text-foreground" onClick={() => setAddress("")}>
                change
              </button>
            </div>

            {data === null && [0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-12 w-full" />)}

            {data && error && <div className="text-[12.5px] text-warning">{error}</div>}

            {data && !error && data.positions.length === 0 && (
              <div className="py-8 text-center text-[13px] text-tertiary">No open positions on this wallet.</div>
            )}

            <div className="space-y-2">
              {data?.positions.map((p, i) => (
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
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
