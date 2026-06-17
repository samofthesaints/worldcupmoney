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

export type PositionAction = {
  action: "HOLD" | "SELL" | "SETTLED";
  tone: "yes" | "no" | "warning" | "muted";
  reason: string;
};

// A simple trading-style signal for a held position based on how its price has
// moved versus your entry. Heuristic, not advice.
export function positionSignal(curPrice: number, avgPrice: number, redeemable: boolean): PositionAction {
  if (redeemable || curPrice >= 0.97) return { action: "HOLD", tone: "yes", reason: "Almost certain — let it settle to full value." };
  if (curPrice <= 0.05) return { action: "SELL", tone: "no", reason: "Effectively lost — free up the cash." };
  const gain = avgPrice > 0 ? (curPrice - avgPrice) / avgPrice : 0;
  if (gain >= 0.4) return { action: "SELL", tone: "warning", reason: "Up big — consider locking the profit." };
  if (gain <= -0.35) return { action: "SELL", tone: "no", reason: "Moving against you — consider cutting the loss." };
  if (curPrice >= avgPrice) return { action: "HOLD", tone: "muted", reason: "On track — hold." };
  return { action: "HOLD", tone: "muted", reason: "Slightly down — hold for now." };
}

export function kickoffLabel(kickoff?: string): string {
  if (!kickoff) return "";
  const k = Date.parse(kickoff);
  if (Number.isNaN(k)) return "";
  const d = new Date(k);
  const diff = k - Date.now();
  const hhmm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff > 0 && diff < 6 * 3600e3) {
    const mins = Math.round(diff / 60000);
    return mins < 60 ? `in ${mins}m` : `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  if (d.toDateString() === new Date().toDateString()) return `Today ${hhmm}`;
  return `${d.toLocaleDateString([], { weekday: "short" })} ${hhmm}`;
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
