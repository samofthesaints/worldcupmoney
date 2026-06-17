"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session-context";
import { money } from "@/lib/utils";

export function BetSlip() {
  const { slip, closeSlip, placeBet, state } = useSession();
  const [stake, setStake] = React.useState("");

  React.useEffect(() => {
    setStake("");
  }, [slip]);

  const price = slip?.price ?? 0;
  const stakeNum = Number(stake) || 0;
  const payout = stakeNum > 0 && price > 0 ? stakeNum / price : 0;

  const confirm = () => {
    if (!slip || stakeNum <= 0) {
      toast.error("Enter a stake first");
      return;
    }
    const ok = placeBet(slip.match, slip.pick, stakeNum, slip.price);
    if (ok) {
      toast.success("Bet logged ✓", { description: `${slip.pick} · ${money(stakeNum)}` });
      closeSlip();
    } else {
      toast.error("Couldn't log that bet");
    }
  };

  return (
    <Sheet open={!!slip} onOpenChange={(o) => !o && closeSlip()}>
      <SheetContent>
        <div className="text-[11px] uppercase tracking-wider text-tertiary">Bet slip</div>
        <SheetTitle className="mt-1.5">{slip?.match ?? "—"}</SheetTitle>
        <SheetDescription className="mb-5 font-mono">{slip?.pick ?? "—"}</SheetDescription>

        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-tertiary">Stake</div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-tertiary">$</span>
          <Input
            className="pl-6 font-mono"
            type="number"
            step="0.5"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {[10, 25, 50].map((n) => (
            <Button key={n} variant="secondary" size="sm" onClick={() => setStake(String((Number(stake) || 0) + n))}>
              +${n}
            </Button>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setStake(String(state.bankroll.toFixed(2)))}>
            Max
          </Button>
        </div>

        <div className="mt-5 space-y-0">
          <Row label="Win chance" value={`${(price * 100).toFixed(1)}%`} />
          <Row label="Decimal odds" value={price ? (1 / price).toFixed(2) + "×" : "—"} />
          <Row label="Shares" value={payout ? (stakeNum / price).toFixed(2) : "—"} />
          <Row label="Potential payout" value={payout ? money(payout) : "—"} accent="text-yes" />
          <Row label="Profit if it hits" value={payout ? "+" + money(payout - stakeNum) : "—"} accent="text-yes" />
        </div>

        <Button className="mt-5 w-full" onClick={confirm}>
          Log this bet
        </Button>
        <p className="mt-4 rounded-sm border border-border bg-secondary p-3 text-[12px] leading-relaxed text-muted-foreground">
          Logging records it here and updates your portfolio when you settle it. Place the real order on Polymarket
          yourself — your bets are saved privately in this browser.
        </p>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-border py-2.5 text-[13px] last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${accent ?? ""}`}>{value}</span>
    </div>
  );
}
