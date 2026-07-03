import { useTradingStore, type Order, type Position, type NewOrderDraft, type OrderStatus } from "../store/trading.store";
import { useRiskStore } from "../store/risk.store";

export type { Order, Position, NewOrderDraft, OrderStatus };

export type TradingHook = {
  /** All orders (newest first, capped at 200 in the store). */
  orders: Order[];
  /** Currently open positions. */
  positions: Position[];
  /** Positions with active P&L tracking. */
  openPositions: Position[];
  /** Current order form draft. */
  orderDraft: Partial<NewOrderDraft>;
  /** True while an order submission is in flight. */
  submitting: boolean;
  /** ISO timestamp of the most recent order, or null. */
  lastOrderAt: string | null;
  /** Sum of unrealized P&L across all open positions. */
  totalUnrealizedPnL: number;
  /** Sum of margin locked by open positions. */
  totalMarginUsed: number;

  // Risk flags sourced from risk.store
  /** True when admin kill-switch has halted all trading. */
  killSwitchActive: boolean;
  /** True when live trading is disabled (e.g. licensing/sandbox mode). */
  liveTradeDisabled: boolean;

  // Store actions
  setOrderDraft: (draft: Partial<NewOrderDraft>) => void;
  clearOrderDraft: () => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, fillPrice?: number) => void;
  setPositions: (positions: Position[]) => void;
  updatePositionMark: (positionId: string, markPrice: number, pnl: number) => void;
  removePosition: (positionId: string) => void;
  setSubmitting: (v: boolean) => void;
};

export function useTrading(): TradingHook {
  // Trading store
  const orders              = useTradingStore((s) => s.orders);
  const positions           = useTradingStore((s) => s.positions);
  const orderDraft          = useTradingStore((s) => s.orderDraft);
  const submitting          = useTradingStore((s) => s.submitting);
  const lastOrderAt         = useTradingStore((s) => s.lastOrderAt);
  const setOrderDraft       = useTradingStore((s) => s.setOrderDraft);
  const clearOrderDraft     = useTradingStore((s) => s.clearOrderDraft);
  const addOrder            = useTradingStore((s) => s.addOrder);
  const updateOrderStatus   = useTradingStore((s) => s.updateOrderStatus);
  const setPositions        = useTradingStore((s) => s.setPositions);
  const updatePositionMark  = useTradingStore((s) => s.updatePositionMark);
  const removePosition      = useTradingStore((s) => s.removePosition);
  const setSubmitting       = useTradingStore((s) => s.setSubmitting);

  // Derived from positions — computed inline so Zustand re-renders only when positions change
  const openPositions     = useTradingStore((s) => s.positions.filter((p) => p.pnl !== undefined));
  const totalUnrealizedPnL = useTradingStore((s) => s.positions.reduce((sum, p) => sum + p.pnl, 0));
  const totalMarginUsed   = useTradingStore((s) => s.positions.reduce((sum, p) => sum + p.marginUsed, 0));

  // Risk flags from risk store
  const killSwitchActive  = useRiskStore((s) => s.killSwitchActive);
  const liveTradeDisabled = useRiskStore((s) => s.liveTradeDisabled);

  return {
    orders,
    positions,
    openPositions,
    orderDraft,
    submitting,
    lastOrderAt,
    totalUnrealizedPnL,
    totalMarginUsed,
    killSwitchActive,
    liveTradeDisabled,
    setOrderDraft,
    clearOrderDraft,
    addOrder,
    updateOrderStatus,
    setPositions,
    updatePositionMark,
    removePosition,
    setSubmitting,
  };
}

export default useTrading;
