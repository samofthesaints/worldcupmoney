import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "World Cup Money",
  description: "Live World Cup odds, charts, suggested bets, a compounding planner, and an honest bankroll tracker.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        {children}
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#1C1C1F", border: "1px solid #26262A", color: "#F5F5F4" } }} />
      </body>
    </html>
  );
}
