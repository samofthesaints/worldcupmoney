"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { PricePoint } from "@/lib/types";

export function PriceChart({ tokenId, height = 48 }: { tokenId?: string; height?: number }) {
  const [points, setPoints] = React.useState<PricePoint[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    if (!tokenId) {
      setFailed(true);
      return;
    }
    fetch(`/api/history?token=${encodeURIComponent(tokenId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.ok && d.points?.length > 1) setPoints(d.points);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [tokenId]);

  if (failed) return <div style={{ height }} className="flex items-center text-[11px] text-tertiary">no price history</div>;
  if (!points) return <div style={{ height }} className="animate-shimmer rounded-sm bg-secondary" />;

  const first = points[0].p;
  const last = points[points.length - 1].p;
  const up = last >= first;
  const color = up ? "#22C55E" : "#EF4444";
  const id = "g" + (tokenId || "").slice(-8);

  return (
    <div className="flex items-center gap-3">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area type="monotone" dataKey="p" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-medium" style={{ color }}>
          {Math.round(last * 100)}%
        </div>
        <div className="font-mono text-[10px]" style={{ color }}>
          {up ? "▲" : "▼"} {Math.abs(Math.round((last - first) * 100))} pts
        </div>
      </div>
    </div>
  );
}
