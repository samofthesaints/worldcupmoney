"use client";

import * as React from "react";
import type { Bet, SessionState } from "./types";
import { priceMetrics, round2 } from "./utils";

const STORE = "wcm_state_v2";

const blank = (): SessionState => ({
  startingBankroll: 0,
  bankroll: 0,
  stopLoss: 0,
  bets: [],
  nextId: 1,
});

type SlipSelection = { match: string; pick: string; price: number };

type SessionCtx = {
  state: SessionState;
  hydrated: boolean;
  startSession: (start: number, stopLoss: number) => void;
  placeBet: (match: string, pick: string, stake: number, price: number) => boolean;
  settle: (id: number, result: "won" | "lost") => void;
  removeBet: (id: number) => void;
  exportCSV: () => void;
  slip: SlipSelection | null;
  openSlip: (s: SlipSelection) => void;
  closeSlip: () => void;
};

const Ctx = React.createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SessionState>(blank);
  const [hydrated, setHydrated] = React.useState(false);
  const [slip, setSlip] = React.useState<SlipSelection | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) setState({ ...blank(), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) localStorage.setItem(STORE, JSON.stringify(state));
  }, [state, hydrated]);

  const startSession = (start: number, stopLoss: number) =>
    setState({ ...blank(), startingBankroll: start, bankroll: start, stopLoss });

  const placeBet = (match: string, pick: string, stake: number, price: number) => {
    const m = priceMetrics(price);
    if (!m || stake <= 0) return false;
    setState((s) => ({
      ...s,
      nextId: s.nextId + 1,
      bets: [
        ...s.bets,
        {
          id: s.nextId,
          match,
          pick,
          stake: round2(stake),
          price: m.price,
          decimalOdds: m.decimalOdds,
          toReturn: round2(stake * m.payout),
          status: "open",
          placedAt: Date.now(),
        },
      ],
    }));
    return true;
  };

  const settle = (id: number, result: "won" | "lost") =>
    setState((s) => {
      const bets = s.bets.map((b): Bet => (b.id === id ? { ...b, status: result } : b));
      const b = s.bets.find((x) => x.id === id);
      if (!b || b.status !== "open") return s;
      const bankroll = round2(result === "won" ? s.bankroll + (b.toReturn - b.stake) : s.bankroll - b.stake);
      return { ...s, bets, bankroll };
    });

  const removeBet = (id: number) =>
    setState((s) => {
      const b = s.bets.find((x) => x.id === id);
      let bankroll = s.bankroll;
      if (b?.status === "won") bankroll = round2(bankroll - (b.toReturn - b.stake));
      else if (b?.status === "lost") bankroll = round2(bankroll + b.stake);
      return { ...s, bankroll, bets: s.bets.filter((x) => x.id !== id) };
    });

  const exportCSV = () => {
    const rows = [["id", "match", "pick", "stake", "price", "decimal_odds", "to_return", "status", "placed_at"]];
    state.bets.forEach((b) =>
      rows.push([
        String(b.id),
        b.match,
        b.pick,
        String(b.stake),
        String(b.price),
        String(b.decimalOdds),
        String(b.toReturn),
        b.status,
        new Date(b.placedAt).toISOString(),
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "worldcup-bets.csv";
    a.click();
  };

  return (
    <Ctx.Provider
      value={{
        state,
        hydrated,
        startSession,
        placeBet,
        settle,
        removeBet,
        exportCSV,
        slip,
        openSlip: setSlip,
        closeSlip: () => setSlip(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useSession must be used within SessionProvider");
  return c;
}
