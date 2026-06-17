<div align="center">

# ⚽ World Cup Money

**A trading-grade dashboard for disciplined, compounding World Cup bets.**

Live Polymarket odds with charts, **data-driven suggested bets** (plus an optional AI analyst that reads the news),
a compounding-chain planner, and an honest bankroll tracker — in one dark, fast web app that **places no bets for you**.

![World Cup Money dashboard preview](docs/preview.svg)

![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/UI-shadcn%2Fui-F5F5F4)
![Odds](https://img.shields.io/badge/odds-Polymarket-E8501F)
![Wallet](https://img.shields.io/badge/wallet%20access-none-22C55E)
![License](https://img.shields.io/badge/license-MIT-A1A1AA)

</div>

---

## Why this exists

Betting on the World Cup is more fun when you're disciplined about it. The plan: make one educated bet,
roll the winnings into the next match, and compound a small bankroll across the day — without lying to
yourself about the odds.

This app is the calculator, the scout, and the scorekeeper for that plan. It pulls live match odds, charts
how prices are moving, surfaces **suggested bets** from real signals (and, on demand, an AI analyst that
web-searches recent team news), sizes your compounding chain, and keeps an honest record of how you're doing.

> It's a **track & advise** tool. No wallet, no private key, no real orders — ever. You place each bet
> yourself on Polymarket. Suggestions are *signals and a reasoned lean, never guarantees*: prediction markets
> are efficient and hard to beat.

## Features

- **📊 Live match odds with charts.** One card per game — moneyline (win/draw/win), total goals, and exact
  scores (`2-2`) — with probability bars and a 24h price-history chart. **Tournament futures** (who wins the
  World Cup, group winners, top scorer) are filtered out; match markets only.
- **✨ Suggested bets.** A ranked feed built from live data: price **momentum**, **value** (low overhead),
  **live** games, and favorites — each with a plain-English reasoning. Hit **Get AI take** on any pick for a
  news-aware analysis.
- **🔁 Compounding planner.** Chain leg prices and see the projected bankroll per leg as a chart, plus the
  **combined probability the whole chain lands** — the honest reality check.
- **💰 Bankroll tracker.** Animated portfolio value, realized win rate, a stop-loss, a bankroll-over-time
  chart, and one-click **CSV export**. Your bets are stored privately in your browser.
- **⏱️ Live feel.** 30-second auto-refresh with price-flash on every move, animated numbers, and smooth
  transitions (shadcn/ui + Framer Motion, faithful to [`design.md`](design.md)).

## Deploy your own (recommended)

This is a Next.js app — it runs best hosted, so you get a link you just open on your laptop or phone.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsamofthesaints%2Fworldcupmoney)

1. Push this repo to your GitHub (already done) and import it at **[vercel.com/new](https://vercel.com/new)**.
2. No build settings needed — Vercel auto-detects Next.js. Click **Deploy**.
3. *(Optional, for the AI analyst)* In **Project → Settings → Environment Variables**, add
   **`ANTHROPIC_API_KEY`** with your [Anthropic API key](https://console.anthropic.com/). The app works fully
   without it — you just won't get the "AI take" button. You can set `ANTHROPIC_MODEL` to override the default model.

Live odds are fetched by the serverless functions in `app/api/*`, so they work anywhere with no CORS issues.

## Run it locally

You need [Node.js 18+](https://nodejs.org). Then:

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. For the AI take locally, create a `.env.local` file with
`ANTHROPIC_API_KEY=sk-ant-...`.

## How the math works

Polymarket prices are probabilities between 0 and 1 — `64¢` means the market thinks an outcome is **64% likely**.
Buy a share at price `p`: implied probability is `p`, decimal odds `1/p`, and `$1` returns `1/p` on a win.
Compounding `0.62 → 0.55 → 0.70` turns `$20` into `$83.81` if all three hit — but that run has only a
**~24% combined chance** (`0.62 × 0.55 × 0.70`). The planner always shows that number.

**Timing rule:** a match market only pays out after that match ends, so you can only chain matches with
staggered kickoffs. The final group matchday runs all six games at once — no compounding those days.

## Privacy & safety

- **No wallet, no keys for trading, no orders.** The app only reads public Polymarket data.
- **Your bets stay in your browser** (localStorage) — never uploaded, even though this repo is public.
- **Bet responsibly.** Only stake what you're fine losing, treat the stop-loss as a hard rule, and remember no
  tool predicts a football match.

## Under the hood

```
app/
  page.tsx              # dashboard shell (tabs)
  layout.tsx            # fonts, theme, toasts
  api/markets           # proxy + filter Polymarket match markets
  api/history           # price history for charts
  api/suggestions       # ranked signal-based picks
  api/ai-take           # optional AI analyst (Anthropic + web search)
components/             # shadcn/ui primitives + dashboard pieces
lib/                    # polymarket fetch, suggestion signals, session store, math
```

Built with Next.js 14 (App Router), TypeScript, Tailwind + shadcn/ui, Recharts, and Framer Motion.

## License

[MIT](LICENSE) — do whatever you like. No warranty; bet at your own risk.
