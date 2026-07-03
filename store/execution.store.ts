import { create } from "zustand";
import { ExecutionAPI, type NewOrderPayload } from "../api/endpoints/execution";
import { wsClient } from "../api/websocket";
import type { Order, OrderStatus } from "./trading.store";

type ExecutionState = {
  orders: Order[];
  submitting: boolean;
  loading: boolean;
  error: string | null;
  lastFetchAt: string | null;

  // Actions
  fetchOrders: () => Promise<void>;
  placeOrder: (payload: NewOrderPayload) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus, fillPrice?: number) => void;
  clearError: () => void;

  // WebSocket lifecycle
  subscribeWs: () => () => void;

  // Selectors
  getFilledOrders: () => Order[];
  getRejectedOrders: () => Order[];
  getPendingOrders: () => Order[];
};

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  orders: [],
  submitting: false,
  loading: false,
  error: null,
  lastFetchAt: null,

  fetchOrders: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const orders = await ExecutionAPI.getOrders();
      set({ orders, lastFetchAt: new Date().toISOString() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to fetch orders" });
    } finally {
      set({ loading: false });
    }
  },

  placeOrder: async (payload) => {
    set({ submitting: true, error: null });
    try {
      const order = await ExecutionAPI.placeOrder(payload);
      set((state) => ({
        orders: [order, ...state.orders],
        submitting: false,
      }));
      return order;
    } catch (err) {
      set({
        submitting: false,
        error: err instanceof Error ? err.message : "Order placement failed",
      });
      return null;
    }
  },

  updateOrderStatus: (orderId, status, fillPrice) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? { ...o, status, ...(fillPrice !== undefined ? { averageFillPrice: fillPrice } : {}) }
          : o,
      ),
    }));
  },

  clearError: () => set({ error: null }),

  subscribeWs: () => {
    // `execution` events from the server contain filled/rejected order updates
    const unsubExecution = wsClient.on("execution", (payload) => {
      const p = payload as Record<string, unknown>;
      const orderId = p.orderId as string | undefined;
      if (!orderId) return;

      const status = (p.status as OrderStatus) ?? "FILLED";
      const fillPrice = typeof p.fillPrice === "number" ? p.fillPrice : undefined;
      get().updateOrderStatus(orderId, status, fillPrice);
    });

    // Optimistic: on reconnect, re-fetch orders to catch any missed updates
    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().fetchOrders();
    });

    return () => {
      unsubExecution();
      unsubConnected();
    };
  },

  getFilledOrders: () => get().orders.filter((o) => o.status === "FILLED"),
  getRejectedOrders: () => get().orders.filter((o) => o.status === "REJECTED"),
  getPendingOrders: () =>
    get().orders.filter((o) =>
      ["RECEIVED", "RISK_REVIEW", "ACCEPTED", "PARTIALLY_FILLED"].includes(o.status),
    ),
}));
