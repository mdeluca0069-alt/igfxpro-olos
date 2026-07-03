import { memo, useEffect, useRef, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useTradingStore, type Position } from "../../store/trading.store";
import { wsClient } from "../../api/websocket";
import { priceDigits } from "../../shared/utils/format";

// ─── Pull-to-refresh constants ────────────────────────────────────────────────

const PULL_THRESHOLD = 72;   // px of drag before triggering refresh
const PULL_MAX       = 100;  // px clamp for visual indicator

// ─── Swipe-to-close card ──────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 72; // px left-swipe to reveal close

function PositionCard({
  position,
  onTap,
  onClose,
}: {
  position: Position;
  onTap?:   (p: Position) => void;
  onClose:  (id: string) => Promise<void>;
}) {
  const [closing,    setClosing]    = useState(false);
  const [revealed,   setRevealed]   = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const isBuy    = position.side === "BUY";
  const isProfit = position.pnl >= 0;
  const digits   = priceDigits(position.symbol);

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setClosing(true);
    await onClose(position.id);
    setClosing(false);
    setRevealed(false);
  };

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]!.clientX;
    touchStartY.current = e.touches[0]!.clientY;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchStartX.current - e.changedTouches[0]!.clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0]!.clientY);
    if (dy > 20) return; // vertical scroll dominates — ignore
    if (dx > SWIPE_THRESHOLD) {
      setRevealed(true);
    } else if (dx < -20) {
      setRevealed(false);
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Swipe-reveal close button */}
      <div
        className={[
          "absolute right-0 top-0 flex h-full w-20 shrink-0 items-center justify-center bg-rose-500 transition-transform duration-200",
          revealed ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <button
          onClick={handleClose}
          disabled={closing}
          aria-label={`Close ${position.symbol} position`}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-white disabled:opacity-50"
        >
          {closing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <TrendingDown size={16} />
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider">Close</span>
        </button>
      </div>

      {/* Card content — slides left when revealed */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => revealed ? setRevealed(false) : onTap?.(position)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onTap?.(position); }}
        aria-label={`${position.side} ${position.symbol} position, P&L ${position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}`}
        style={{ transform: revealed ? "translateX(-80px)" : "translateX(0)", transition: "transform 0.2s ease" }}
        className="relative flex items-center gap-3 bg-[#050a0f] px-4 py-3 active:bg-slate-800/40 focus:outline-none"
      >
        {/* Direction icon */}
        <div className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          isBuy
            ? "border border-emerald-500/30 bg-emerald-500/15"
            : "border border-rose-500/30 bg-rose-500/15",
        ].join(" ")}>
          {isBuy
            ? <TrendingUp  size={16} className="text-emerald-400" />
            : <TrendingDown size={16} className="text-rose-400" />}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-black text-white">{position.symbol}</span>
            <span className={[
              "rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
              isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
            ].join(" ")}>
              {position.side}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {position.quantity} lots · {position.entryPrice.toFixed(digits)} → {position.markPrice.toFixed(digits)}
          </p>
        </div>

        {/* P&L */}
        <div className="shrink-0 text-right">
          <p className={[
            "font-mono text-[14px] font-black tabular-nums",
            isProfit ? "text-emerald-400" : "text-rose-400",
          ].join(" ")}>
            {isProfit ? "+" : ""}${position.pnl.toFixed(2)}
          </p>
          {position.pnlPercent !== undefined && (
            <p className={[
              "font-mono text-[10px] tabular-nums",
              isProfit ? "text-emerald-400/60" : "text-rose-400/60",
            ].join(" ")}>
              {isProfit ? "+" : ""}{position.pnlPercent.toFixed(2)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onPositionTap?: (position: Position) => void;
}

export const MobilePositions = memo(function MobilePositions({ onPositionTap }: Props) {
  const positions          = useTradingStore((s) => s.positions);
  const fetchPositions     = useTradingStore((s) => s.fetchPositions);
  const closePosition      = useTradingStore((s) => s.closePosition);
  const subscribeWs        = useTradingStore((s) => s.subscribeWs);
  const updatePositionMark = useTradingStore((s) => s.updatePositionMark);
  const totalPnl           = useTradingStore((s) => s.getTotalUnrealizedPnL());
  const isProfitable       = totalPnl >= 0;

  // Pull-to-refresh state
  const scrollRef      = useRef<HTMLDivElement>(null);
  const touchStartY    = useRef(0);
  const [pullDist,  setPullDist]  = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load + WS subscriptions
  useEffect(() => {
    void fetchPositions();
    const unsubOrder = subscribeWs();

    // Real-time P&L — not covered by subscribeWs
    const unsubPnl = wsClient.on("position.pnl_updated", (raw) => {
      const p = raw as { positionId: string; markPrice: number; pnl: number; pnlPercent: number };
      if (p?.positionId) updatePositionMark(p.positionId, p.markPrice, p.pnl, p.pnlPercent);
    });

    const unsubOpened = wsClient.on("position.opened", () => {
      void fetchPositions();
    });

    return () => {
      unsubOrder();
      unsubPnl();
      unsubOpened();
    };
  }, [fetchPositions, subscribeWs, updatePositionMark]);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPositions();
    setRefreshing(false);
    setPullDist(0);
  }, [fetchPositions]);

  // Pull-to-refresh touch handlers
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartY.current = e.touches[0]!.clientY;
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (refreshing) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl || scrollEl.scrollTop > 0) return; // only trigger at top
    const dy = e.touches[0]!.clientY - touchStartY.current;
    if (dy > 0) setPullDist(Math.min(dy, PULL_MAX));
  }

  function onTouchEnd() {
    if (pullDist >= PULL_THRESHOLD && !refreshing) {
      void doRefresh();
    } else {
      setPullDist(0);
    }
  }

  const handleClose = async (id: string) => {
    await closePosition(id);
  };

  // Pull indicator opacity / rotation
  const pullProgress = Math.min(pullDist / PULL_THRESHOLD, 1);
  const spinDeg      = pullProgress * 270;

  return (
    <div
      className="flex flex-col bg-[#050a0f] md:hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-150"
        style={{ height: refreshing ? 48 : pullDist > 0 ? pullDist * 0.6 : 0 }}
        aria-hidden="true"
      >
        <RefreshCw
          size={18}
          className={[
            "text-cyan-400 transition-opacity",
            refreshing ? "animate-spin opacity-100" : "opacity-70",
          ].join(" ")}
          style={{ transform: refreshing ? undefined : `rotate(${spinDeg}deg)` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-[0.12em] text-white">
            Positions
          </h2>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {positions.length} open
            <span className="ml-2 text-slate-700">· swipe left to close</span>
          </p>
        </div>
        {positions.length > 0 && (
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Unrealized P&L
            </p>
            <p className={[
              "font-mono text-[14px] font-black tabular-nums",
              isProfitable ? "text-emerald-400" : "text-rose-400",
            ].join(" ")}>
              {isProfitable ? "+" : ""}${totalPnl.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Scrollable position list */}
      <div
        ref={scrollRef}
        className="overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <p className="text-[13px] font-bold text-slate-500">No open positions</p>
            <p className="mt-1 text-[11px] text-slate-700">
              Use the order ticket to open a trade.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {positions.map((pos) => (
              <PositionCard
                key={pos.id}
                position={pos}
                onTap={onPositionTap}
                onClose={handleClose}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default MobilePositions;
