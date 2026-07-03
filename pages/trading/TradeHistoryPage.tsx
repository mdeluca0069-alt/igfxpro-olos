/**
 * Trade History — institutional-grade closed-trade journal.
 * Data: GET /api/v1/reports/trades (paginated TradeAudit rows)
 * Features: virtualised table · filters · stats panel · CSV/PDF export
 */
import {
  useState, useMemo, useCallback, useRef, memo,
} from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer }   from "@tanstack/react-virtual";
import { AnimatePresence }  from "framer-motion";
import {
  BarChart2, ChevronUp, ChevronDown, ChevronsUpDown,
  History, Loader2, RefreshCw,
} from "lucide-react";

import { apiGet }              from "../../shared/lib/apiHelpers";
import { usePageTitle }        from "../../hooks/usePageTitle";
import { TradeHistoryFilters, DEFAULT_FILTERS, type HistoryFilters }
                               from "../../components/history/TradeHistoryFilters";
import { TradeDetailsDrawer, type TradeRecord }
                               from "../../components/history/TradeDetailsDrawer";
import { ExportButton }        from "../../components/history/ExportButton";
import { TradeStatisticsPanel }from "../../components/history/TradeStatisticsPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type BackendTrade = {
  id:           string;
  symbol:       string;
  side:         "BUY" | "SELL";
  quantity:     number;
  entryPrice:   number;
  exitPrice:    number;
  pnl:          number;
  commission:   number;
  swap:         number;
  openedAt:     string;
  closedAt:     string;
  durationMs?:  number;
  status:       string;
};

type TradesPage = {
  trades: BackendTrade[];
  total:  number;
  page:   number;
  pages:  number;
};

const PAGE_SIZE = 50;
const ROW_H     = 48;

// ─── Normalise backend shape → TradeRecord ────────────────────────────────────

function normalise(t: BackendTrade): TradeRecord {
  const pnl        = Number(t.pnl)        || 0;
  const commission = Number(t.commission) || 0;
  const swap       = Number(t.swap)       || 0;
  const netPnl     = pnl - Math.abs(commission) + swap;
  return {
    id:          t.id,
    symbol:      t.symbol,
    side:        t.side,
    quantity:    Number(t.quantity)   || 0,
    entryPrice:  Number(t.entryPrice) || 0,
    exitPrice:   Number(t.exitPrice)  || 0,
    pnl,
    commission,
    swap,
    netPnl,
    openedAt:    t.openedAt,
    closedAt:    t.closedAt  ?? t.openedAt,
    durationMs:  t.durationMs ?? 0,
    status:      t.status,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pnlClass(v: number) {
  return v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-slate-400";
}

function pnlSign(v: number) { return v >= 0 ? "+" : ""; }

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return "—"; }
}

function fmtDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  if (h > 0)   return `${h}h ${m}m`;
  return `${m}m`;
}

function dp(symbol: string): number {
  if (symbol.includes("JPY"))  return 3;
  if (symbol.match(/BTC|ETH/)) return 2;
  if (symbol.match(/US\d{3}|US100|DE\d{2}/)) return 2;
  return 5;
}

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey = "closedAt" | "symbol" | "side" | "quantity" | "netPnl" | "durationMs";
type SortDir = "asc" | "desc";

// ─── Column header button ─────────────────────────────────────────────────────

const ColBtn = memo(function ColBtn({
  label, sortKey, current, dir, onClick,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 hover:text-slate-300 transition"
    >
      {label}
      {active
        ? dir === "asc"
          ? <ChevronUp size={9} className="text-cyan-400" />
          : <ChevronDown size={9} className="text-cyan-400" />
        : <ChevronsUpDown size={8} className="opacity-30" />}
    </button>
  );
});

// ─── Virtual table ────────────────────────────────────────────────────────────

interface VTableProps {
  rows:       TradeRecord[];
  loading:    boolean;
  hasMore:    boolean;
  onLoadMore: () => void;
  sortKey:    SortKey;
  sortDir:    SortDir;
  onSort:     (k: SortKey) => void;
  onSelect:   (t: TradeRecord) => void;
}

const VTable = memo(function VTable({
  rows, loading, hasMore, onLoadMore, sortKey, sortDir, onSort, onSelect,
}: VTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count:            rows.length + (hasMore ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize:     () => ROW_H,
    overscan:         10,
  });

  const items    = virtualizer.getVirtualItems();
  const totalSz  = virtualizer.getTotalSize();

  const cols: { label: string; key: SortKey; cls: string }[] = [
    { label: "Date",     key: "closedAt",   cls: "w-[120px] shrink-0" },
    { label: "Symbol",   key: "symbol",     cls: "w-[100px] shrink-0" },
    { label: "Side",     key: "side",       cls: "w-[70px] shrink-0"  },
    { label: "Volume",   key: "quantity",   cls: "w-[80px] shrink-0"  },
    { label: "Entry",    key: "symbol",     cls: "w-[110px] shrink-0" },
    { label: "Exit",     key: "symbol",     cls: "w-[110px] shrink-0" },
    { label: "Comm.",    key: "symbol",     cls: "w-[80px] shrink-0"  },
    { label: "Swap",     key: "symbol",     cls: "w-[70px] shrink-0"  },
    { label: "Net P&L",  key: "netPnl",     cls: "w-[110px] shrink-0" },
    { label: "Hold",     key: "durationMs", cls: "w-[80px] shrink-0"  },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07]">
      {/* Sticky header */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max border-b border-white/[0.07] bg-[#050b14] px-4 py-3">
          {cols.map(({ label, key, cls }) => (
            <div key={label} className={cls}>
              <ColBtn label={label} sortKey={key as SortKey} current={sortKey} dir={sortDir} onClick={onSort} />
            </div>
          ))}
        </div>
      </div>

      {/* Virtual rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(rows.length * ROW_H + (hasMore ? ROW_H : 0), 560) }}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (!loading && hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
            onLoadMore();
          }
        }}
      >
        <div className="relative min-w-max" style={{ height: totalSz }}>
          {items.map((vRow) => {
            if (vRow.index >= rows.length) {
              return (
                <div
                  key="sentinel"
                  className="absolute left-0 top-0 flex w-full items-center justify-center"
                  style={{ height: ROW_H, transform: `translateY(${vRow.start}px)` }}
                >
                  {loading && <Loader2 size={14} className="animate-spin text-slate-600" />}
                </div>
              );
            }
            const t   = rows[vRow.index];
            const isBuy = t.side === "BUY";
            const d   = dp(t.symbol);
            return (
              <div
                key={t.id}
                role="row"
                tabIndex={0}
                data-index={vRow.index}
                ref={virtualizer.measureElement}
                onClick={() => onSelect(t)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(t); }}
                aria-label={`${t.symbol} ${t.side} ${t.quantity} lots, P&L ${t.netPnl >= 0 ? "+" : ""}${t.netPnl.toFixed(2)}`}
                className="absolute left-0 top-0 flex w-full cursor-pointer items-center border-b border-white/[0.03] px-4 transition hover:bg-white/[0.02] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-cyan-500/30"
                style={{ height: ROW_H, transform: `translateY(${vRow.start}px)` }}
              >
                <div className="w-[120px] shrink-0 font-mono text-[11px] text-slate-500">{shortDate(t.closedAt)}</div>
                <div className="w-[100px] shrink-0 font-bold text-white">{t.symbol}</div>
                <div className="w-[70px] shrink-0">
                  <span className={[
                    "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-black",
                    isBuy ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400",
                  ].join(" ")}>
                    {isBuy ? "▲" : "▼"} {t.side}
                  </span>
                </div>
                <div className="w-[80px] shrink-0 font-mono text-[11px] tabular-nums text-slate-400">{t.quantity.toFixed(2)}</div>
                <div className="w-[110px] shrink-0 font-mono text-[11px] tabular-nums text-slate-400">{t.entryPrice > 0 ? t.entryPrice.toFixed(d) : "—"}</div>
                <div className="w-[110px] shrink-0 font-mono text-[11px] tabular-nums text-slate-300">{t.exitPrice > 0 ? t.exitPrice.toFixed(d) : "—"}</div>
                <div className="w-[80px] shrink-0 font-mono text-[11px] tabular-nums text-rose-400/80">
                  {t.commission !== 0 ? `-$${Math.abs(t.commission).toFixed(2)}` : "—"}
                </div>
                <div className={`w-[70px] shrink-0 font-mono text-[11px] tabular-nums ${t.swap >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                  {t.swap !== 0 ? `${t.swap >= 0 ? "+" : ""}$${t.swap.toFixed(2)}` : "—"}
                </div>
                <div className={`w-[110px] shrink-0 font-mono text-[13px] font-bold tabular-nums ${pnlClass(t.netPnl)}`}>
                  {pnlSign(t.netPnl)}${t.netPnl.toFixed(2)}
                </div>
                <div className="w-[80px] shrink-0 font-mono text-[11px] tabular-nums text-slate-500">{fmtDuration(t.durationMs)}</div>
              </div>
            );
          })}

          {rows.length === 0 && !loading && (
            <div className="flex h-48 items-center justify-center text-[13px] text-slate-600">
              No trades match your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TradeHistoryPage() {
  usePageTitle("Trade History");

  const [filters,   setFilters]   = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [sortKey,   setSortKey]   = useState<SortKey>("closedAt");
  const [sortDir,   setSortDir]   = useState<SortDir>("desc");
  const [selected,  setSelected]  = useState<TradeRecord | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Build API query params
  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    if (filters.search)   p.set("symbol",  filters.search.toUpperCase().trim());
    if (filters.side !== "ALL")   p.set("side",    filters.side);
    if (filters.status !== "ALL") p.set("status",  filters.status);
    if (filters.dateFrom) p.set("from",    filters.dateFrom);
    if (filters.dateTo)   p.set("to",      filters.dateTo);
    return p.toString();
  }, [filters]);

  const query = useInfiniteQuery<TradesPage>({
    queryKey:     ["trade-history", params],
    queryFn:      ({ pageParam = 1 }) =>
      apiGet<TradesPage>(`/api/v1/reports/trades?page=${pageParam as number}&${params}`),
    initialPageParam: 1,
    getNextPageParam: (last) => last.page < last.pages ? last.page + 1 : undefined,
    staleTime:    30_000,
  });

  const allTrades: TradeRecord[] = useMemo(() => {
    const raw = query.data?.pages.flatMap((p) => p.trades) ?? [];
    return raw.map(normalise);
  }, [query.data]);

  // Client-side sort (pages are already sorted server-side, but allow re-sort)
  const sorted = useMemo(() => {
    return [...allTrades].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "closedAt":  cmp = new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime(); break;
        case "symbol":    cmp = a.symbol.localeCompare(b.symbol); break;
        case "side":      cmp = a.side.localeCompare(b.side); break;
        case "quantity":  cmp = a.quantity - b.quantity; break;
        case "netPnl":    cmp = a.netPnl - b.netPnl; break;
        case "durationMs":cmp = a.durationMs - b.durationMs; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allTrades, sortKey, sortDir]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) { setSortDir((d) => d === "asc" ? "desc" : "asc"); return key; }
      setSortDir("desc");
      return key;
    });
  }, []);

  const totalTrades = query.data?.pages[0]?.total ?? 0;
  const hasMore     = query.hasNextPage ?? false;
  const loading     = query.isFetchingNextPage;

  return (
    <div className="min-h-screen bg-[#030712] antialiased">
      <div className="mx-auto max-w-[1500px] px-6 py-8 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <History size={18} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-[22px] font-black tracking-tight text-white">Trade History</h1>
              <p className="mt-0.5 text-[12px] text-slate-600">
                {totalTrades > 0 ? `${totalTrades.toLocaleString()} closed trades` : "Closed trade journal"} · click row for details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats((v) => !v)}
              className={[
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition",
                showStats
                  ? "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-400"
                  : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:text-white",
              ].join(" ")}
            >
              <BarChart2 size={13} />
              Analytics
            </button>
            <ExportButton trades={sorted} disabled={sorted.length === 0} />
            <button
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[12px] font-semibold text-slate-400 transition hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={13} className={query.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <TradeHistoryFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(DEFAULT_FILTERS)}
          />
        </div>

        {/* Analytics panel */}
        {showStats && (
          <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
            <TradeStatisticsPanel trades={sorted} />
          </div>
        )}

        {/* Loading skeleton */}
        {query.isLoading && (
          <div className="space-y-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-800/30" />
            ))}
          </div>
        )}

        {/* Error */}
        {query.isError && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
            <BarChart2 size={28} className="text-slate-700" />
            <p className="text-[14px] font-semibold text-slate-400">Failed to load trade history</p>
            <p className="text-[12px] text-slate-600">
              {(query.error as Error)?.message ?? "Unknown error"}
            </p>
            <button
              onClick={() => void query.refetch()}
              className="mt-1 rounded-xl border border-slate-700 px-4 py-2 text-[12px] text-slate-400 transition hover:border-slate-600 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!query.isLoading && !query.isError && (
          <VTable
            rows={sorted}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={() => { if (!loading) void query.fetchNextPage(); }}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onSelect={setSelected}
          />
        )}

        {/* Loaded count */}
        {sorted.length > 0 && (
          <p className="mt-3 text-center text-[11px] text-slate-700">
            Showing {sorted.length.toLocaleString()} of {totalTrades.toLocaleString()} trades
            {hasMore && " · scroll to load more"}
          </p>
        )}
      </div>

      {/* Details drawer */}
      <AnimatePresence>
        {selected && (
          <TradeDetailsDrawer
            trade={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
