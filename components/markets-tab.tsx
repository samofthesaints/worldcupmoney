"use client";

import * as React from "react";
import { Search, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchRow } from "@/components/match-row";
import type { MatchEvent } from "@/lib/types";

export function MarketsTab() {
  const [query, setQuery] = React.useState("");
  const [events, setEvents] = React.useState<MatchEvent[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [auto, setAuto] = React.useState(true);
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

  const live = (events || []).filter((e) => e.live);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tertiary">Search World Cup matches</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
              <Input
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Team name — blank = all World Cup matches"
              />
            </div>
          </div>
          <Button onClick={() => load()}>Search</Button>
          <Button variant={auto ? "yes" : "secondary"} onClick={() => setAuto((a) => !a)}>
            <RefreshCw className={`h-4 w-4 ${auto ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} />
            {auto ? "Live · 30s" : "Auto-refresh"}
          </Button>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-tertiary">
          World Cup matches only — no tournament futures. Numbers are the market&apos;s <b>% chance</b> (the small ¢ is the
          Polymarket price you&apos;ll see when betting). Tap a row to see totals &amp; exact-score markets and a price chart.
        </p>
      </Card>

      {events === null && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}

      {events && error && (
        <Card className="p-6">
          <div className="font-medium text-warning">Couldn&apos;t reach Polymarket</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </Card>
      )}

      {events && !error && events.length === 0 && (
        <Card className="p-10 text-center text-sm text-tertiary">
          No World Cup matches open right now. Try a team name, or check back near kickoff.
        </Card>
      )}

      {events && live.length > 0 && (
        <div className="space-y-2">
          <div className="px-1 text-[11px] uppercase tracking-wider text-no">Live now</div>
          {live.map((ev, i) => (
            <MatchRow key={ev.slug || ev.title} ev={ev} index={i} />
          ))}
        </div>
      )}

      {events && events.filter((e) => !e.live).length > 0 && (
        <div className="space-y-2">
          {live.length > 0 && <div className="px-1 pt-2 text-[11px] uppercase tracking-wider text-tertiary">Upcoming</div>}
          {events
            .filter((e) => !e.live)
            .map((ev, i) => (
              <MatchRow key={ev.slug || ev.title} ev={ev} index={i} />
            ))}
        </div>
      )}
    </div>
  );
}
