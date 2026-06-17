"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedNumber } from "@/components/animated-number";
import { useSession } from "@/lib/session-context";
import { money } from "@/lib/utils";

export function Header() {
  const { state, hydrated } = useSession();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background px-4 sm:gap-6 sm:px-6">
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight sm:text-base">⚽ World Cup Money</span>
      <TabsList>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="markets">Markets</TabsTrigger>
        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        <TabsTrigger value="planner">Planner</TabsTrigger>
      </TabsList>
      <span className="flex-1" />
      <span className="rounded-full border border-border bg-secondary px-3.5 py-1.5 font-mono text-[13px] font-medium">
        {hydrated ? <AnimatedNumber value={state.bankroll} format={(n) => money(n)} /> : "$0.00"}
      </span>
    </header>
  );
}
