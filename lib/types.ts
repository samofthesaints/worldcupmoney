export type Outcome = {
  name: string;
  price: number;
  impliedPct: number;
  decimalOdds: number;
  tokenId?: string;
};

export type MarketGroup = "Moneyline" | "Total goals" | "Exact score" | "Other";

export type Market = {
  question: string;
  group: MarketGroup;
  outcomes: Outcome[];
  overhead: number; // sum of outcome prices - 1 (the vig); lower = better value
};

export type MatchScore = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  state: string;
  clock: string;
  detail: string;
};

export type MatchEvent = {
  title: string;
  slug?: string;
  endDate?: string;
  kickoff?: string;
  volume24hr?: number;
  live?: boolean;
  score?: MatchScore;
  markets: Market[];
};

export type MarketsResponse = {
  ok: boolean;
  error?: string;
  events: MatchEvent[];
};

export type Bet = {
  id: number;
  match: string;
  pick: string;
  stake: number;
  price: number;
  decimalOdds: number;
  toReturn: number;
  status: "open" | "won" | "lost";
  placedAt: number;
};

export type SessionState = {
  startingBankroll: number;
  bankroll: number;
  stopLoss: number;
  bets: Bet[];
  nextId: number;
  importedPositions: string[];
};

export type Signal = {
  kind: "value" | "momentum" | "live" | "favorite";
  label: string;
  detail: string;
};

export type Suggestion = {
  match: string;
  pick: string;
  group: MarketGroup;
  price: number;
  impliedPct: number;
  decimalOdds: number;
  score: number;
  signals: Signal[];
  reasoning: string;
  odds: { name: string; price: number }[];
  endDate?: string;
  kickoff?: string;
  live?: boolean;
};

export type SuggestionsResponse = {
  ok: boolean;
  error?: string;
  suggestions: Suggestion[];
};

export type PricePoint = { t: number; p: number };

export type Position = {
  title: string;
  outcome: string;
  size: number;
  avgPrice: number;
  curPrice: number;
  value: number;
  pnl: number;
  pnlPct: number;
  redeemable: boolean;
  slug?: string;
};

export type PositionsResponse = {
  ok: boolean;
  error?: string;
  value: number;
  positions: Position[];
};
