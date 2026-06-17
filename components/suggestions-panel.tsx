"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Radio, ShieldCheck, Scale, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session-context";
import type { Signal, Suggestion } from "@/lib/types";

const SIGNAL_ICON: Record<Signal["kind"], React.ReactNode> = {
  momentum: <TrendingUp className="h-3 w-3" />,
  value: <Scale className="h-3 w-3" />,
  live: <Radio className="h-3 w-3" />,
  favorite: <ShieldCheck className="h-3 w-3" />,
};

export function SuggestionsPanel({ limit = 6 }: { limit?: number }) {
  const [items, setItems] = React.useState<Suggestion[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch("/api/suggestions")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) setError(d.error || "Couldn't build suggestions");
        setItems(d.suggestions || []);
      })
      .catch((e) => {
        setError(String(e));
        setItems([]);
      });
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Suggested bets
        </CardTitle>
        <span className="text-[11px] text-tertiary">live + upcoming · signals, not guarantees</span>
      </CardHeader>
      <CardContent className="flex-1 space-y-2.5 overflow-y-auto">
        {items === null && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}

        {items && error && <div className="text-[13px] text-warning">{error}</div>}

        {items && !error && items.length === 0 && (
          <div className="py-10 text-center text-[13px] text-tertiary">No live signals yet — check back near kickoff.</div>
        )}

        {items?.slice(0, limit).map((s, i) => (
          <SuggestionItem key={s.match + s.pick} s={s} rank={i + 1} />
        ))}
      </CardContent>
    </Card>
  );
}

function SuggestionItem({ s, rank }: { s: Suggestion; rank: number }) {
  const { openSlip } = useSession();
  const [take, setTake] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const getTake = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/ai-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match: s.match, odds: s.odds?.length ? s.odds : [{ name: s.pick, price: s.price }] }),
      });
      const d = await r.json();
      d.ok ? setTake(d.take) : setErr(d.error || "AI take unavailable");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(rank * 0.04, 0.25) }}
      className="rounded-md border border-border bg-secondary/60 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-tertiary">#{rank}</span>
            <span className="truncate text-[13px] font-medium">{s.match}</span>
            {s.live && (
              <Badge variant="no" className="gap-1 px-1.5 py-0">
                <Radio className="h-2.5 w-2.5" /> Live
              </Badge>
            )}
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{s.pick}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-lg font-medium leading-none text-primary">{s.impliedPct}%</div>
          <div className="font-mono text-[10px] text-tertiary">{s.decimalOdds}×</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {s.signals.slice(0, 3).map((sig, i) => (
          <Badge key={i} variant="accent" className="gap-1 px-1.5 py-0 normal-case tracking-normal">
            {SIGNAL_ICON[sig.kind]} {sig.label}
          </Badge>
        ))}
      </div>

      <div className="mt-2.5 flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-[12px]" onClick={() => openSlip({ match: s.match, pick: s.pick, price: s.price })}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
        <Button size="sm" variant="secondary" className="h-7 px-2.5 text-[12px]" onClick={getTake} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Researching…" : "AI take"}
        </Button>
      </div>

      {err && <div className="mt-2 text-[11.5px] text-warning">{err}</div>}
      {take && (
        <p className="mt-2 whitespace-pre-wrap rounded-sm border border-border bg-background/50 p-2.5 text-[12px] leading-relaxed text-foreground">
          {take}
        </p>
      )}
    </motion.div>
  );
}
