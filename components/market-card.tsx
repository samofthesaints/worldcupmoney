"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProbBar } from "@/components/prob-bar";
import { PriceChart } from "@/components/price-chart";
import { useSession } from "@/lib/session-context";
import type { MatchEvent, Market } from "@/lib/types";
import { cents, money, outcomeColor } from "@/lib/utils";

function closingSoon(end?: string) {
  if (!end) return false;
  const t = Date.parse(end);
  return !!t && t - Date.now() < 864e5 && t > Date.now();
}

export function MarketCard({ ev, index }: { ev: MatchEvent; index: number }) {
  const { openSlip } = useSession();
  const prev = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    ev.markets.forEach((m) => m.outcomes.forEach((o) => (prev.current[m.question + "|" + o.name] = o.price)));
  });

  const dirClass = (m: Market, name: string, price: number) => {
    const p = prev.current[m.question + "|" + name];
    if (p === undefined || p === price) return "";
    return price > p ? "animate-flash-up" : "animate-flash-down";
  };

  const ml = ev.markets.find((m) => m.group === "Moneyline") ?? ev.markets[0];
  const chartToken = ml?.outcomes.slice().sort((a, b) => b.price - a.price)[0]?.tokenId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Card className="p-6">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="text-base font-semibold">{ev.title}</div>
          <div className="flex gap-2">
            {ev.live && (
              <Badge variant="no" className="gap-1">
                <Radio className="h-3 w-3" /> Live
              </Badge>
            )}
            {closingSoon(ev.endDate) && !ev.live && <Badge variant="warning">Closing soon</Badge>}
          </div>
        </div>
        {ev.volume24hr ? (
          <div className="mb-3 font-mono text-[11px] text-tertiary">24h vol {money(ev.volume24hr)}</div>
        ) : (
          <div className="mb-3" />
        )}

        {chartToken && (
          <div className="mb-4 rounded-md border border-border bg-background/40 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-tertiary">Favorite price · 24h</div>
            <PriceChart tokenId={chartToken} height={56} />
          </div>
        )}

        <div className="space-y-4">
          {ev.markets.map((m) => (
            <div key={m.question} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                <Badge variant="outline">{m.group}</Badge>
                <span>{m.question}</span>
              </div>
              <div className="mb-2.5">
                <ProbBar outcomes={m.outcomes} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {m.outcomes.map((o, i) => (
                  <button
                    key={o.name + ":" + o.price}
                    onClick={() => openSlip({ match: ev.title, pick: `${o.name} — ${m.group}`, price: o.price })}
                    className={`rounded-md border border-border bg-secondary p-2.5 text-left transition-colors hover:bg-accent ${dirClass(
                      m,
                      o.name,
                      o.price,
                    )}`}
                  >
                    <div className="mb-0.5 truncate text-[13px]">{o.name}</div>
                    <div className="font-mono text-lg font-medium" style={{ color: outcomeColor(i) }}>
                      {cents(o.price)}
                    </div>
                    <div className="font-mono text-[11px] text-tertiary">
                      {o.impliedPct}% · {o.decimalOdds}×
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
