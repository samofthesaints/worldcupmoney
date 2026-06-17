# Design System — Polymarket Betting Dashboard

> Dark, data-dense, editorial. A trading-grade interface for browsing markets, placing bets, and tracking positions. Synthesized from three references: the Zajno analytics dashboard (card hierarchy + AI panel), an energy-overview dashboard (monospace numerals, thin-line charts, mixed dark/light cards), and a crypto mobile app (rounded cards, market list, order book, buy/sell ergonomics).
>
> **Stack:** React + Tailwind CSS. **Theme:** Dark only.

---

## 1. Design Principles

1. **Numbers are the interface.** Prices, odds, percentages, and P&L are the loudest elements on screen. Type scale and weight serve legibility of figures first.
2. **Calm canvas, sharp data.** Near-black background recedes; cards float quietly; color appears only to signal meaning (Yes/No, up/down, profit/loss).
3. **One accent for action, two semantics for outcome.** A single brand accent drives primary CTAs. Green/red are reserved exclusively for market direction and gains/losses, never decoration.
4. **Density without clutter.** Tight vertical rhythm, generous card padding, hairline dividers instead of boxes-within-boxes.
5. **Monospace for figures, sans for prose.** Tabular numerals keep columns aligned in order books, position tables, and price tickers.

---

## 2. Color Tokens

Dark-only palette. Defined as CSS variables and mapped into the Tailwind config. Backgrounds layer from deepest (app canvas) up to raised surfaces.

### Core surfaces & text

| Token | Hex | Usage |
|---|---|---|
| `--bg-canvas` | `#0A0A0B` | App background, deepest layer |
| `--bg-surface` | `#141416` | Cards, panels |
| `--bg-surface-2` | `#1C1C1F` | Raised/nested elements, inputs, hover rows |
| `--bg-surface-3` | `#26262A` | Active/pressed, toggles, selected chips |
| `--bg-inverse` | `#E8EAE3` | Light "feature" cards (highlight one stat per view) |
| `--border-subtle` | `#26262A` | Hairline dividers, card outlines |
| `--border-strong` | `#3A3A40` | Focused inputs, emphasized borders |
| `--text-primary` | `#F5F5F4` | Headlines, primary figures |
| `--text-secondary` | `#A1A1AA` | Labels, secondary copy |
| `--text-tertiary` | `#6B6B73` | Captions, timestamps, axis labels |
| `--text-inverse` | `#0A0A0B` | Text on `--bg-inverse` light cards |

### Brand & semantic

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#E8501F` | Primary CTA, active nav, focus ring (the orange swap button in ref 3) |
| `--accent-hover` | `#FF6A3D` | Hover state for accent |
| `--accent-muted` | `#3A1E14` | Accent-tinted backgrounds (subtle) |
| `--yes` | `#22C55E` | "Yes" outcome, price up, profit |
| `--yes-muted` | `#0F2E1C` | Yes-tinted fills, chart areas |
| `--no` | `#EF4444` | "No" outcome, price down, loss |
| `--no-muted` | `#34161A` | No-tinted fills, chart areas |
| `--warning` | `#EAB308` | Pending settlement, low liquidity flags |
| `--info` | `#60A5FA` | Neutral informational badges |

> **Rule:** `--yes`/`--no` carry *meaning*. Never use green/red purely for visual interest. A neutral market or a balanced position uses `--text-secondary`, not a semantic color.

### Tailwind config mapping

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      canvas: '#0A0A0B',
      surface: { DEFAULT: '#141416', 2: '#1C1C1F', 3: '#26262A' },
      inverse: '#E8EAE3',
      border: { subtle: '#26262A', strong: '#3A3A40' },
      content: { DEFAULT: '#F5F5F4', secondary: '#A1A1AA', tertiary: '#6B6B73', inverse: '#0A0A0B' },
      accent: { DEFAULT: '#E8501F', hover: '#FF6A3D', muted: '#3A1E14' },
      yes: { DEFAULT: '#22C55E', muted: '#0F2E1C' },
      no:  { DEFAULT: '#EF4444', muted: '#34161A' },
      warning: '#EAB308',
      info: '#60A5FA',
    },
  },
}
```

---

## 3. Typography

Two families: a clean grotesque sans for UI/prose, a monospace for all figures and tabular data.

- **Sans:** `Inter` (or `Geist`, `Söhne`) — UI labels, body, headings.
- **Mono:** `JetBrains Mono` (or `Geist Mono`, `IBM Plex Mono`) — prices, odds, %, order book, timestamps. Always use `font-variant-numeric: tabular-nums`.

### Scale

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 48 / 52 | 600 | Hero figure (portfolio value, headline odds) |
| `h1` | 32 / 38 | 600 | Page title ("Markets", "Overview") |
| `h2` | 24 / 30 | 600 | Section headers, card primary figure |
| `h3` | 18 / 24 | 600 | Card titles |
| `body` | 14 / 20 | 400 | Default copy |
| `body-sm` | 13 / 18 | 400 | Secondary copy, row text |
| `label` | 12 / 16 | 500 | Field labels, nav, chip text |
| `caption` | 11 / 14 | 400 | Timestamps, axis, fine print (often uppercase + tracking) |
| `mono-lg` | 28 / 32 | 500 | Big prices/odds (tabular) |
| `mono-base` | 14 / 20 | 400 | Order book, table figures (tabular) |
| `mono-sm` | 12 / 16 | 400 | Dense numeric rows (tabular) |

Conventions: uppercase + `letter-spacing: 0.06em` for small labels (`PORTFOLIO`, `HIGH`, `LOW`). Headlines are tight (`-0.01em`). Body is normal tracking.

---

## 4. Spacing, Radius, Shadow

**Spacing** — 4px base scale: `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64`. Card padding `20–24`. Section gaps `24`. Row vertical padding `12`.

**Radius**

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 8px | Chips, badges, inputs |
| `radius-md` | 12px | Buttons, small cards |
| `radius-lg` | 16px | Standard cards/panels |
| `radius-xl` | 20px | Hero/feature cards |
| `radius-full` | 9999px | Pills, toggles, avatars |

**Shadow** — dark UI leans on surface elevation + hairline borders more than shadow. Use sparingly.

- `shadow-card`: `0 1px 2px rgba(0,0,0,0.4)` + `1px` `--border-subtle` inset feel.
- `shadow-pop`: `0 8px 24px rgba(0,0,0,0.5)` for dropdowns, modals, the bet-slip popover.
- Optional glow for live/active: `0 0 0 1px var(--accent)` ring on focused trade controls.

---

## 5. Layout

### App shell

- **Top bar** (height 64): left logo + primary nav (`Markets`, `Portfolio`, `Activity`, `Leaderboard`); right side `Refresh`, balance pill, account menu with avatar. Mirrors the Zajno header (`Overview / Learn / Support` + account).
- **Content max-width** ~1320px, centered, `padding: 24px`.
- **Grid:** 12-column, `gap-6` (24px). Cards span column ranges; allow asymmetric splits like the references (e.g. a wide chart card + narrow stat column).

### Reference layout for the main dashboard

```
┌──────────────────────────────────────────────────────────────┐
│ Logo   Markets  Portfolio  Activity        🔔  $5,271 ▾  Acct  │
├───────────────┬───────────────┬──────────────────────────────┤
│ Portfolio      │ Open positions│  Market detail / chart        │
│ value (display)│  count + P&L  │  (line chart, timeframe tabs) │
│ Withdraw/Dep   │               │                               │
├───────────────┼───────────────┤                               │
│ Watchlist /    │ Today's P&L   │                               │
│ trending list  │ (bar chart)   ├──────────────────────────────┤
│                │               │  Order book / Bet slip        │
│                │               │  Buy(Yes ↑) / Sell(No ↓)      │
└───────────────┴───────────────┴──────────────────────────────┘
```

- One card per view may use `--bg-inverse` (light) to anchor attention — e.g. the active market or "Today's P&L" — exactly as ref 2 spotlights "Green energy usage" and "Tracking".
- Mobile: single column, cards become full-width rounded blocks; sticky bottom tab bar (`Home, Markets, [+ trade], Activity, Settings`) with the accent FAB in the center, as in ref 3.

---

## 6. Core Components

### Card
Base container. `bg-surface`, `radius-lg`, `p-6`, `border border-border-subtle`. Header row: `h3` title left, optional action (`•••` menu, segmented control, or `Change` pill) right. Variants:
- **Stat card** — small uppercase `label`, then large figure (`h2` or `mono-lg`), optional sparkline/bar chart below, optional delta chip.
- **Feature card (light)** — `bg-inverse`, `text-inverse`; use for one focal metric only.
- **List card** — title + rows with hairline `divider` between (country-list / market-list pattern).

### Buttons

| Variant | Style |
|---|---|
| Primary | `bg-accent text-white`, `radius-md`, `h-11`, hover `bg-accent-hover` |
| Secondary | `bg-surface-2 text-content`, `border border-border-subtle`, hover `bg-surface-3` |
| Ghost | transparent, `text-secondary`, hover `text-primary` |
| Pill / filter | `radius-full`, `bg-surface-2` default, `bg-surface-3 text-primary` when active (the `Today / Trends / Total` tabs in ref 1) |
| Yes (buy) | `bg-yes-muted text-yes border border-yes/30`, label "Yes ↑" — solid `bg-yes text-canvas` on confirm |
| No (sell) | `bg-no-muted text-no border border-no/30`, label "No ↓" — solid `bg-no text-canvas` on confirm |

Icon-affixed buttons use ↑ ↓ ↗ arrows like the references (`Withdraw ↑`, `Deposit ↓`, `Buy ↓`, `Sell ↑`).

### Segmented control / timeframe tabs
Pill-group on `bg-surface-2`, active segment `bg-surface-3` + `text-primary`. Timeframes for charts: `1H · 6H · 1D · 1W · 1M · ALL` (ref 3's `D W M 6M Y All`).

### Chips & badges
`radius-full`, `label` size. Delta chip: `text-yes`/`text-no` with sign (`+130.62%`, `-2.27%`). Status badge: `Open`, `Resolved`, `Closing soon` (use `--warning`), `Settled`.

### Inputs
`bg-surface-2`, `border border-border-subtle`, `radius-sm`, focus → `border-strong` + accent ring. Numeric stake input uses mono font and shows currency prefix. Include quick-amount chips (`+$10 / +$50 / +$100 / Max`).

### Nav
Top nav links: `label` size, `text-secondary`, active `text-primary` with a 2px `--accent` underline. Mobile tab bar icons `text-tertiary`, active `text-primary`; center FAB is `bg-accent`.

### Avatar / account menu
`radius-full` avatar, name + chevron, dropdown uses `shadow-pop` on `bg-surface-2`.

### Toast / notification
Bottom-right, `bg-surface-2`, `shadow-pop`, left accent bar colored by type (yes/no/warning/info). Use for "Bet placed", "Position settled", "Order filled".

---

## 7. Data Visualization

Charts follow the references' restraint: thin lines, no heavy gridlines, monospace axis labels in `--text-tertiary`.

- **Price/odds line chart** — 1.5px stroke. Color by direction over the selected window: `--yes` if up, `--no` if down, or `--text-primary` for neutral. Faint area fill (`--yes-muted`/`--no-muted` at ~15% opacity). Endpoint dot + floating last-price label (ref 3). Dashed baseline for entry price.
- **Bar charts** — thin bars, `--text-primary` or accent for the highlighted bar (ref 1 traffic chart, ref 2 thin-line bars). Rounded `2px` tops. Highlight the current period bar in accent/inverse.
- **Probability bar (Yes/No split)** — horizontal stacked bar: `--yes` segment vs `--no` segment, percentage labels at each end. The signature Polymarket element.
- **Sparklines** — 1px, inline in market list rows, colored by 24h direction.
- **Order book** — two mono columns (Bid `--yes` tint / Ask `--no` tint), depth shown as subtle background fill bars behind rows (ref 3). Tabular nums, right-aligned numbers.

Chart library: Recharts or visx, themed with the tokens above. Tooltips use `bg-surface-2` + `shadow-pop`, mono figures.

---

## 8. Betting-Specific Patterns

### Market card
List or grid item representing one market.
```
┌────────────────────────────────────────────┐
│ [icon]  Will X happen by Dec 2026?          │
│         $1.2M Vol · closes Jun 30           │
│  ┌─────────── 64% ───────┬──── 36% ────┐    │
│  │ Yes 64¢               │ No 36¢       │    │  ← probability bar
│  └───────────────────────┴──────────────┘    │
│  [ Yes ↑ 64¢ ]            [ No ↓ 36¢ ]       │  ← buy buttons
└────────────────────────────────────────────┘
```
- Prices shown as cents (`64¢`) and/or implied % — pick one convention and keep it consistent; cents is Polymarket-native.
- Volume and close date in `caption`/`--text-tertiary`. `Closing soon` badge in `--warning` when < 24h.

### Bet slip / order ticket
Slide-over panel or popover (`shadow-pop`). Contains: selected outcome (Yes/No, colored), stake input (mono, currency prefix, quick-amount chips), live calc of **shares**, **avg price**, **potential payout** and **profit** (`--yes`), and a fee/slippage line. Primary button is the colored Yes/No solid button. Confirmation triggers a celebratory toast.

### Position row (Portfolio)
Mono, tabular. Columns: Market · Side (Yes/No chip) · Shares · Avg · Current · **P&L** ($ and %, colored) · Action (`Sell`). Total P&L summarized in a stat card up top, colored by sign.

### Activity feed
Time-stamped rows: bought/sold/resolved, with amount and resulting P&L. Icons + `caption` timestamps, hairline dividers.

### Resolution states
- `Open` — tradeable, default.
- `Closing soon` — `--warning` badge.
- `Resolving` — pending oracle, muted, no trade controls.
- `Resolved Yes / Resolved No` — outcome shown in semantic color, positions show final P&L.

---

## 9. Component States

Every interactive element defines: **default · hover · active/pressed · focus · disabled · loading**.

- **Hover:** surfaces step up one level (`surface` → `surface-2`), text tertiary→secondary→primary.
- **Focus:** 2px `--accent` ring (`outline-none ring-2 ring-accent ring-offset-2 ring-offset-canvas`). Required on all keyboard-focusable controls.
- **Active/pressed:** `bg-surface-3`; buttons darken ~8%.
- **Disabled:** 40% opacity, `cursor-not-allowed`, no hover.
- **Loading:** skeleton blocks (`bg-surface-2` shimmer) for cards/rows; spinner inside buttons replacing the label, button stays sized.
- **Empty:** centered `--text-tertiary` message + a primary action (e.g. "No open positions — Explore markets").
- **Error:** inline `--no` text below inputs; destructive confirmations use `--no` button.

---

## 10. Accessibility & Misc

- Maintain ≥ 4.5:1 contrast for body text; `--text-secondary` on `--bg-surface` passes, `--text-tertiary` is for non-essential text only.
- Never encode meaning by color alone — Yes/No also carry labels and ↑/↓ icons (color-blind safe).
- All numeric data uses `tabular-nums` so columns don't jitter on live updates.
- Live price changes: brief flash of `--yes-muted`/`--no-muted` row background on tick, then fade.
- Motion: 150–200ms ease for hovers, 250ms for panels/slip; respect `prefers-reduced-motion`.
- Touch targets ≥ 44px on mobile; the center FAB is the primary trade entry.

---

## 11. Quick-Reference Token Sheet

```css
:root {
  /* surfaces */
  --bg-canvas:#0A0A0B; --bg-surface:#141416; --bg-surface-2:#1C1C1F;
  --bg-surface-3:#26262A; --bg-inverse:#E8EAE3;
  --border-subtle:#26262A; --border-strong:#3A3A40;
  /* text */
  --text-primary:#F5F5F4; --text-secondary:#A1A1AA;
  --text-tertiary:#6B6B73; --text-inverse:#0A0A0B;
  /* brand + semantic */
  --accent:#E8501F; --accent-hover:#FF6A3D; --accent-muted:#3A1E14;
  --yes:#22C55E; --yes-muted:#0F2E1C; --no:#EF4444; --no-muted:#34161A;
  --warning:#EAB308; --info:#60A5FA;
  /* radius */
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:20px;
  /* type */
  --font-sans:'Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
}
```

---

*Built for a Polymarket-style prediction-market dashboard. Blend of Zajno analytics layout, editorial energy-dashboard typography, and crypto-app trading ergonomics. Dark theme, React + Tailwind.*
