/**
 * MSW (Mock Service Worker) request handlers for development.
 * These intercept API calls when the backend is unavailable.
 *
 * Install: npm install --save-dev msw
 * Setup:   npx msw init public/ --save
 * Enable:  VITE_MSW_ENABLED=true in .env.local
 */
import { http, HttpResponse } from "msw";

// ─── Shared mock data ─────────────────────────────────────────────────────────

const QUOTES = [
  { symbol: "EURUSD", bid: 1.08514, ask: 1.08522, mid: 1.08518, spread: 0.00008, changePct: 0.12,  ts: new Date().toISOString() },
  { symbol: "GBPUSD", bid: 1.26831, ask: 1.26842, mid: 1.26836, spread: 0.00011, changePct: 0.09,  ts: new Date().toISOString() },
  { symbol: "USDJPY", bid: 155.392, ask: 155.414, mid: 155.403, spread: 0.022,   changePct: -0.04, ts: new Date().toISOString() },
  { symbol: "XAUUSD", bid: 2362.8,  ask: 2363.4,  mid: 2363.1,  spread: 0.6,    changePct: -0.08, ts: new Date().toISOString() },
  { symbol: "US500",  bid: 5288.2,  ask: 5289.1,  mid: 5288.65, spread: 0.9,    changePct: 0.21,  ts: new Date().toISOString() },
  { symbol: "BTCUSD", bid: 67620,   ask: 67678,   mid: 67649,   spread: 58,     changePct: 0.34,  ts: new Date().toISOString() },
  { symbol: "AAPL",   bid: 194.02,  ask: 194.16,  mid: 194.09,  spread: 0.14,   changePct: -0.15, ts: new Date().toISOString() },
];

const RISK = {
  riskScore: 18, marginLevelPct: 842, exposure: 186400, drawdownPct: 1.8,
  negativeBalanceProtection: true, stopOutLevelPct: 50,
  leveragePolicy: { FX_MAJOR: 30, FX_MINOR: 20, INDEX: 20, COMMODITY: 10, EQUITY: 5, CRYPTO: 2 },
  alerts: ["ESMA retail leverage controls active", "Negative balance protection active"],
};

const WALLET = { currency: "USD", available: 100000, equity: 101840, marginUsed: 12640, freeMargin: 89200, unrealizedPnl: 1840 };

const SIGNALS = QUOTES.slice(0, 5).map((q, i) => ({
  id: `mock-${q.symbol}`,
  symbol: q.symbol,
  direction: q.changePct > 0 ? "BUY" : "SELL",
  confidence: 0.72 + i * 0.04,
  horizon: i % 2 === 0 ? "INTRADAY" : "SWING",
  regime: "Liquidity expansion",
  rationale: "OLOS weighs momentum, spread quality and event risk before surfacing the setup.",
  generatedAt: new Date().toISOString(),
}));

function mockOHLCV(symbol: string, timeframe: string) {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = symbol.includes("BTC") ? 67000 : symbol.includes("XAU") ? 2360 : symbol.includes("JPY") ? 155 : 1.085;
  const intervalSec = timeframe === "1M" ? 60 : timeframe === "5M" ? 300 : timeframe === "15M" ? 900 : timeframe === "1H" ? 3600 : timeframe === "4H" ? 14400 : 86400;
  const now = Math.floor(Date.now() / 1000);
  let price = base;
  return Array.from({ length: 100 }, (_, i) => {
    const wave = Math.sin((i + seed) / 8) * base * 0.003;
    const o = price;
    const c = price + wave + (Math.random() - 0.5) * base * 0.001;
    const h = Math.max(o, c) * 1.0005;
    const l = Math.min(o, c) * 0.9995;
    price = c;
    return { time: now - (100 - i) * intervalSec, open: +o.toFixed(5), high: +h.toFixed(5), low: +l.toFixed(5), close: +c.toFixed(5), volume: Math.floor(1000 + Math.random() * 5000) };
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

const BASE = "http://localhost:3000";

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/session`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    if (body.email === "trader@igfxpro.local" && body.password === "OlosDemo!2026") {
      return HttpResponse.json({
        accessToken:  "mock.access.token",
        refreshToken: "mock.refresh.token",
        expiresIn:    3600,
        tokenType:    "Bearer",
        principal:    { sub: "usr_trader_demo", email: body.email, fullName: "Demo Trader", tier: "PLATINUM", roles: ["trader"], permissions: ["trading:read", "trading:write"], kycStatus: "approved", tenantId: "tenant_igfxpro" },
        tenantId:     "tenant_igfxpro",
      });
    }
    return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }),

  // Market data
  http.get(`${BASE}/api/v1/trading/quotes`,      () => HttpResponse.json(QUOTES)),
  http.get(`${BASE}/api/v1/trading/positions`,   () => HttpResponse.json([])),
  http.get(`${BASE}/api/v1/trading/history`,     () => HttpResponse.json([])),
  http.get(`${BASE}/api/v1/risk/snapshot`,       () => HttpResponse.json(RISK)),
  http.get(`${BASE}/api/v1/wallet/balance`,      () => HttpResponse.json(WALLET)),
  http.get(`${BASE}/api/v1/ai/signals`,          () => HttpResponse.json(SIGNALS)),
  http.get(`${BASE}/api/v1/calendar/economic`,   () => HttpResponse.json([])),
  http.get(`${BASE}/api/v1/trading/instruments`, () => HttpResponse.json(QUOTES.map((q) => ({ symbol: q.symbol, name: q.symbol, assetClass: "FX_MAJOR", precision: 5, minTradeSize: 1000, maxLeverageRetail: 30, session: "24/5" })))),
  http.get(`${BASE}/api/v1/client/account`,      () => HttpResponse.json({ profile: { fullName: "Demo Trader", email: "trader@igfxpro.local", tier: "PLATINUM", kycStatus: "APPROVED", mifidStatus: "COMPLETED", authKeyStatus: "VERIFIED" }, capital: { allocated: 100000, equity: 101840, marginUsed: 12640, freeMargin: 89200, unrealizedPnl: 1840, riskScore: 18 }, ledger: [], documents: [] })),

  // OHLCV candles
  http.get(`${BASE}/api/v1/candles/:symbol/:timeframe`, ({ params }) => {
    return HttpResponse.json(mockOHLCV(String(params.symbol), String(params.timeframe)));
  }),

  // Indicators
  http.get(`${BASE}/api/v1/indicators/:symbol`, ({ params }) => {
    const sym = String(params.symbol);
    return HttpResponse.json({ symbol: sym, timeframe: "15M", rsi: 52.4, macd: { value: 0.00012, signal: 0.00008, histogram: 0.00004, bias: "bullish" }, ema: { ema20: 1.085, ema50: 1.083, trend: "uptrend" }, vwap: 1.0847, bollinger: { upper: 1.0872, middle: 1.085, lower: 1.0828, bandwidthPct: 2.1 }, fibonacci: [], smartMoney: { bias: "accumulation", orderBlock: "1.083-1.084", liquiditySweep: "Buy-side watch", volumeProfile: "POC 1.085" } });
  }),

  // Order placement
  http.post(`${BASE}/api/v1/trading/order`, async ({ request }) => {
    const body = await request.json() as { symbol?: string; side?: string };
    return HttpResponse.json({
      id: `ord-${Date.now()}`, symbol: body.symbol ?? "EURUSD", side: body.side ?? "BUY",
      type: "MARKET", status: "FILLED", quantity: 1000,
      averageFillPrice: 1.08522, marginRequired: 361.74, notional: 10852.2, createdAt: new Date().toISOString(),
    });
  }),

  // Health
  http.get(`${BASE}/health`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${BASE}/api/v1/autopilot/config`, () => HttpResponse.json({
    userId: "usr_trader_demo", tier: "PLATINUM", enabled: true, mode: "supervised",
    minConfidence: 0.78, maxRiskPerTradePct: 1.2, eventLockMinutes: 30,
    allowedSymbols: ["EURUSD", "XAUUSD"], activeRules: [],
    lastDecision: { symbol: "EURUSD", action: "WAIT", reason: "Awaiting OLOS signal." },
  })),
  http.get(`${BASE}/config/feature-flags`, () => HttpResponse.json({ aiTrading: true, smartSignals: true, liveTrading: false, sandboxExecution: true })),
  http.get(`${BASE}/tenant/active`,         () => HttpResponse.json({ id: "tenant_igfxpro", name: "IGFXPRO", region: "EU" })),
];
