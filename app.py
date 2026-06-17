#!/usr/bin/env python3
"""World Cup Money — a small local dashboard for disciplined, compounding World Cup bets.

Runs with the Python standard library only. No pip install, no framework.
    python3 app.py
then open http://localhost:8000 in your browser.

This is a *track & advise* tool. It never moves money and never touches a wallet
or private key. It pulls public Polymarket odds (read-only), does the betting math
for you, helps you size a compounding chain, and keeps an honest record of your
bankroll. You place every real bet yourself on Polymarket.
"""

import json
import os
import re
import threading
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
STATE_FILE = os.path.join(DATA_DIR, "session.json")
INDEX_FILE = os.path.join(HERE, "index.html")

GAMMA = "https://gamma-api.polymarket.com"
HOST, PORT = "127.0.0.1", 8000

# Keywords used to recognise World Cup / soccer match markets when no search term
# is given. Polymarket titles matches like "Brazil vs. Haiti", so we match on "vs"
# plus a broad sports net. You can always type a team name in the search box.
DEFAULT_TERMS = ["world cup", " vs", " vs.", "v.s", "to win", "group "]


# --------------------------------------------------------------------------- #
# Persistent session state
# --------------------------------------------------------------------------- #
def default_state():
    return {
        "starting_bankroll": 0.0,
        "bankroll": 0.0,
        "stop_loss": 0.0,        # stop betting if bankroll falls to/below this
        "bets": [],              # list of bet dicts
        "next_id": 1,
    }


def load_state():
    if not os.path.exists(STATE_FILE):
        return default_state()
    try:
        with open(STATE_FILE) as f:
            s = json.load(f)
        # backfill any missing keys from defaults
        d = default_state()
        d.update(s)
        return d
    except (json.JSONDecodeError, OSError):
        return default_state()


def save_state(state):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2)
    os.replace(tmp, STATE_FILE)


# --------------------------------------------------------------------------- #
# Betting math
# --------------------------------------------------------------------------- #
def price_to_metrics(price):
    """A Polymarket share price (0-1) is the implied probability.
    Buy at price p: each $1 of stake buys 1/p shares, each winning share -> $1.
    """
    try:
        p = float(price)
    except (TypeError, ValueError):
        return None
    if p <= 0 or p >= 1:
        return None
    return {
        "price": round(p, 4),
        "implied_pct": round(p * 100, 1),
        "decimal_odds": round(1.0 / p, 3),
        "payout_per_dollar": round(1.0 / p, 3),   # total returned per $1 staked on a win
        "profit_per_dollar": round((1.0 - p) / p, 3),
    }


# --------------------------------------------------------------------------- #
# Polymarket Gamma API (read-only)
# --------------------------------------------------------------------------- #
def _gamma_get(path):
    url = GAMMA + path
    req = urllib.request.Request(url, headers={"User-Agent": "worldcupmoney/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_markets(query):
    """Return active events matching `query`, each with ALL its markets grouped.

    Grouping by event means a single match card shows every bet type Polymarket
    lists for it: the moneyline (win/draw/win), total-goals, and exact-score
    markets (0-0, 2-2, ...). Each market's outcomes carry implied probability and
    payout. We page through active events sorted by 24h volume and filter by
    substring on the event title or any inner market question.
    """
    terms = [query.lower()] if query else DEFAULT_TERMS
    events_out = []
    seen_events = set()
    for offset in (0, 100, 200):
        path = ("/events?closed=false&active=true&limit=100&offset=%d"
                "&order=volume24hr&ascending=false" % offset)
        try:
            events = _gamma_get(path)
        except Exception:
            break
        if not events:
            break
        for ev in events:
            title = (ev.get("title") or "")
            hay = title.lower()
            matched = any(t in hay for t in terms) or any(
                any(t in (m.get("question") or "").lower() for t in terms)
                for m in ev.get("markets", []))
            if not matched:
                continue
            eid = ev.get("id") or ev.get("slug") or title
            if eid in seen_events:
                continue
            seen_events.add(eid)
            markets = []
            for m in ev.get("markets", []):
                if m.get("closed") or not m.get("active", True):
                    continue
                outcomes = _parse_json_field(m.get("outcomes"))
                prices = _parse_json_field(m.get("outcomePrices"))
                if not outcomes or not prices or len(outcomes) != len(prices):
                    continue
                opts = []
                for name, pr in zip(outcomes, prices):
                    metrics = price_to_metrics(pr)
                    if metrics:
                        opts.append({"name": name, **metrics})
                if not opts:
                    continue
                markets.append({
                    "question": m.get("question") or title,
                    "group": _market_group(m.get("question") or ""),
                    "outcomes": opts,
                })
            if not markets:
                continue
            # Moneyline first, then totals, then exact scores, then the rest.
            order = {"Moneyline": 0, "Total goals": 1, "Exact score": 2, "Other": 3}
            markets.sort(key=lambda mk: order.get(mk["group"], 3))
            events_out.append({
                "title": title,
                "slug": ev.get("slug"),
                "end_date": ev.get("endDate"),
                "volume24hr": ev.get("volume24hr"),
                "markets": markets,
            })
        if len(events) < 100:
            break
    return events_out[:40]


def _market_group(question):
    """Best-effort bucket for a market so the UI can label/sort bet types."""
    q = question.lower()
    if re.search(r"\b\d+\s*[-–]\s*\d+\b", q) or "exact score" in q or "correct score" in q:
        return "Exact score"
    if "total" in q or "goals" in q or "over" in q or "under" in q:
        return "Total goals"
    if " vs" in q or "to win" in q or "winner" in q or "draw" in q or "moneyline" in q:
        return "Moneyline"
    return "Other"


def _parse_json_field(val):
    """Gamma encodes arrays as JSON strings, e.g. '["Yes","No"]'."""
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except json.JSONDecodeError:
            return None
    return None


# --------------------------------------------------------------------------- #
# HTTP handler
# --------------------------------------------------------------------------- #
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):  # quiet
        pass

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body)
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    # ---- GET ----
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/" or path == "/index.html":
            try:
                with open(INDEX_FILE, "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(500, {"error": "index.html missing"})
            return
        if path == "/api/state":
            self._send(200, load_state())
            return
        if path == "/api/markets":
            q = urllib.parse.parse_qs(parsed.query).get("q", [""])[0].strip()
            try:
                events = fetch_markets(q)
                self._send(200, {"ok": True, "events": events})
            except Exception as e:
                self._send(200, {"ok": False, "error": str(e), "events": []})
            return
        if path == "/api/compound":
            qs = urllib.parse.parse_qs(parsed.query)
            try:
                start = float(qs.get("start", ["0"])[0])
                fraction = float(qs.get("fraction", ["1"])[0])
                prices = [float(x) for x in qs.get("prices", [""])[0].split(",") if x.strip()]
            except ValueError:
                self._send(400, {"error": "bad params"})
                return
            self._send(200, simulate_compound(start, prices, fraction))
            return
        self._send(404, {"error": "not found"})

    # ---- POST ----
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        body = self._read_json()
        state = load_state()

        if path == "/api/session":
            try:
                start = float(body.get("starting_bankroll", 0))
                stop = float(body.get("stop_loss", 0))
            except (TypeError, ValueError):
                self._send(400, {"error": "bad numbers"})
                return
            state = default_state()
            state["starting_bankroll"] = start
            state["bankroll"] = start
            state["stop_loss"] = stop
            save_state(state)
            self._send(200, state)
            return

        if path == "/api/bets":
            try:
                stake = float(body.get("stake", 0))
                price = float(body.get("price", 0))
            except (TypeError, ValueError):
                self._send(400, {"error": "bad numbers"})
                return
            m = price_to_metrics(price)
            if stake <= 0 or not m:
                self._send(400, {"error": "stake must be > 0 and price between 0 and 1"})
                return
            bet = {
                "id": state["next_id"],
                "match": (body.get("match") or "").strip() or "Untitled match",
                "pick": (body.get("pick") or "").strip(),
                "stake": round(stake, 2),
                "price": m["price"],
                "decimal_odds": m["decimal_odds"],
                "to_return": round(stake * m["payout_per_dollar"], 2),
                "status": "open",   # open | won | lost
            }
            state["next_id"] += 1
            state["bets"].append(bet)
            save_state(state)
            self._send(200, state)
            return

        if path == "/api/settle":
            bet_id = body.get("id")
            result = body.get("result")  # "won" | "lost"
            bet = next((b for b in state["bets"] if b["id"] == bet_id), None)
            if not bet or result not in ("won", "lost"):
                self._send(400, {"error": "bad bet id or result"})
                return
            if bet["status"] != "open":
                # revert prior effect before re-applying
                if bet["status"] == "won":
                    state["bankroll"] -= bet["to_return"]
                    state["bankroll"] += bet["stake"]
                elif bet["status"] == "lost":
                    state["bankroll"] += bet["stake"]
            # apply: stake was already "spent" when placed? We model bankroll at
            # settlement only, so: lost -> minus stake; won -> minus stake + return.
            if result == "lost":
                state["bankroll"] -= bet["stake"]
            else:
                state["bankroll"] += (bet["to_return"] - bet["stake"])
            state["bankroll"] = round(state["bankroll"], 2)
            bet["status"] = result
            save_state(state)
            self._send(200, state)
            return

        if path == "/api/delete":
            bet_id = body.get("id")
            bet = next((b for b in state["bets"] if b["id"] == bet_id), None)
            if bet:
                if bet["status"] == "won":
                    state["bankroll"] -= (bet["to_return"] - bet["stake"])
                elif bet["status"] == "lost":
                    state["bankroll"] += bet["stake"]
                state["bankroll"] = round(state["bankroll"], 2)
                state["bets"] = [b for b in state["bets"] if b["id"] != bet_id]
                save_state(state)
            self._send(200, state)
            return

        self._send(404, {"error": "not found"})


def simulate_compound(start, prices, fraction):
    """Roll `fraction` of the bankroll through each leg at its price.
    Returns the projected bankroll after each winning leg, plus the combined
    probability that *all* legs hit (the honest reality check)."""
    fraction = min(max(fraction, 0.0), 1.0)
    legs = []
    bankroll = start
    combined_prob = 1.0
    for p in prices:
        m = price_to_metrics(p)
        if not m:
            legs.append({"price": p, "error": "price must be between 0 and 1"})
            continue
        stake = bankroll * fraction
        win_return = stake * m["payout_per_dollar"]
        after_win = bankroll - stake + win_return
        combined_prob *= m["price"]
        legs.append({
            "price": m["price"],
            "implied_pct": m["implied_pct"],
            "decimal_odds": m["decimal_odds"],
            "stake": round(stake, 2),
            "bankroll_if_win": round(after_win, 2),
        })
        bankroll = after_win
    return {
        "start": round(start, 2),
        "fraction": fraction,
        "legs": legs,
        "final_if_all_win": round(bankroll, 2),
        "profit_if_all_win": round(bankroll - start, 2),
        "combined_hit_prob_pct": round(combined_prob * 100, 2) if prices else 0.0,
    }


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    url = "http://%s:%d" % (HOST, PORT)
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        print("Port %d is already in use." % PORT)
        print("World Cup Money is probably already running — just open %s" % url)
        print("in your browser. (Or close the other window and try again.)")
        return
    print("\n  ⚽  World Cup Money is running.")
    print("  Open this in your browser:  %s" % url)
    print("  Keep this window open while you use it. Press Ctrl+C to stop.\n")
    # Pop the dashboard open automatically once the server is up.
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
