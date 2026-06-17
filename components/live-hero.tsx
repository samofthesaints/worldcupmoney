"use client";

import { motion } from "framer-motion";
import { Radio, Clock } from "lucide-react";
import { ProbBar } from "@/components/prob-bar";
import { PriceChart } from "@/components/price-chart";
import { useSession } from "@/lib/session-context";
import type { MatchEvent } from "@/lib/types";
import { kickoffLabel, outcomeColor } from "@/lib/utils";

export function LiveHero({ ev, isNext }: { ev: MatchEvent | null; isNext?: boolean }) {
  const { openSlip } = useSession();

  if (!ev) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
        <Radio className="mb-2 h-5 w-5 text-tertiary" />
        <div className="text-[15px] font-semibold">No match live right now</div>
        <div className="mt-1 text-[13px] text-tertiary">The next kickoff will appear here automatically.</div>
      </div>
    );
  }

  const ml = ev.markets.find((m) => m.group === "Moneyline") ?? ev.markets[0];
  const chartToken = ml.outcomes.slice().sort((a, b) => b.price - a.price)[0]?.tokenId;
  const live = !!ev.live;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-lg border bg-card p-5 sm:p-6"
      style={{ borderColor: live ? "rgba(239,68,68,0.45)" : "#26262A" }}
    >
      {/* glow */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: live ? "rgba(239,68,68,0.10)" : "rgba(232,80,31,0.08)" }}
      />

      <div className="relative">
        <div className="mb-1 flex items-center gap-2">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-no-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-no">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-no opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-no" />
              </span>
              Live now
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3 w-3" /> Next up · {kickoffLabel(ev.kickoff) || "soon"}
            </span>
          )}
        </div>

        <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{ev.title}</h2>

        {ev.score && (ev.score.state === "in" || ev.score.state === "post") && (
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-3xl font-semibold tabular-nums">
              {ev.score.homeScore} <span className="text-tertiary">–</span> {ev.score.awayScore}
            </span>
            {(ev.score.clock || ev.score.detail) && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${live ? "bg-no-muted text-no" : "bg-secondary text-muted-foreground"}`}>
                {ev.score.clock || ev.score.detail}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {ml.outcomes.slice(0, 3).map((o, i) => (
            <button
              key={o.name + ":" + o.price}
              onClick={() => openSlip({ match: ev.title, pick: `${o.name} — ${ml.group}`, price: o.price })}
              className="rounded-md border border-border bg-secondary/70 p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="mb-1 truncate text-[12px] text-muted-foreground">{o.name}</div>
              <div className="font-mono text-2xl font-medium leading-none sm:text-3xl" style={{ color: outcomeColor(i) }}>
                {o.impliedPct}%
              </div>
              <div className="mt-1 font-mono text-[11px] text-tertiary">{o.decimalOdds}×</div>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <ProbBar outcomes={ml.outcomes} />
        </div>

        {chartToken && (
          <div className="mt-4 rounded-md border border-border bg-background/40 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-tertiary">Favorite price · 24h</div>
            <PriceChart tokenId={chartToken} height={64} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
