# ⚽ World Cup Money

A tiny **local** dashboard for making disciplined, compounding World Cup bets with
small money. It pulls live Polymarket odds, does all the betting math for you,
helps you plan a compounding chain across the day, and keeps an honest record of
your bankroll.

It is a **track & advise** tool. It never moves money, never connects to a wallet,
and never holds a private key. **You place every real bet yourself on Polymarket** —
this just keeps the math right and keeps you disciplined.

## Run it

You only need Python 3 (no installs, no frameworks):

```bash
python3 app.py
```

Then open **http://localhost:8000** in your browser. That's it.

Your data lives in `data/session.json` on your own machine and is git-ignored.

The interface follows a dark, trading-grade design system (Inter + JetBrains Mono,
single orange accent, green/red reserved for outcomes only) across three tabs.

### Markets tab
- Search by team name, or leave blank to pull World Cup match markets.
- **One card per match** showing every market Polymarket lists for it, grouped and
  labelled: **Moneyline** (win / draw / win), **Total goals**, and **Exact score**
  (0-0, 2-2, …). So if you want "Croatia–England 2-2", it shows up in its own group —
  bet it directly (note: exact-score markets are thinly traded, so prices are noisy).
- A **probability bar** and cents price (64¢) per outcome. Click any outcome to open
  the **bet slip**: enter a stake (with +$10/+$25/+$50/Max chips) and see live shares,
  potential payout, and profit before you log it.
- **Auto-refresh** toggle (top right) re-pulls odds every 30s so prices move during
  live matches, with a brief flash on any outcome whose price changed.

### Portfolio tab
- **Portfolio value** (your bankroll), profit delta, and **realized win rate** — the
  share of your *settled* bets that won (your real track record, separate from the
  market's implied probability).
- Set your starting portfolio and a stop-loss floor; the app flags when you hit it.
- **Open positions** table — mark each bet Won or Lost; settling updates the portfolio.

### Planner tab
- Type the prices for the legs you want to chain (e.g. `0.62, 0.55, 0.70`). It shows
  the stake and projected portfolio after each winning leg, *and* the **chain success
  rate** — the combined probability that all legs land. The honest reality check:
  chaining bets compounds your upside but multiplies your chance of getting wiped.

## How the compounding actually works (and its one catch)

You roll winnings from one match into the next. The catch: a Polymarket match market
**only pays out after that match resolves**. So you can only compound across matches
that are **staggered in time** with a gap between them. On the final group matchday,
all 6 matches in a group kick off simultaneously — no compounding possible those days.
Plan your chain around matches with kickoff gaps.

## The math

Polymarket prices are probabilities (0–1). Buy a share at price `p`:

- Implied probability = `p`
- Decimal odds = `1 / p`
- $1 staked returns `1 / p` on a win (profit `(1 - p) / p`)

So $20 on a 0.62 price returns ~$32.26 if it hits.

## Honest disclaimer

No app can predict who wins. This one removes math errors, sizes your compounding
bets, and enforces a stop-loss — the edge still comes from your own read of the
matches. Bet only money you're completely fine losing, and treat the stop-loss as a
hard rule, not a suggestion.
