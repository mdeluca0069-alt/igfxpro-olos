import { memo } from "react";
import { Search, X } from "lucide-react";

export type HistoryFilters = {
  search:    string;
  side:      "ALL" | "BUY" | "SELL";
  status:    "ALL" | "FILLED" | "CANCELLED" | "REJECTED";
  dateFrom:  string;
  dateTo:    string;
};

interface Props {
  filters:   HistoryFilters;
  onChange:  (f: HistoryFilters) => void;
  onClear:   () => void;
}

export const DEFAULT_FILTERS: HistoryFilters = {
  search:   "",
  side:     "ALL",
  status:   "ALL",
  dateFrom: "",
  dateTo:   "",
};

function isActive(f: HistoryFilters): boolean {
  return (
    f.search !== "" ||
    f.side   !== "ALL" ||
    f.status !== "ALL" ||
    f.dateFrom !== "" ||
    f.dateTo   !== ""
  );
}

export const TradeHistoryFilters = memo(function TradeHistoryFilters({ filters, onChange, onClear }: Props) {
  const active = isActive(filters);

  function set<K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">

      {/* Symbol search */}
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Symbol…"
          className="w-36 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-8 pr-3 text-[11px] text-white outline-none placeholder:text-slate-600 focus:border-white/[0.16]"
        />
      </div>

      {/* Side filter */}
      <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5">
        {(["ALL", "BUY", "SELL"] as const).map((s) => (
          <button
            key={s}
            onClick={() => set("side", s)}
            className={[
              "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
              filters.side === s
                ? s === "BUY"
                  ? "bg-emerald-400/15 text-emerald-400"
                  : s === "SELL"
                    ? "bg-rose-400/15 text-rose-400"
                    : "bg-white/[0.07] text-white"
                : "text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5">
        {(["ALL", "FILLED", "CANCELLED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => set("status", s)}
            className={[
              "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
              filters.status === s
                ? "bg-white/[0.07] text-white"
                : "text-slate-500 hover:text-slate-300",
            ].join(" ")}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none focus:border-white/[0.16] [color-scheme:dark]"
        />
        <span className="text-[11px] text-slate-600">—</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none focus:border-white/[0.16] [color-scheme:dark]"
        />
      </div>

      {/* Clear */}
      {active && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-[11px] font-semibold text-rose-400 transition hover:bg-rose-400/[0.10]"
        >
          <X size={11} />
          Clear
        </button>
      )}
    </div>
  );
});
