"use client";

import * as React from "react";
import { Search, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketCard } from "@/components/market-card";
import type { MatchEvent } from "@/lib/types";

export function MarketsTab() {
  const [query, setQuery] = React.useState("");
  const [events, setEvents] = React.useState<MatchEvent[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [auto, setAuto] = React.useState(false);
  const queryRef = React.useRef(query);
  queryRef.current = query;

  const load = React.useCallback(async (silent?: boolean) => {
    if (!silent) setEvents(null);
    setError(null);
    try {
      const r = await fetch(`/api/markets?q=${encodeURIComponent(queryRef.current.trim())}`);
      const d = await r.json();
      if (!d.ok) setError(d.error || "Couldn't reach Polymarket");
      setEvents(d.events || []);
    } catch (e: any) {
      setError(String(e?.message || e));
      setEvents([]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [auto, load]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tertiary">Search matches</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
              <Input
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Team name (Brazil, Croatia…) — blank = all matches"
              />
            </div>
          </div>
          <Button onClick={() => load()}>Fetch odds</Button>
          <Button variant={auto ? "yes" : "secondary"} onClick={() => setAuto((a) => !a)}>
            <RefreshCw className={`h-4 w-4 ${auto ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
            {auto ? "Live" : "Auto-refresh"}
          </Button>
        </div>
        <p className="mt-3 rounded-sm border border-border bg-secondary p-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Match markets only — no tournament futures. Each card shows every bet Polymarket lists for that game:
          moneyline (win / draw / win), total goals, and exact scores (e.g. <b>2–2</b>). Price = implied probability.
          Click any outcome to open a bet slip; you place the real bet on Polymarket.
        </p>
      </Card>

      {events === null && (
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <Card key={i} className="space-y-3 p-6">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      )}

      {events && error && (
        <Card className="p-6">
          <div className="font-medium text-warning">Couldn&apos;t reach Polymarket</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </Card>
      )}

      {events && !error && events.length === 0 && (
        <Card className="p-10 text-center text-sm text-tertiary">
          No matching matches right now. Try a team name, or check back when more games open.
        </Card>
      )}

      {events && events.length > 0 && (
        <div className="space-y-6">
          {events.map((ev, i) => (
            <MarketCard key={ev.slug || ev.title} ev={ev} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
