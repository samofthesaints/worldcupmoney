"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SessionProvider } from "@/lib/session-context";
import { Header } from "@/components/header";
import { MarketsTab } from "@/components/markets-tab";
import { SuggestionsTab } from "@/components/suggestions-tab";
import { PortfolioTab } from "@/components/portfolio-tab";
import { PlannerTab } from "@/components/planner-tab";
import { BetSlip } from "@/components/bet-slip";

export default function Home() {
  return (
    <SessionProvider>
      <Tabs defaultValue="markets">
        <Header />
        <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
          <TabsContent value="markets">
            <MarketsTab />
          </TabsContent>
          <TabsContent value="suggestions">
            <SuggestionsTab />
          </TabsContent>
          <TabsContent value="portfolio">
            <PortfolioTab />
          </TabsContent>
          <TabsContent value="planner">
            <PlannerTab />
          </TabsContent>
        </main>
      </Tabs>
      <BetSlip />
    </SessionProvider>
  );
}
