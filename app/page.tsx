"use client";

import * as React from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SessionProvider } from "@/lib/session-context";
import { Header } from "@/components/header";
import { DashboardTab } from "@/components/dashboard-tab";
import { MarketsTab } from "@/components/markets-tab";
import { PortfolioTab } from "@/components/portfolio-tab";
import { PlannerTab } from "@/components/planner-tab";
import { BetSlip } from "@/components/bet-slip";

export default function Home() {
  const [tab, setTab] = React.useState("dashboard");
  return (
    <SessionProvider>
      <Tabs value={tab} onValueChange={setTab}>
        <Header />
        <main className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6">
          <TabsContent value="dashboard">
            <DashboardTab onNavigate={setTab} />
          </TabsContent>
          <TabsContent value="markets">
            <MarketsTab />
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
