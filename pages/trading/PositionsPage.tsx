import {
  useState, useEffect, useMemo, useCallback, useRef, memo,
  type ChangeEvent,
} from "react";
import { AnimatePresence } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnResizeMode,
  type RowSelectionState,
  type CellContext,
  type HeaderContext,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Layers, RefreshCw, Activity, DollarSign, Shield,
  MoreHorizontal, SlidersHorizontal, CheckSquare, Square,
  Minus, BarChart2,
} from "lucide-react";

import { useTradingStore, type Position } from "../../store/trading.store";
import { useRiskStore                    } from "../../store/risk.store";
import { wsClient                        } from "../../api/websocket";
import { getApiClient                    } from "../../api/httpClient";

import { PartialCloseDialog     } from "../../components/positions/PartialCloseDialog";
import { BulkActionBar          } from "../../components/positions/BulkActionBar";
import { PositionDetailsDrawer  } from "../../components/positions/PositionDetailsDrawer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SYMBOL_DP: Record<string, number> = {
  USDJPY: 3, BTCUSD: 0, ETHUSD: 2, US500: 1, US100: 1, XAUUSD: 2, WTI: 2,
};
const dp = (s: string) => SYMBOL_DP[s] ?? 5;

function pnlClass(v: number) {
  return v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-slate-400";
}

function formatDuration(openedAt: string): string {
  const ms = Date.now() - new Date(openedAt).getTime();
  const s  = Math.floor(ms / 1000);
  const m  = Math.floor(s / 60);
  const h  = Math.floor(m / 60);
  const d  = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

// ─── DurationCell — ticks every second ───────────────────────────────────────

const DurationCell = memo(function DurationCell({ openedAt }: { openedAt: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void count; // force re-render
  return <span className="tabular-nums text-slate-500">{formatDuration(openedAt)}</span>;
});

// ─── SlTpCell — inline editable SL / TP ──────────────────────────────────────

interface SlTpCellProps {
  position: Position;
  field:    "stopLoss" | "takeProfit";
}

const SlTpCell = memo(function SlTpCell({ position, field }: SlTpCellProps) {
  const fetchPositions = useTradingStore(s => s.fetchPositions);
  const current  = position[field];
  const d        = dp(position.symbol);
  const [editing, setEditing] = useState(false);
  const [raw,     setRaw]     = useState(current?.toFixed(d) ?? "");
  const [saving,  setSaving]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    const val = raw.trim() === "" ? null : parseFloat(raw);
    if (val !== null && isNaN(val)) { setRaw(current?.toFixed(d) ?? ""); setEditing(false); return; }
    setSaving(true);
    try {
      await getApiClient().put(
        `/api/v1/trading/position/${encodeURIComponent(position.id)}`,
        { [field]: val },
      );
      await fetchPositions();
    } catch { /* non-fatal */ }
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); void commit(); }
    if (e.key === "Escape") { setRaw(current?.toFixed(d) ?? ""); setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={handleKeyDown}
        disabled={saving}
        step="any"
        className={[
          "w-full rounded-md border bg-white/[0.06] px-2 py-1 font-mono text-[12px] font-bold text-white outline-none tabular-nums",
          field === "stopLoss"
            ? "border-rose-400/50 focus:border-rose-400"
            : "border-emerald-400/50 focus:border-emerald-400",
        ].join(" ")}
      />
    );
  }

  return (
    <button
      onClick={() => { setRaw(current?.toFixed(d) ?? ""); setEditing(true); }}
      className={[
        "group flex w-full items-center gap-1 rounded-md px-2 py-1 text-left font-mono text-[12px] font-bold tabular-nums transition hover:bg-white/[0.06]",
        field === "stopLoss"
          ? current ? "text-rose-400" : "text-slate-700 hover:text-rose-400"
          : current ? "text-emerald-400" : "text-slate-700 hover:text-emerald-400",
      ].join(" ")}
    >
      {current ? current.toFixed(d) : "—"}
      <SlidersHorizontal size={9} className="shrink-0 opacity-0 transition group-hover:opacity-60" />
    </button>
  );
});

// ─── Column definitions ───────────────────────────────────────────────────────

const colHelper = createColumnHelper<Position>();

function useColumns(
  hedged:         Set<string>,
  onOpenDetails:  (p: Position) => void,
  onPartialClose: (p: Position) => void,
  onHedgeToggle:  (id: string) => void,
  onClose:        (p: Position) => void,
) {
  return useMemo(() => [

    colHelper.display({
      id:   "select",
      size: 40,
      enableResizing: false,
      enableSorting:  false,
      header: ({ table }: HeaderContext<Position, unknown>) => {
        const allSelected  = table.getIsAllPageRowsSelected();
        const someSelected = table.getIsSomePageRowsSelected();
        return (
          <button
            onClick={table.getToggleAllPageRowsSelectedHandler()}
            className="flex items-center justify-center text-slate-500 transition hover:text-white"
            aria-label="Select all"
          >
            {allSelected
              ? <CheckSquare size={14} className="text-cyan-400" />
              : someSelected
                ? <Minus size={14} className="text-cyan-400" />
                : <Square size={14} />}
          </button>
        );
      },
      cell: ({ row }: CellContext<Position, unknown>) => (
        <button
          onClick={e => { e.stopPropagation(); row.toggleSelected(); }}
          className="flex items-center justify-center text-slate-600 transition hover:text-white"
          aria-label="Select row"
        >
          {row.getIsSelected()
            ? <CheckSquare size={14} className="text-cyan-400" />
            : <Square size={14} />}
        </button>
      ),
    }),

    colHelper.accessor("symbol", {
      header: "Symbol",
      size:   110,
      cell:   ({ row: { original: p } }: CellContext<Position, string>) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{p.symbol}</span>
          {hedged.has(p.id) && (
            <span className="rounded border border-amber-400/30 px-1 text-[9px] font-bold text-amber-400">H</span>
          )}
        </div>
      ),
    }),

    colHelper.accessor("side", {
      header: "Side",
      size:   65,
      cell:   ({ getValue }: CellContext<Position, string>) => (
        <span className={[
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
          getValue() === "BUY"
            ? "bg-emerald-400/15 text-emerald-400"
            : "bg-rose-400/15 text-rose-400",
        ].join(" ")}>
          {getValue() === "BUY" ? "▲" : "▼"} {getValue()}
        </span>
      ),
    }),

    colHelper.accessor("quantity", {
      header: "Lots",
      size:   80,
      cell:   ({ getValue }: CellContext<Position, number>) => (
        <span className="tabular-nums text-slate-300">{getValue().toFixed(2)}</span>
      ),
    }),

    colHelper.accessor("entryPrice", {
      header: "Entry",
      size:   110,
      cell:   ({ row: { original: p } }: CellContext<Position, number>) => (
        <span className="font-mono tabular-nums text-slate-300">
          {p.entryPrice.toFixed(dp(p.symbol))}
        </span>
      ),
    }),

    colHelper.accessor("markPrice", {
      header: "Mark",
      size:   110,
      cell:   ({ row: { original: p } }: CellContext<Position, number>) => (
        <span className="font-mono tabular-nums text-white">
          {p.markPrice.toFixed(dp(p.symbol))}
        </span>
      ),
    }),

    colHelper.accessor("pnl", {
      header:    "P&L ($)",
      size:      110,
      sortingFn: "basic",
      cell:      ({ row: { original: p } }: CellContext<Position, number>) => (
        <span className={`font-mono font-bold tabular-nums ${pnlClass(p.pnl)}`}>
          {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
        </span>
      ),
    }),

    colHelper.accessor("pnlPercent", {
      header: "P&L %",
      size:   80,
      cell:   ({ row: { original: p } }: CellContext<Position, number | undefined>) => {
        const v = p.pnlPercent ?? 0;
        return (
          <span className={`font-mono tabular-nums ${pnlClass(v)}`}>
            {v >= 0 ? "+" : ""}{v.toFixed(2)}%
          </span>
        );
      },
    }),

    colHelper.accessor("stopLoss", {
      header: "Stop Loss",
      size:   110,
      cell:   ({ row }: CellContext<Position, number | undefined>) => (
        <SlTpCell position={row.original} field="stopLoss" />
      ),
    }),

    colHelper.accessor("takeProfit", {
      header: "Take Profit",
      size:   110,
      cell:   ({ row }: CellContext<Position, number | undefined>) => (
        <SlTpCell position={row.original} field="takeProfit" />
      ),
    }),

    colHelper.accessor("marginUsed", {
      header: "Margin",
      size:   90,
      cell:   ({ getValue }: CellContext<Position, number>) => (
        <span className="tabular-nums text-slate-400">${getValue().toFixed(2)}</span>
      ),
    }),

    colHelper.accessor("leverage", {
      header: "Lev.",
      size:   60,
      cell:   ({ getValue }: CellContext<Position, number>) => (
        <span className="tabular-nums text-slate-500">1:{getValue()}</span>
      ),
    }),

    colHelper.display({
      id:     "notional",
      header: "Notional",
      size:   120,
      cell:   ({ row: { original: p } }: CellContext<Position, unknown>) => (
        <span className="tabular-nums text-slate-400">
          ${(p.quantity * p.markPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      ),
    }),

    colHelper.accessor("openedAt", {
      header:        "Duration",
      size:          90,
      enableSorting: true,
      cell:          ({ getValue }: CellContext<Position, string>) => (
        <DurationCell openedAt={getValue()} />
      ),
    }),

    colHelper.display({
      id:             "actions",
      header:         "",
      size:           160,
      enableResizing: false,
      enableSorting:  false,
      cell:           ({ row: { original: p } }: CellContext<Position, unknown>) => (
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); onPartialClose(p); }}
            title="Partial close"
            className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            Partial
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              void (async () => {
                await getApiClient().put(
                  `/api/v1/trading/position/${encodeURIComponent(p.id)}`,
                  { stopLoss: p.entryPrice },
                );
                void useTradingStore.getState().fetchPositions();
              })();
            }}
            title="Move to breakeven"
            className="rounded-md px-2 py-1 text-[10px] font-semibold text-amber-500/70 transition hover:bg-amber-400/[0.08] hover:text-amber-400"
          >
            BE
          </button>
          <button
            onClick={e => { e.stopPropagation(); onHedgeToggle(p.id); }}
            title="Toggle hedge flag"
            className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-amber-400/[0.08] hover:text-amber-400"
          >
            Hedge
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose(p); }}
            title="Close position"
            className="rounded-md px-2 py-1 text-[10px] font-bold text-rose-500/70 transition hover:bg-rose-400/[0.08] hover:text-rose-400"
          >
            Close
          </button>
          <button
            onClick={e => { e.stopPropagation(); onOpenDetails(p); }}
            title="Details"
            className="rounded-md p-1 text-slate-600 transition hover:bg-white/[0.06] hover:text-white"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
      ),
    }),

  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [hedged, onOpenDetails, onPartialClose, onHedgeToggle, onClose]);
}

// ─── Header stats ─────────────────────────────────────────────────────────────

interface HeaderStatsProps {
  positions: Position[];
}

const HeaderStats = memo(function HeaderStats({ positions }: HeaderStatsProps) {
  const snapshot    = useRiskStore(s => s.snapshot);
  const totalPnl    = positions.reduce((s, p) => s + p.pnl, 0);
  const totalMargin = positions.reduce((s, p) => s + p.marginUsed, 0);
  const totalExp    = positions.reduce((s, p) => s + p.quantity * p.markPrice, 0);
  const marginLevel = snapshot?.marginLevelPct ?? 0;
  const marginColor = marginLevel > 200 ? "text-emerald-400" : marginLevel > 120 ? "text-amber-400" : "text-rose-400";

  const stats = [
    {
      icon:  Activity,
      label: "Unrealized P&L",
      value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`,
      cls:   pnlClass(totalPnl),
    },
    {
      icon:  DollarSign,
      label: "Margin used",
      value: `$${totalMargin.toFixed(2)}`,
      cls:   "text-white",
    },
    {
      icon:  Shield,
      label: "Margin level",
      value: marginLevel > 0 ? `${marginLevel.toFixed(0)}%` : "—",
      cls:   marginColor,
    },
    {
      icon:  BarChart2,
      label: "Total notional",
      value: `$${totalExp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      cls:   "text-white",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ icon: Icon, label, value, cls }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
            <Icon size={14} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-slate-600">{label}</p>
            <p className={`mt-0.5 font-mono text-[15px] font-black tabular-nums ${cls}`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── Grouped net-exposure view ────────────────────────────────────────────────

interface GroupedViewProps {
  positions:      Position[];
  hedged:         Set<string>;
  onOpenDetails:  (p: Position) => void;
  onPartialClose: (p: Position) => void;
  onClose:        (p: Position) => void;
}

const GroupedView = memo(function GroupedView({
  positions, onOpenDetails, onPartialClose, onClose,
}: GroupedViewProps) {
  const groups = useMemo(() => {
    const map: Record<string, Position[]> = {};
    for (const p of positions) {
      if (!map[p.symbol]) map[p.symbol] = [];
      map[p.symbol].push(p);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [positions]);

  return (
    <div className="space-y-3">
      {groups.map(([symbol, group]) => {
        const netQty   = group.reduce((s, p) => s + (p.side === "BUY" ? p.quantity : -p.quantity), 0);
        const totalPnl = group.reduce((s, p) => s + p.pnl, 0);
        const netLabel = netQty > 0 ? "NET LONG" : netQty < 0 ? "NET SHORT" : "FLAT";
        const netCls   = netQty > 0 ? "text-emerald-400" : netQty < 0 ? "text-rose-400" : "text-slate-400";
        return (
          <div key={symbol} className="overflow-hidden rounded-xl border border-white/[0.07]">
            <div className="flex items-center justify-between border-b border-white/[0.05] bg-white/[0.02] px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">{symbol}</span>
                <span className={`text-[10px] font-bold ${netCls}`}>{netLabel}</span>
                <span className={`font-mono text-[11px] font-bold ${netCls}`}>
                  {Math.abs(netQty).toFixed(2)} lots
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-slate-600">Group P&L</p>
                  <p className={`font-mono text-[13px] font-bold tabular-nums ${pnlClass(totalPnl)}`}>
                    {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
                  </p>
                </div>
                <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-slate-500">
                  {group.length} position{group.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {group.map(p => {
              const d = dp(p.symbol);
              return (
                <div
                  key={p.id}
                  className="grid items-center border-b border-white/[0.03] px-4 py-3 last:border-0 transition hover:bg-white/[0.02]"
                  style={{ gridTemplateColumns: "80px 110px 110px 100px 1fr auto" }}
                >
                  <span className={[
                    "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                    p.side === "BUY" ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400",
                  ].join(" ")}>
                    {p.side === "BUY" ? "▲" : "▼"} {p.side}
                  </span>
                  <span className="font-mono tabular-nums text-[12px] text-slate-400">{p.quantity.toFixed(2)} lots</span>
                  <span className="font-mono tabular-nums text-[12px] text-slate-500">@ {p.entryPrice.toFixed(d)}</span>
                  <span className={`font-mono font-bold tabular-nums text-[13px] ${pnlClass(p.pnl)}`}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                  </span>
                  <DurationCell openedAt={p.openedAt} />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onPartialClose(p)}
                      className="rounded px-1.5 py-1 text-[10px] text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
                    >
                      Partial
                    </button>
                    <button
                      onClick={() => onClose(p)}
                      className="rounded px-1.5 py-1 text-[10px] text-rose-500/70 hover:bg-rose-400/[0.08] hover:text-rose-400"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => onOpenDetails(p)}
                      className="rounded p-1 text-slate-600 hover:bg-white/[0.06] hover:text-white"
                    >
                      <MoreHorizontal size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});

// ─── Virtual flat table ───────────────────────────────────────────────────────

interface FlatTableProps {
  positions:            Position[];
  hedged:               Set<string>;
  onOpenDetails:        (p: Position) => void;
  onPartialClose:       (p: Position) => void;
  onHedgeToggle:        (id: string) => void;
  onClose:              (p: Position) => void;
  rowSelection:         RowSelectionState;
  onRowSelectionChange: (u: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
}

const ROW_H = 52;

const FlatTable = memo(function FlatTable({
  positions, hedged, onOpenDetails, onPartialClose,
  onHedgeToggle, onClose, rowSelection, onRowSelectionChange,
}: FlatTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useColumns(hedged, onOpenDetails, onPartialClose, onHedgeToggle, onClose);

  const table = useReactTable({
    data:                     positions,
    columns,
    state:                    { sorting, rowSelection },
    onSortingChange:          setSorting,
    onRowSelectionChange:     onRowSelectionChange as Parameters<typeof useReactTable<Position>>[0]["onRowSelectionChange"],
    getCoreRowModel:          getCoreRowModel(),
    getSortedRowModel:        getSortedRowModel(),
    getFilteredRowModel:      getFilteredRowModel(),
    columnResizeMode:         "onChange" as ColumnResizeMode,
    enableColumnResizing:     true,
    enableRowSelection:       true,
    getRowId:                 row => row.id,
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count:            rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize:     () => ROW_H,
    overscan:         8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize    = virtualizer.getTotalSize();

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07]">

      {/* Sticky header */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {table.getHeaderGroups().map(hg => (
            <div key={hg.id} className="flex border-b border-white/[0.07] bg-[#050b14]">
              {hg.headers.map(header => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <div
                    key={header.id}
                    className="relative flex shrink-0 select-none items-center gap-1 px-3 py-3"
                    style={{ width: header.getSize() }}
                  >
                    <button
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      disabled={!canSort}
                      className={[
                        "flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                        canSort
                          ? "cursor-pointer text-slate-500 hover:text-slate-200"
                          : "cursor-default text-slate-600",
                      ].join(" ")}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        sortDir === "asc"  ? <ChevronUp   size={10} className="text-cyan-400" /> :
                        sortDir === "desc" ? <ChevronDown size={10} className="text-cyan-400" /> :
                                            <ChevronsUpDown size={9} className="opacity-30" />
                      )}
                    </button>
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={[
                          "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition",
                          header.column.getIsResizing()
                            ? "bg-cyan-400/50"
                            : "bg-transparent hover:bg-white/[0.12]",
                        ].join(" ")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Virtual body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(rows.length * ROW_H, 520) }}
      >
        <div className="relative min-w-max" style={{ height: totalSize }}>
          {virtualItems.map(vRow => {
            const row        = rows[vRow.index];
            const isSelected = row.getIsSelected();
            return (
              <div
                key={row.id}
                data-index={vRow.index}
                ref={virtualizer.measureElement}
                onClick={() => onOpenDetails(row.original)}
                className={[
                  "absolute left-0 top-0 flex w-full cursor-pointer items-center border-b border-white/[0.03] transition hover:bg-white/[0.02]",
                  isSelected ? "bg-cyan-400/[0.04]" : "",
                ].join(" ")}
                style={{ height: ROW_H, transform: `translateY(${vRow.start}px)` }}
              >
                {row.getVisibleCells().map(cell => (
                  <div
                    key={cell.id}
                    className="shrink-0 px-3"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="flex h-48 items-center justify-center text-[13px] text-slate-600">
              No positions match your filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <Activity size={22} className="text-slate-700" />
      </div>
      <p className="text-[15px] font-bold text-slate-400">No open positions</p>
      <p className="mt-1.5 text-[13px] text-slate-600">
        Open the trading terminal to place your first order.
      </p>
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PositionsPage() {
  const positions          = useTradingStore(s => s.positions);
  const updatePositionMark = useTradingStore(s => s.updatePositionMark);
  const fetchPositions     = useTradingStore(s => s.fetchPositions);
  const closePosition      = useTradingStore(s => s.closePosition);
  const fetchSnapshot      = useRiskStore(s => s.fetchSnapshot);

  const [search,        setSearch]        = useState("");
  const [sideFilter,    setSideFilter]    = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [pnlFilter,     setPnlFilter]     = useState<"ALL" | "WIN" | "LOSS">("ALL");
  const [groupBySymbol, setGroupBySymbol] = useState(false);
  const [rowSelection,  setRowSelection]  = useState<RowSelectionState>({});
  const [hedged,        setHedged]        = useState<Set<string>>(new Set());
  const [drawerPos,     setDrawerPos]     = useState<Position | null>(null);
  const [partialPos,    setPartialPos]    = useState<Position | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);

  // Initial data load
  useEffect(() => {
    void fetchPositions();
    void fetchSnapshot();
  }, [fetchPositions, fetchSnapshot]);

  // Real-time P&L — store's subscribeWs() does NOT handle position.pnl_updated
  useEffect(() => {
    const unsubPnl = wsClient.on("position.pnl_updated", (raw) => {
      const p = raw as { positionId: string; markPrice: number; pnl: number; pnlPercent: number };
      if (p?.positionId) {
        updatePositionMark(p.positionId, p.markPrice, p.pnl, p.pnlPercent);
      }
    });

    const unsubOpened = wsClient.on("position.opened", () => {
      void fetchPositions();
    });

    return () => {
      unsubPnl();
      unsubOpened();
    };
  }, [updatePositionMark, fetchPositions]);

  // Keep drawer fresh when store updates
  useEffect(() => {
    if (!drawerPos) return;
    const fresh = positions.find(p => p.id === drawerPos.id);
    if (fresh) setDrawerPos(fresh);
    else       setDrawerPos(null);
  }, [positions, drawerPos]);

  const filtered = useMemo(() => {
    let list = positions.filter(p => !p.status || p.status === "OPEN");
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(p => p.symbol.includes(q));
    }
    if (sideFilter !== "ALL") list = list.filter(p => p.side === sideFilter);
    if (pnlFilter  === "WIN")  list = list.filter(p => p.pnl > 0);
    if (pnlFilter  === "LOSS") list = list.filter(p => p.pnl < 0);
    return list;
  }, [positions, search, sideFilter, pnlFilter]);

  const selectedIds = useMemo(
    () => new Set(Object.entries(rowSelection).filter(([, v]) => v).map(([id]) => id)),
    [rowSelection],
  );

  const handleHedgeToggle = useCallback((id: string) => {
    setHedged(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleClose = useCallback(async (p: Position) => {
    await closePosition(p.id);
    if (drawerPos?.id === p.id)  setDrawerPos(null);
    if (partialPos?.id === p.id) setPartialPos(null);
  }, [closePosition, drawerPos, partialPos]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchPositions(), fetchSnapshot()]);
    setRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-[#030712] antialiased">
      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">

        {/* Title row */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-black tracking-tight text-white">
                Open Positions
              </h1>
              {filtered.length > 0 && (
                <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 text-[12px] font-bold text-slate-300">
                  {filtered.length}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] text-emerald-400">Live</span>
              </div>
            </div>
            <p className="mt-0.5 text-[13px] text-slate-600">
              Real-time P&L via WebSocket · SL/TP editable inline
            </p>
          </div>

          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] font-semibold text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="mb-5">
          <HeaderStats positions={filtered} />
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search symbol…"
              className="w-44 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-8 pr-3 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-white/[0.16]"
            />
          </div>

          <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5">
            {(["ALL", "BUY", "SELL"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSideFilter(s)}
                className={[
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                  sideFilter === s
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

          <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5">
            {(["ALL", "WIN", "LOSS"] as const).map(f => (
              <button
                key={f}
                onClick={() => setPnlFilter(f)}
                className={[
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                  pnlFilter === f
                    ? f === "WIN"
                      ? "bg-emerald-400/15 text-emerald-400"
                      : f === "LOSS"
                        ? "bg-rose-400/15 text-rose-400"
                        : "bg-white/[0.07] text-white"
                    : "text-slate-500 hover:text-slate-300",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setGroupBySymbol(g => !g); setRowSelection({}); }}
            className={[
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-semibold transition",
              groupBySymbol
                ? "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-400"
                : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:text-white",
            ].join(" ")}
          >
            <Layers size={13} />
            Group by symbol
          </button>
        </div>

        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && !groupBySymbol && (
            <div className="mb-3">
              <BulkActionBar
                selected={selectedIds}
                positions={filtered}
                onClearSelection={() => setRowSelection({})}
                onDone={() => setRowSelection({})}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Content */}
        {filtered.length === 0 ? (
          <EmptyState />
        ) : groupBySymbol ? (
          <GroupedView
            positions={filtered}
            hedged={hedged}
            onOpenDetails={setDrawerPos}
            onPartialClose={setPartialPos}
            onClose={handleClose}
          />
        ) : (
          <FlatTable
            positions={filtered}
            hedged={hedged}
            onOpenDetails={setDrawerPos}
            onPartialClose={setPartialPos}
            onHedgeToggle={handleHedgeToggle}
            onClose={handleClose}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        )}

      </div>

      {/* Modals */}
      <AnimatePresence>
        {partialPos && (
          <PartialCloseDialog
            position={partialPos}
            onClose={() => setPartialPos(null)}
            onSuccess={() => setPartialPos(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerPos && (
          <PositionDetailsDrawer
            position={drawerPos}
            isHedged={hedged.has(drawerPos.id)}
            onClose={() => setDrawerPos(null)}
            onPartialClose={p => { setDrawerPos(null); setPartialPos(p); }}
            onHedgeToggle={handleHedgeToggle}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
