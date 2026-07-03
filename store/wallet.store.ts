import { create } from "zustand";
import { wsClient } from "../api/websocket";
import { getApiClient } from "../api/httpClient";

export type LedgerEntryType =
  | "DEPOSIT_REQUEST"
  | "WITHDRAW_REQUEST"
  | "ADMIN_CAPITAL_ALLOCATION"
  | "MARGIN_RESERVED"
  | "MARGIN_RELEASED"
  | "PNL_CREDIT"
  | "PNL_DEBIT"
  | "FEE"
  | "DOCUMENT_EVENT";

export type LedgerStatus = "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "COMPLETED";

export type LedgerEntry = {
  id: string;
  type: LedgerEntryType;
  amount: number;
  status: LedgerStatus;
  reference: string;
  note: string;
  createdAt: string;
  runningBalance?: number;
};

export type WalletBalance = {
  currency: string;
  available: number;
  equity: number;
  locked: number;
  freeMargin: number;
  marginUsed: number;
  unrealizedPnL: number;
};

type WalletState = {
  balance: WalletBalance | null;
  ledger: LedgerEntry[];
  pendingDeposits: LedgerEntry[];
  pendingWithdrawals: LedgerEntry[];
  lastFetchAt: string | null;
  loading: boolean;

  setBalance: (balance: WalletBalance) => void;
  setLedger: (entries: LedgerEntry[]) => void;
  addLedgerEntry: (entry: LedgerEntry) => void;
  updateLedgerStatus: (entryId: string, status: LedgerStatus) => void;
  setLoading: (loading: boolean) => void;

  fetchBalance: () => Promise<void>;
  fetchLedger: () => Promise<void>;
  subscribeWs: () => () => void;

  getAvailableBalance: () => number;
  getFreeMargin: () => number;
  getEquity: () => number;
};

export const useWalletStore = create<WalletState>((set, get) => ({
  balance:            null,
  ledger:             [],
  pendingDeposits:    [],
  pendingWithdrawals: [],
  lastFetchAt:        null,
  loading:            false,

  setBalance: (balance) =>
    set({ balance, lastFetchAt: new Date().toISOString() }),

  setLedger: (ledger) =>
    set({
      ledger,
      pendingDeposits:    ledger.filter((e) => e.type === "DEPOSIT_REQUEST"  && e.status === "PENDING_ADMIN"),
      pendingWithdrawals: ledger.filter((e) => e.type === "WITHDRAW_REQUEST" && e.status === "PENDING_ADMIN"),
    }),

  addLedgerEntry: (entry) =>
    set((state) => {
      const ledger = [entry, ...state.ledger];
      return {
        ledger,
        pendingDeposits:    ledger.filter((e) => e.type === "DEPOSIT_REQUEST"  && e.status === "PENDING_ADMIN"),
        pendingWithdrawals: ledger.filter((e) => e.type === "WITHDRAW_REQUEST" && e.status === "PENDING_ADMIN"),
      };
    }),

  updateLedgerStatus: (entryId, status) =>
    set((state) => {
      const ledger = state.ledger.map((e) => e.id === entryId ? { ...e, status } : e);
      return {
        ledger,
        pendingDeposits:    ledger.filter((e) => e.type === "DEPOSIT_REQUEST"  && e.status === "PENDING_ADMIN"),
        pendingWithdrawals: ledger.filter((e) => e.type === "WITHDRAW_REQUEST" && e.status === "PENDING_ADMIN"),
      };
    }),

  setLoading: (loading) => set({ loading }),

  fetchBalance: async () => {
    set({ loading: true });
    try {
      const res = await getApiClient().get<WalletBalance>("/api/v1/wallet/balance");
      set({ balance: res.data, lastFetchAt: new Date().toISOString() });
    } catch {
      // Non-fatal — keep stale balance
    } finally {
      set({ loading: false });
    }
  },

  fetchLedger: async () => {
    try {
      const res = await getApiClient().get<LedgerEntry[]>("/api/v1/wallet/ledger");
      const ledger = Array.isArray(res.data) ? res.data : [];
      get().setLedger(ledger);
    } catch {
      // Non-fatal
    }
  },

  subscribeWs: () => {
    const handleWalletUpdate = () => {
      void get().fetchBalance();
    };
    const unsubUpdated  = wsClient.on("wallet.updated", handleWalletUpdate);
    const unsubEvent    = wsClient.on("wallet.event",   handleWalletUpdate);
    const unsubConnected = wsClient.on("ws.connected", () => {
      void get().fetchBalance();
    });
    return () => {
      unsubUpdated();
      unsubEvent();
      unsubConnected();
    };
  },

  getAvailableBalance: () => get().balance?.available ?? 0,

  getFreeMargin: () => get().balance?.freeMargin ?? 0,

  getEquity: () => get().balance?.equity ?? 0,
}));
