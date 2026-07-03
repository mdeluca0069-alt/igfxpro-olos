import { wsClient } from "../api/websocket";
import { useTradingStore } from "../store/trading.store";
import { useMarketStore }  from "../store/market.store";
import { useRiskStore }    from "../store/risk.store";
import { useSignalStore, type OlosSignal } from "../store/signal.store";

type StreamEvent =
  | "market"
  | "ai"
  | "execution"
  | "signal"
  | "portfolio"
  | "risk"
  | "position.opened"
  | "position.closed"
  | "position.pnl_updated"
  | "wallet.event"
  | "margin.warning";

type Handler = (data: unknown) => void;

// ─── Execution event payloads (from backend ws.broadcaster / main.ts) ─────────

type PositionOpenedPayload = {
  positionId:  string;
  userId:      string;
  symbol:      string;
  side:        "BUY" | "SELL";
  quantity:    number;
  entryPrice:  number;
  marginUsed:  number;
  leverage:    number;
  timestamp:   string;
};

type PositionClosedPayload = {
  positionId:  string;
  userId:      string;
  symbol:      string;
  side:        "BUY" | "SELL";
  quantity:    number;
  entryPrice:  number;
  exitPrice:   number;
  pnl:         number;
  timestamp:   string;
};

type PositionPnlUpdatedPayload = {
  positionId:  string;
  userId:      string;
  symbol:      string;
  markPrice:   number;
  pnl:         number;
  pnlPercent:  number;
  timestamp:   string;
};

type MarginWarningPayload = {
  userId:          string;
  marginLevelPct:  number;
  freeMargin:      number;
  equity:          number;
  threshold:       "MARGIN_CALL" | "STOP_OUT";
  timestamp:       string;
};

// ─── Signal payload (backend may send the thin `signal.generated` event,
//     which uses `signalId`/`timestamp` instead of `id`/`generatedAt` and
//     omits several OlosSignal fields entirely) ─────────────────────────────

type RawSignalEvent = Partial<OlosSignal> & {
  signalId?: string;
  timestamp?: string;
};

function normalizeSignal(raw: RawSignalEvent | null | undefined): OlosSignal | null {
  const id = raw?.id ?? raw?.signalId;
  if (!id || !raw?.symbol) return null;
  return {
    id,
    symbol:              raw.symbol,
    timeframe:            raw.timeframe ?? "1H",
    signalType:           raw.signalType ?? "NEUTRAL",
    confidence:           raw.confidence ?? 0,
    entryPrice:           raw.entryPrice ?? 0,
    stopLoss:             raw.stopLoss ?? 0,
    targetLevels:         raw.targetLevels ?? [],
    riskRewardRatio:      raw.riskRewardRatio ?? 0,
    marketRegime:         raw.marketRegime ?? "",
    volatilityLevel:      raw.volatilityLevel ?? "",
    confluenceFactors:    raw.confluenceFactors ?? [],
    confidenceBreakdown:  raw.confidenceBreakdown ?? {},
    entryRationale:       raw.entryRationale ?? "",
    slRationale:          raw.slRationale ?? "",
    setupPattern:         raw.setupPattern ?? "",
    status:               raw.status ?? "ACTIVE",
    generatedAt:          raw.generatedAt ?? raw.timestamp ?? new Date().toISOString(),
    triggeredAt:          raw.triggeredAt,
  };
}

// ─── Unified stream ───────────────────────────────────────────────────────────

class UnifiedStream {
  private readonly handlers = new Map<StreamEvent, Handler[]>();
  private wired = false;

  private ensureTransport(): void {
    if (this.wired) return;
    this.wired = true;

    wsClient.connect();

    // ── Market data ─────────────────────────────────────────────────────
    wsClient.on("market",       (data) => {
      const raw = data as { payload?: import("../store/market.store").Quote[] } | import("../store/market.store").Quote;
      if (Array.isArray((raw as { payload?: import("../store/market.store").Quote[] }).payload)) {
        useMarketStore.getState().setQuotes((raw as { payload: import("../store/market.store").Quote[] }).payload);
      } else if ((raw as import("../store/market.store").Quote).symbol) {
        useMarketStore.getState().setQuote(raw as import("../store/market.store").Quote);
      }
      this.emit("market", data);
    });
    wsClient.on("market.quotes", (data) => {
      // Backend sends: { type: "market.quotes", payload: Quote[] }
      const quotes = data as import("../store/market.store").Quote[];
      if (Array.isArray(quotes)) useMarketStore.getState().setQuotes(quotes);
      this.emit("market", data);
    });
    wsClient.on("market.quote", (data) => {
      const q = data as { symbol: string; bid: number; ask: number; mid: number; spread: number; changePct: number; timestamp: string };
      if (q?.symbol) {
        useMarketStore.getState().setQuote({ symbol: q.symbol, bid: q.bid, ask: q.ask, mid: q.mid, spread: q.spread, changePct: q.changePct, ts: q.timestamp });
      }
    });

    // ── AI / signals ────────────────────────────────────────────────────
    wsClient.on("ai",               (data) => this.emit("ai",    data));
    wsClient.on("signal",           (data) => {
      // Populate signal store directly
      const event = data as { payload?: RawSignalEvent } | RawSignalEvent;
      const raw    = (event as { payload?: RawSignalEvent }).payload ?? (event as RawSignalEvent);
      const signal = normalizeSignal(raw);
      if (signal) useSignalStore.getState().addSignal(signal);
      this.emit("signal", data);
    });
    wsClient.on("signal.generated", (data) => {
      // Backend sends the thin SignalGeneratedEvent shape here (signalId, not id) —
      // normalizeSignal() maps it onto the full OlosSignal the store expects.
      const event = data as { payload?: RawSignalEvent } | RawSignalEvent;
      const raw    = (event as { payload?: RawSignalEvent }).payload ?? (event as RawSignalEvent);
      const signal = normalizeSignal(raw);
      if (signal) useSignalStore.getState().addSignal(signal);
      this.emit("signal", data);
    });

    // ── Portfolio ────────────────────────────────────────────────────────
    wsClient.on("portfolio", (data) => this.emit("portfolio", data));

    // ── Risk ─────────────────────────────────────────────────────────────
    wsClient.on("risk", (data) => {
      const raw = data as { warning?: { severity: string; marginLevel: number; riskScore: number; message: string } } | null;
      if (raw?.warning) {
        const w = raw.warning;
        const sev = w.severity as "INFO" | "WARNING" | "CRITICAL";
        useRiskStore.getState().addWarning({
          id:           `w-${Date.now()}`,
          severity:     sev,
          marginLevel:  w.marginLevel,
          riskScore:    w.riskScore,
          message:      w.message,
          acknowledged: false,
          createdAt:    new Date().toISOString(),
        });
      }
      this.emit("risk", data);
    });

    // ── Execution (legacy fill event from main.ts) ────────────────────────
    wsClient.on("execution", (data) => {
      const ev = data as { orderId?: string; status?: string; averageFillPrice?: number } | null;
      if (ev?.orderId && ev.status) {
        useTradingStore
          .getState()
          .updateOrderStatus(ev.orderId, ev.status as import("../store/trading.store").OrderStatus, ev.averageFillPrice);
      }
      this.emit("execution", data);
    });

    // ── Position opened ───────────────────────────────────────────────────
    wsClient.on("position.opened", (data) => {
      const ev = data as PositionOpenedPayload | null;
      if (ev?.positionId) {
        const store = useTradingStore.getState();
        const already = store.positions.some((p) => p.id === ev.positionId);
        if (!already) {
          store.setPositions([
            ...store.positions,
            {
              id:         ev.positionId,
              symbol:     ev.symbol,
              side:       ev.side,
              quantity:   ev.quantity,
              entryPrice: ev.entryPrice,
              markPrice:  ev.entryPrice,
              pnl:        0,
              marginUsed: ev.marginUsed,
              leverage:   ev.leverage,
              openedAt:   ev.timestamp,
            },
          ]);
        }
      }
      this.emit("position.opened", data);
    });

    // ── Position closed ───────────────────────────────────────────────────
    wsClient.on("position.closed", (data) => {
      const ev = data as PositionClosedPayload | null;
      if (ev?.positionId) {
        useTradingStore.getState().removePosition(ev.positionId);
      }
      this.emit("position.closed", data);
    });

    // ── Position P&L updated (mark-to-market) ─────────────────────────────
    wsClient.on("position.pnl_updated", (data) => {
      const ev = data as PositionPnlUpdatedPayload | null;
      if (ev?.positionId) {
        useTradingStore.getState().updatePositionMark(ev.positionId, ev.markPrice, ev.pnl);
      }
      this.emit("position.pnl_updated", data);
    });

    // ── Wallet event ──────────────────────────────────────────────────────
    wsClient.on("wallet.event", (data) => {
      this.emit("wallet.event", data);
    });

    // ── Margin warning ────────────────────────────────────────────────────
    wsClient.on("margin.warning", (data) => {
      const ev = data as MarginWarningPayload | null;
      if (ev?.threshold === "STOP_OUT") {
        useRiskStore.getState().setKillSwitch(false); // not kill switch, just warning
      }
      this.emit("margin.warning", data);
    });
  }

  on(event: StreamEvent, handler: Handler): void {
    this.ensureTransport();
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  emit(event: StreamEvent, data: unknown): void {
    const list = this.handlers.get(event);
    if (!list) return;
    for (const h of list) {
      try { h(data); } catch { /* isolate subscriber failures */ }
    }
  }

  send(event: StreamEvent, payload: unknown): void {
    this.ensureTransport();
    wsClient.send(event, payload);
  }
}

export const unifiedStream = new UnifiedStream();
