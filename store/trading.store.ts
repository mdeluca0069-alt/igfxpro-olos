import { create } from "zustand";
import { wsClient } from "../api/websocket";
import { getApiClient } from "../api/httpClient";

export type OrderSide   = "BUY" | "SELL";
export type OrderType   = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" | "TRAILING_STOP" | "OCO";
export type OrderStatus =
  | "RECEIVED" | "RISK_REVIEW" | "ACCEPTED"
  | "PARTIALLY_FILLED" | "FILLED" | "REJECTED" | "CANCELLED";

export type Order = {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  requestedPrice?: number;
  averageFillPrice?: number;
  marginRequired: number;
  notional: number;
  rejectionReason?: string;
  createdAt: string;
};

export type Position = {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent?: number;
  marginUsed: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
  status?: string;
};

export type PendingOrder = {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  triggerPrice: number;
  limitPrice?: number;
  trailAmount?: number;
  status: string;
  createdAt: string;
};

export type NewOrderDraft = {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
};

type TradingState = {
  orders:        Order[];
  positions:     Position[];
  pendingOrders: PendingOrder[];
  orderDraft:    Partial<NewOrderDraft>;
  lastOrderAt:   string | null;
  submitting:    boolean;
  loading:       boolean;
  ordersError:   string | null;

  // Setters
  setOrders:           (orders: Order[]) => void;
  setPositions:        (positions: Position[]) => void;
  setPendingOrders:    (orders: PendingOrder[]) => void;
  addOrder:            (order: Order) => void;
  updateOrderStatus:   (orderId: string, status: OrderStatus, fillPrice?: number) => void;
  updatePositionMark:  (positionId: string, markPrice: number, pnl: number, pnlPct?: number) => void;
  removePosition:      (positionId: string) => void;
  setOrderDraft:       (draft: Partial<NewOrderDraft>) => void;
  clearOrderDraft:     () => void;
  setSubmitting:       (v: boolean) => void;

  // API actions
  fetchPositions:  () => Promise<void>;
  fetchOrders:     () => Promise<void>;
  fetchPending:    () => Promise<void>;
  placeOrder:      (draft: NewOrderDraft) => Promise<Order | null>;
  closePosition:   (positionId: string) => Promise<boolean>;
  cancelOrder:     (orderId: string) => Promise<boolean>;
  cancelPending:   (pendingId: string) => Promise<boolean>;
  modifyOrder:     (orderId: string, stopLoss?: number, takeProfit?: number) => Promise<boolean>;

  // WebSocket lifecycle
  subscribeWs: () => () => void;

  // Computed
  getOpenPositions:     () => Position[];
  getTotalUnrealizedPnL:() => number;
  getTotalMarginUsed:   () => number;
};

export const useTradingStore = create<TradingState>((set, get) => ({
  orders:        [],
  positions:     [],
  pendingOrders: [],
  orderDraft:    {},
  lastOrderAt:   null,
  submitting:    false,
  loading:       false,
  ordersError:   null,

  setOrders:       (orders)   => set({ orders }),
  setPositions:    (positions) => set({ positions }),
  setPendingOrders: (pendingOrders) => set({ pendingOrders }),

  addOrder: (order) =>
    set((state) => ({
      orders:      [order, ...state.orders],
      lastOrderAt: new Date().toISOString(),
    })),

  updateOrderStatus: (orderId, status, fillPrice) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? { ...o, status, ...(fillPrice !== undefined ? { averageFillPrice: fillPrice } : {}) }
          : o
      ),
    })),

  updatePositionMark: (positionId, markPrice, pnl, pnlPct) =>
    set((state) => ({
      positions: state.positions.map((p) =>
        p.id === positionId
          ? { ...p, markPrice, pnl, ...(pnlPct !== undefined ? { pnlPercent: pnlPct } : {}) }
          : p
      ),
    })),

  removePosition: (positionId) =>
    set((state) => ({
      positions: state.positions.filter((p) => p.id !== positionId),
    })),

  setOrderDraft:   (draft) =>
    set((state) => ({ orderDraft: { ...state.orderDraft, ...draft } })),
  clearOrderDraft: () => set({ orderDraft: {} }),
  setSubmitting:   (submitting) => set({ submitting }),

  // ── API actions ────────────────────────────────────────────────────────────────

  fetchPositions: async () => {
    set({ loading: true });
    try {
      const res = await getApiClient().get<Position[]>("/api/v1/trading/positions");
      const raw = Array.isArray(res.data) ? res.data : [];
      const data = raw.map((p) => ({
        ...p,
        quantity:   Number(p.quantity)   || 0,
        entryPrice: Number(p.entryPrice) || 0,
        markPrice:  Number(p.markPrice)  || 0,
        pnl:        Number(p.pnl)        || 0,
        marginUsed: Number(p.marginUsed) || 0,
        leverage:   Number(p.leverage)   || 0,
        ...(p.stopLoss   != null ? { stopLoss:   Number(p.stopLoss)   || 0 } : {}),
        ...(p.takeProfit != null ? { takeProfit: Number(p.takeProfit) || 0 } : {}),
      }));
      set({ positions: data });
    } catch {
      // Non-fatal: keep stale data
    } finally {
      set({ loading: false });
    }
  },

  fetchOrders: async () => {
    try {
      const res = await getApiClient().get<Order[]>("/api/v1/trading/history");
      const data = Array.isArray(res.data) ? res.data : [];
      set({ orders: data, ordersError: null });
    } catch (err) {
      set({ ordersError: err instanceof Error ? err.message : "Failed to fetch orders" });
    }
  },

  fetchPending: async () => {
    try {
      const res = await getApiClient().get<{ ok: boolean; orders: PendingOrder[] }>(
        "/api/v1/trading/orders/pending"
      );
      if (res.data?.ok && Array.isArray(res.data.orders)) {
        set({ pendingOrders: res.data.orders });
      }
    } catch { /* non-fatal */ }
  },

  placeOrder: async (draft) => {
    set({ submitting: true });
    try {
      const res = await getApiClient().post<Order>("/api/v1/trading/order", {
        symbol:     draft.symbol,
        side:       draft.side,
        type:       draft.type,
        quantity:   draft.quantity,
        price:      draft.price,
        stopLoss:   draft.stopLoss,
        takeProfit: draft.takeProfit,
        leverage:   draft.leverage,
      });
      const order = res.data;
      get().addOrder(order);
      return order;
    } catch {
      return null;
    } finally {
      set({ submitting: false });
    }
  },

  closePosition: async (positionId) => {
    try {
      await getApiClient().post(`/api/v1/trading/position/${encodeURIComponent(positionId)}/close`);
      get().removePosition(positionId);
      return true;
    } catch {
      return false;
    }
  },

  cancelOrder: async (orderId) => {
    try {
      await getApiClient().delete(`/api/v1/trading/order/${encodeURIComponent(orderId)}`);
      get().updateOrderStatus(orderId, "CANCELLED");
      return true;
    } catch {
      return false;
    }
  },

  cancelPending: async (pendingId) => {
    try {
      await getApiClient().delete(
        `/api/v1/trading/orders/pending/${encodeURIComponent(pendingId)}`
      );
      set((state) => ({
        pendingOrders: state.pendingOrders.filter((o) => o.id !== pendingId),
      }));
      return true;
    } catch {
      return false;
    }
  },

  modifyOrder: async (orderId, stopLoss, takeProfit) => {
    try {
      await getApiClient().put(`/api/v1/trading/order/${encodeURIComponent(orderId)}`, {
        stopLoss,
        takeProfit,
      });
      return true;
    } catch {
      return false;
    }
  },

  // ── WebSocket subscription ─────────────────────────────────────────────────────

  subscribeWs: () => {
    const unsubFilled = wsClient.on("order.filled", (payload) => {
      const p = payload as Record<string, unknown>;
      // Refresh positions after a fill
      void get().fetchPositions();
      get().updateOrderStatus(
        String(p.orderId ?? ""),
        "FILLED",
        typeof p.fillPrice === "number" ? p.fillPrice : undefined,
      );
    });

    const unsubClosed = wsClient.on("position.closed", (payload) => {
      const p = payload as Record<string, unknown>;
      get().removePosition(String(p.positionId ?? ""));
    });

    const unsubPending = wsClient.on("order.pending", () => {
      void get().fetchPending();
    });

    const unsubTriggered = wsClient.on("order.triggered", () => {
      void get().fetchPositions();
      void get().fetchPending();
    });

    const unsubRejected = wsClient.on("order.rejected", (payload) => {
      const p = payload as Record<string, unknown>;
      get().updateOrderStatus(String(p.orderId ?? ""), "REJECTED");
    });

    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().fetchPositions();
      void get().fetchOrders();
      void get().fetchPending();
    });

    return () => {
      unsubFilled();
      unsubClosed();
      unsubPending();
      unsubTriggered();
      unsubRejected();
      unsubConnected();
    };
  },

  // ── Computed ───────────────────────────────────────────────────────────────────

  getOpenPositions: () =>
    get().positions.filter((p) => !p.status || p.status === "OPEN"),

  getTotalUnrealizedPnL: () =>
    get().positions.reduce((sum, p) => sum + p.pnl, 0),

  getTotalMarginUsed: () =>
    get().positions.reduce((sum, p) => sum + p.marginUsed, 0),
}));
