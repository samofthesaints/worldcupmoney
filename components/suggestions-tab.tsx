"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Radio, ShieldCheck, Scale, Loader2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session-context";
import type { Signal, Suggestion } from "@/lib/types";
import { cents } from "@/lib/utils";

const SIGNAL_ICON: Record<Signal["kind"], React.ReactNode> = {
  momentum: <TrendingUp className="h-3 w-3" />,
  value: <Scale className="h-3 w-3" />,
  live: <Radio className="h-3 w-3" />,
  favorite: <ShieldCheck className="h-3 w-3" />,
};

export function SuggestionsTab() {
  const { openSlip } = useSession();
  const [items, setItems] = React.useState<Suggestion[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Suggested bets
        </div>
        <p className="mt-2 rounded-sm border border-border bg-secondary p-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Ranked from live Polymarket data — price <b>momentum</b>, <b>value</b> (low overhead), live games, and
          favorites. These are <b>signals and a reasoned lean, not guarantees</b>; prediction markets are hard to beat.
          For news-aware analysis, hit <b>Get AI take</b> on any pick.
        </p>
      </Card>

      {items === null &&
        [0, 1, 2].map((i) => (
          <Card key={i} className="space-y-3 p-6">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        ))}

      {items && error && (
        <Card className="p-6">
          <div className="font-medium text-warning">Couldn&apos;t build suggestions</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </Card>
      )}

      {items && !error && items.length === 0 && (
        <Card className="p-10 text-center text-sm text-tertiary">No live match signals right now — check back closer to kickoff.</Card>
      )}

      {items &&
        items.map((s, i) => <SuggestionCard key={s.match + s.pick} s={s} rank={i + 1} onAdd={() => openSlip({ match: s.match, pick: s.pick, price: s.price })} />)}
    </div>
  );
}

function SuggestionCard({ s, rank, onAdd }: { s: Suggestion; rank: number; onAdd: () => void }) {
  const [take, setTake] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [takeErr, setTakeErr] = React.useState<string | null>(null);

  const getTake = async () => {
    setLoading(true);
    setTakeErr(null);
    try {
      const r = await fetch("/api/ai-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match: s.match, odds: [{ name: s.pick, price: s.price }] }),
      });
      const d = await r.json();
      if (d.ok) setTake(d.take);
      else setTakeErr(d.error || "AI take unavailable");
    } catch (e: any) {
      setTakeErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(rank * 0.05, 0.3) }}>
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-tertiary">#{rank}</span>
              <span className="truncate font-semibold">{s.match}</span>
              {s.live && (
                <Badge variant="no" className="gap-1">
                  <Radio className="h-3 w-3" /> Live
                </Badge>
              )}
            </div>
            <div className="mt-1 font-mono text-[13px] text-muted-foreground">{s.pick}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-2xl font-medium text-primary">{cents(s.price)}</div>
            <div className="font-mono text-[11px] text-tertiary">
              {s.impliedPct}% · {s.decimalOdds}×
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {s.signals.map((sig, i) => (
            <Badge key={i} variant="accent" className="gap-1 normal-case tracking-normal">
              {SIGNAL_ICON[sig.kind]} {sig.label}
            </Badge>
          ))}
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{s.reasoning}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add to slip
          </Button>
          <Button size="sm" variant="secondary" onClick={getTake} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Researching…" : "Get AI take"}
          </Button>
        </div>

        {takeErr && <div className="mt-3 rounded-sm border border-border bg-secondary p-3 text-[12.5px] text-warning">{takeErr}</div>}
        {take && (
          <div className="mt-3 rounded-sm border border-border bg-secondary p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-tertiary">
              <Sparkles className="h-3 w-3" /> AI analyst take
            </div>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">{take}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
