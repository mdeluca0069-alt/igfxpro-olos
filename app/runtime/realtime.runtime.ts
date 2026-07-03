import { wsClient }                from "../../api/websocket";
import { useAuthStore }            from "../../store/auth.store";
import { useMarketStore }          from "../../store/market.store";
import { useTradingStore }         from "../../store/trading.store";
import { useWalletStore }          from "../../store/wallet.store";
import { useNotificationStore }    from "../../store/notification.store";
import { usePortfolioStore }       from "../../store/portfolio.store";
import { useAiStore }              from "../../store/ai.store";
import { useComplianceStore }      from "../../store/compliance.store";
import { useExecutionStore }       from "../../store/execution.store";

type Unsubscribe = () => void;
let _unsubAll: Unsubscribe[] = [];
let _booted = false;

/**
 * Boot real-time infrastructure.
 * Called once on app mount. Idempotent.
 */
export async function connectRealtime(): Promise<{
  websocket: boolean;
  market:    boolean;
  api:       boolean;
}> {
  if (_booted) return { websocket: true, market: true, api: true };
  _booted = true;

  // ── 1. Restore session from httpOnly cookie ───────────────────────────────
  try {
    await useAuthStore.getState().restoreSession();
  } catch {
    // Non-fatal — user lands on login page
  }

  // ── 2. Connect WebSocket (lazy — never throws) ────────────────────────────
  let wsOk = false;
  try {
    wsClient.connect();
    wsOk = true;
  } catch {
    console.warn("[realtime] WebSocket connect failed — will retry automatically");
  }

  // ── 3. Wire store WebSocket subscriptions ─────────────────────────────────
  //    Each returns an unsubscribe fn; all cleaned up if needed.
  _unsubAll = [
    useMarketStore.getState().subscribeWs(),        // ← market quotes + connected flag
    useTradingStore.getState().subscribeWs(),       // ← positions, orders
    useNotificationStore.getState().subscribeWs(),
    usePortfolioStore.getState().subscribeWs(),
    useWalletStore.getState().subscribeWs(),
    useAiStore.getState().subscribeWs(),
    useComplianceStore.getState().subscribeWs(),
    useExecutionStore.getState().subscribeWs(),
  ];

  // ── 4. Initial data fetch (non-blocking) ──────────────────────────────────
  void useMarketStore.getState().fetchInstruments();
  void useMarketStore.getState().fetchQuotes();
  void useAiStore.getState().fetchSignals();
  void useAiStore.getState().fetchConfidence();
  void useComplianceStore.getState().fetchDisclosures();
  void useComplianceStore.getState().fetchOnboardingStatus();

  return { websocket: wsOk, market: wsOk, api: true };
}

/** Teardown — called on logout or unmount. */
export function disconnectRealtime(): void {
  _unsubAll.forEach((fn) => fn());
  _unsubAll = [];
  wsClient.disconnect();
  _booted = false;
}
