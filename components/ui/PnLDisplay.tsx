import { TrendingDown, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { money } from "../../shared/utils/format";

interface PnLDisplayProps {
  value:       number;
  currency?:   string;
  showPct?:    boolean;
  pctValue?:   number;
  size?:       "sm" | "md" | "lg";
  className?:  string;
}

/**
 * Accessible P&L display:
 * - ▲/▼ icons so color-blind users understand direction
 * - Aria-label with explicit "Profit"/"Loss" text
 * - Color contrast > 4.5:1 on dark backgrounds
 */
export function PnLDisplay({
  value,
  currency = "USD",
  showPct = false,
  pctValue,
  size = "md",
  className,
}: PnLDisplayProps) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  const iconSize = size === "sm" ? 12 : size === "lg" ? 20 : 14;
  const textClass = size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-sm";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 font-semibold",
        positive ? "text-emerald-300" : "text-rose-300",
        textClass,
        className
      )}
      aria-label={`${positive ? "Profit" : "Loss"}: ${money(Math.abs(value), currency)}${pctValue !== undefined ? ` (${pctValue.toFixed(2)}%)` : ""}`}
    >
      <Icon size={iconSize} aria-hidden />
      {positive ? "+" : "−"}{money(Math.abs(value), currency)}
      {showPct && pctValue !== undefined && (
        <span className="text-[0.85em] opacity-75">
          ({pctValue >= 0 ? "+" : ""}{pctValue.toFixed(2)}%)
        </span>
      )}
    </span>
  );
}

/** Inline spread display for bid/ask */
export function SpreadBadge({ spread, symbol }: { spread: number; symbol: string }) {
  const isWide = spread > 0.001;
  return (
    <span
      className={clsx(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
        isWide ? "bg-amber-400/10 text-amber-300" : "bg-slate-800 text-slate-500"
      )}
      aria-label={`Spread: ${spread}`}
      title="Bid-ask spread"
    >
      {spread.toFixed(symbol.includes("JPY") ? 3 : 5)}
    </span>
  );
}

export default PnLDisplay;
