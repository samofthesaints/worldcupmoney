#!/usr/bin/env python3
"""World Cup Money — local server for the betting dashboard.

Runs with the Python standard library only. No pip install, no framework.
    python3 app.py
then your browser opens to http://localhost:8000 automatically.

It serves the dashboard and proxies Polymarket's public, read-only odds API
(so the browser never has to deal with CORS). Your bankroll and bets are stored
privately in your own browser — nothing about your betting ever leaves your
machine, and this app never touches a wallet, key, or real order.

The exact same dashboard is what gets deployed to the web (see api/markets.js,
the serverless version of this proxy).
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
INDEX_FILE = os.path.join(HERE, "index.html")

GAMMA = "https://gamma-api.polymarket.com"
HOST, PORT = "127.0.0.1", 8000

# Keywords used to recognise World Cup / soccer match markets when no search term
# is given. Polymarket titles matches like "Brazil vs. Haiti".
DEFAULT_TERMS = ["world cup", " vs", " vs.", "v.s", "to win", "group "]


def price_to_metrics(price):
    """A Polymarket share price (0-1) is the implied probability."""
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
    }


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


def _market_group(question):
    q = (question or "").lower()
    if re.search(r"\b\d+\s*[-–]\s*\d+\b", q) or "exact score" in q or "correct score" in q:
        return "Exact score"
    if "total" in q or "goals" in q or "over" in q or "under" in q:
        return "Total goals"
    if " vs" in q or "to win" in q or "winner" in q or "draw" in q or "moneyline" in q:
        return "Moneyline"
    return "Other"


def _gamma_get(path):
    req = urllib.request.Request(GAMMA + path, headers={"User-Agent": "worldcupmoney/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_markets(query):
    """Return active events matching `query`, each with all its markets grouped
    (moneyline, total goals, exact scores) and per-outcome odds."""
    terms = [query.lower()] if query else DEFAULT_TERMS
    events_out, seen = [], set()
    order = {"Moneyline": 0, "Total goals": 1, "Exact score": 2, "Other": 3}
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
            title = ev.get("title") or ""
            hay = title.lower()
            matched = any(t in hay for t in terms) or any(
                any(t in (m.get("question") or "").lower() for t in terms)
                for m in ev.get("markets", []))
            if not matched:
                continue
            eid = ev.get("id") or ev.get("slug") or title
            if eid in seen:
                continue
            seen.add(eid)
            markets = []
            for m in ev.get("markets", []):
                if m.get("closed") or not m.get("active", True):
                    continue
                outcomes = _parse_json_field(m.get("outcomes"))
                prices = _parse_json_field(m.get("outcomePrices"))
                if not outcomes or not prices or len(outcomes) != len(prices):
                    continue
                opts = [{"name": n, **price_to_metrics(p)}
                        for n, p in zip(outcomes, prices) if price_to_metrics(p)]
                if not opts:
                    continue
                markets.append({"question": m.get("question") or title,
                                "group": _market_group(m.get("question") or ""),
                                "outcomes": opts})
            if not markets:
                continue
            markets.sort(key=lambda mk: order.get(mk["group"], 3))
            events_out.append({"title": title, "slug": ev.get("slug"),
                               "end_date": ev.get("endDate"),
                               "volume24hr": ev.get("volume24hr"), "markets": markets})
        if len(events) < 100:
            break
    return events_out[:40]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
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

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            try:
                with open(INDEX_FILE, "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(500, {"error": "index.html missing"})
            return
        if parsed.path == "/api/markets":
            q = urllib.parse.parse_qs(parsed.query).get("q", [""])[0].strip()
            try:
                self._send(200, {"ok": True, "events": fetch_markets(q)})
            except Exception as e:
                self._send(200, {"ok": False, "error": str(e), "events": []})
            return
        self._send(404, {"error": "not found"})


def main():
    url = "http://%s:%d" % (HOST, PORT)
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        print("Port %d is already in use." % PORT)
        print("World Cup Money is probably already running — just open %s" % url)
        return
    print("\n  ⚽  World Cup Money is running.")
    print("  Open this in your browser:  %s" % url)
    print("  Keep this window open while you use it. Press Ctrl+C to stop.\n")
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
