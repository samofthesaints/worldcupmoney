import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return (v < 0 ? "-$" : "$") + Math.abs(v).toFixed(2);
}

export function cents(price: number): string {
  return Math.round(price * 100) + "¢";
}

export function pct(n: number, digits = 1): string {
  return n.toFixed(digits) + "%";
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const OUTCOME_COLORS = ["#22C55E", "#EF4444", "#60A5FA", "#EAB308", "#A78BFA", "#F472B6"];
export function outcomeColor(i: number): string {
  return OUTCOME_COLORS[i] ?? OUTCOME_COLORS[(i - 2) % 4 + 2];
}

// A Polymarket share price (0-1) is the implied probability.
export function priceMetrics(price: number) {
  const p = Number(price);
  if (!(p > 0 && p < 1)) return null;
  return {
    price: Math.round(p * 1e4) / 1e4,
    impliedPct: Math.round(p * 1000) / 10,
    decimalOdds: Math.round((1 / p) * 1000) / 1000,
    payout: 1 / p, // total returned per $1 staked on a win
  };
}
