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

## What it does

- **Today's bankroll** — set a starting amount and a stop-loss floor. The app tracks
  your running balance and warns you when you hit the floor (time to walk away).
- **Compounding planner** — type the Polymarket prices for the matches you want to
  chain (e.g. `0.62, 0.55, 0.70`). It shows the stake and projected bankroll after
  each winning leg, *and* the combined probability that all legs actually land. That
  last number is the honest reality check: chaining 4 bets compounds your upside but
  also multiplies your chance of getting wiped.
- **Live Polymarket odds** — search markets by team name (or leave blank for World
  Cup / match markets). Shows implied probability and decimal odds. Click a side to
  pre-fill the bet logger.
- **Bet log** — record each bet, then mark it Won or Lost. Settling updates your
  bankroll automatically.

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
