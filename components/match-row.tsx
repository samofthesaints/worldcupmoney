"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProbBar } from "@/components/prob-bar";
import { PriceChart } from "@/components/price-chart";
import { useSession } from "@/lib/session-context";
import type { Market, MatchEvent } from "@/lib/types";
import { kickoffLabel, outcomeColor } from "@/lib/utils";

export function MatchRow({ ev, index }: { ev: MatchEvent; index: number }) {
  const { openSlip } = useSession();
  const [open, setOpen] = React.useState(false);
  const prev = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    ev.markets.forEach((m) => m.outcomes.forEach((o) => (prev.current[m.question + "|" + o.name] = o.price)));
  });

  const flash = (m: Market, name: string, price: number) => {
    const p = prev.current[m.question + "|" + name];
    if (p === undefined || p === price) return "";
    return price > p ? "animate-flash-up" : "animate-flash-down";
  };

  const ml = ev.markets.find((m) => m.group === "Moneyline") ?? ev.markets[0];
  const chartToken = ml?.outcomes.slice().sort((a, b) => b.price - a.price)[0]?.tokenId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.25) }}
      className="rounded-md border border-border bg-card"
    >
      {/* collapsed header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          {ev.live ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-no opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-no" />
            </span>
          ) : (
            <span className="w-2 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium leading-tight">{ev.title}</div>
            <div className="font-mono text-[10px] text-tertiary">
              {ev.live ? "Live now" : kickoffLabel(ev.kickoff) || "—"}
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {ml.outcomes.slice(0, 3).map((o, i) => (
            <button
              key={o.name + ":" + o.price}
              onClick={() => openSlip({ match: ev.title, pick: `${o.name} — ${ml.group}`, price: o.price })}
              className={`min-w-[52px] rounded-sm border border-border bg-secondary px-2 py-1 text-center transition-colors hover:bg-accent ${flash(
                ml,
                o.name,
                o.price,
              )}`}
              title={`${o.name} · ${o.impliedPct}% · ${o.decimalOdds}×`}
            >
              <div className="truncate text-[9px] uppercase tracking-wide text-tertiary">{shortName(o.name)}</div>
              <div className="font-mono text-[13px] font-medium leading-none" style={{ color: outcomeColor(i) }}>
                {o.impliedPct}%
              </div>
            </button>
          ))}
          <button onClick={() => setOpen((o) => !o)} className="px-1 text-muted-foreground">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* expanded detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="space-y-4 p-4">
              {chartToken && (
                <div className="rounded-md border border-border bg-background/40 p-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-tertiary">Favorite price · 24h</div>
                  <PriceChart tokenId={chartToken} height={56} />
                </div>
              )}
              {ev.markets.map((m) => (
                <div key={m.question} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <Badge variant="outline">{m.group}</Badge>
                    <span>{m.question}</span>
                  </div>
                  <div className="mb-2">
                    <ProbBar outcomes={m.outcomes} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {m.outcomes.map((o, i) => (
                      <button
                        key={o.name + ":" + o.price}
                        onClick={() => openSlip({ match: ev.title, pick: `${o.name} — ${m.group}`, price: o.price })}
                        className={`rounded-md border border-border bg-secondary p-2.5 text-left transition-colors hover:bg-accent ${flash(
                          m,
                          o.name,
                          o.price,
                        )}`}
                      >
                        <div className="mb-0.5 truncate text-[12px]">{o.name}</div>
                        <div className="font-mono text-lg font-medium leading-none" style={{ color: outcomeColor(i) }}>
                          {o.impliedPct}%
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-tertiary">{o.decimalOdds}× odds</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// "Croatia" stays, but "Over 2.5" / "2 - 2" stay short already; trim long names.
function shortName(name: string): string {
  if (name.length <= 9) return name;
  return name.slice(0, 8) + "…";
}
