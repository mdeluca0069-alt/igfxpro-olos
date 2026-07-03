import { memo, useRef, useEffect, useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, X, Filter, Loader2 } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { money } from "../../shared/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: string;
  createdAt: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  note: string;
  reference?: string;
  runningBalance?: number;
}

interface LedgerPage {
  entries: LedgerEntry[];
  totalCount: number;
  totalCredits: number;
  totalDebits: number;
  pageSize: number;
  offset: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const TYPE_OPTIONS = [
  { value: "DEPOSIT_REQUEST",          label: "Deposit"           },
  { value: "WITHDRAW_REQUEST",         label: "Withdrawal"        },
  { value: "ADMIN_CAPITAL_ALLOCATION", label: "Capital alloc."    },
  { value: "MARGIN_RESERVED",          label: "Margin reserved"   },
  { value: "MARGIN_RELEASED",          label: "Margin released"   },
  { value: "PNL_CREDIT",               label: "P&L credit"        },
  { value: "PNL_DEBIT",                label: "P&L debit"         },
  { value: "FEE",                      label: "Commission"        },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map(({ value, label }) => [value, label])
);

const STATUS_COLORS: Record<string, string> = {
  APPROVED:     "bg-emerald-500/15 text-emerald-300",
  PENDING_ADMIN:"bg-amber-500/15 text-amber-300",
  REJECTED:     "bg-rose-500/15 text-rose-300",
  COMPLETED:    "bg-cyan-500/15 text-cyan-300",
};

const ROW_HEIGHT = 52;

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface Filters {
  search: string;
  type:   string;   // comma-separated or ""
  from:   string;
  to:     string;
}

const defaultFilters: Filters = { search: "", type: "", from: "", to: "" };

function FilterBar({ filters, onChange }: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [showFilters, setShowFilters] = useState(false);

  function set(patch: Partial<Filters>) { onChange({ ...filters, ...patch }); }

  return (
    <div className="space-y-2">
      {/* Search + toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search by note or reference…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-8 pr-8 text-[11px] text-white placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none"
          />
          {filters.search && (
            <button onClick={() => set({ search: "" })} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
              <X size={10} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={[
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition",
            showFilters
              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
              : "border-slate-700 text-slate-500 hover:text-slate-300",
          ].join(" ")}
        >
          <Filter size={11} />
          Filters
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          {/* Type */}
          <div>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Type</p>
            <div className="flex flex-wrap gap-1">
              {TYPE_OPTIONS.map(({ value, label }) => {
                const active = filters.type.split(",").includes(value);
                return (
                  <button
                    key={value}
                    onClick={() => {
                      const types = filters.type ? filters.type.split(",") : [];
                      const next = active
                        ? types.filter((t) => t !== value)
                        : [...types, value];
                      set({ type: next.join(",") });
                    }}
                    className={[
                      "rounded px-2 py-0.5 text-[10px] font-semibold transition",
                      active ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-end gap-2">
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">From</p>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => set({ from: e.target.value })}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 [color-scheme:dark]"
              />
            </div>
            <span className="text-[10px] text-slate-600 mb-1">→</span>
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">To</p>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => set({ to: e.target.value })}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Reset */}
          {(filters.type || filters.from || filters.to) && (
            <div className="flex items-end">
              <button onClick={() => onChange(defaultFilters)}
                className="rounded px-2.5 py-1 text-[10px] text-slate-600 hover:text-slate-300">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Row renderer ─────────────────────────────────────────────────────────────

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.amount > 0;
  return (
    <div className="grid grid-cols-[1.6fr_1fr_0.8fr_1.5fr_1fr] items-center gap-x-3 border-t border-slate-800/30 px-5 py-3 transition hover:bg-slate-900/20">
      <span className="text-[12px] font-semibold text-white">
        {TYPE_LABELS[entry.type] ?? entry.type.replace(/_/g, " ")}
      </span>
      <span className={`font-mono text-[13px] font-bold tabular-nums ${isCredit ? "text-emerald-300" : "text-rose-300"}`}>
        {isCredit ? "+" : ""}{money(entry.amount)}
      </span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold w-fit ${STATUS_COLORS[entry.status] ?? "bg-slate-800 text-slate-400"}`}>
        {entry.status.replace("_", " ")}
      </span>
      <span className="max-w-[200px] truncate text-[11px] text-slate-500">{entry.note || "—"}</span>
      <span className="text-[11px] text-slate-600">
        {new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const LedgerTable = memo(function LedgerTable() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const parentRef = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback((offset: number) => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    if (filters.type) params.set("type", filters.type);
    if (filters.from) params.set("from", filters.from);
    if (filters.to)   params.set("to",   filters.to);
    return `/api/v1/wallet/ledger?${params.toString()}`;
  }, [filters.type, filters.from, filters.to]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery<LedgerPage>({
    queryKey:        ["wallet-ledger", filters.type, filters.from, filters.to],
    queryFn:         ({ pageParam }) => apiGet<LedgerPage>(buildUrl(pageParam as number)),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.offset + lastPage.entries.length;
      return loaded < lastPage.totalCount ? loaded : undefined;
    },
    staleTime: 30_000,
  });

  const allEntries = data?.pages.flatMap((p) => p.entries) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Client-side search filter (note / reference text)
  const displayed = filters.search
    ? allEntries.filter((e) =>
        e.note?.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.reference?.toLowerCase().includes(filters.search.toLowerCase())
      )
    : allEntries;

  const rowVirtualizer = useVirtualizer({
    count:           displayed.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize:    () => ROW_HEIGHT,
    overscan:        12,
  });

  // Infinite scroll — trigger when sentinel row is virtualised
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= displayed.length - 1 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [rowVirtualizer.getVirtualItems(), displayed.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="flex flex-col gap-3">
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Summary totals */}
      {data && (
        <div className="flex items-center gap-6 rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-2.5 text-[11px]">
          <span className="text-slate-600">
            {totalCount.toLocaleString()} transactions
            {filters.search && ` · ${displayed.length} shown`}
          </span>
          <span className="text-emerald-400">
            Credits: <span className="font-mono font-bold">{money(data.pages[0]?.totalCredits ?? 0)}</span>
          </span>
          <span className="text-rose-400">
            Debits: <span className="font-mono font-bold">{money(data.pages[0]?.totalDebits ?? 0)}</span>
          </span>
        </div>
      )}

      {/* Table header */}
      <div className="grid grid-cols-[1.6fr_1fr_0.8fr_1.5fr_1fr] gap-x-3 border-b border-slate-800/40 bg-slate-950/60 px-5 py-2">
        {["Type", "Amount", "Status", "Note", "Date"].map((h) => (
          <span key={h} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{h}</span>
        ))}
      </div>

      {/* Virtualised rows */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ height: "480px", scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent" }}
      >
        {isLoading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-slate-600">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[12px]">Loading ledger…</span>
          </div>
        ) : isError ? (
          <div className="flex h-40 items-center justify-center text-[12px] text-rose-400">
            Failed to load ledger history
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-[12px] text-slate-600">
            No transactions match filters
          </div>
        ) : (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {virtualItems.map((vRow) => {
              const entry = displayed[vRow.index];
              return (
                <div
                  key={vRow.key}
                  data-index={vRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{ position: "absolute", top: vRow.start, left: 0, right: 0 }}
                >
                  {entry ? (
                    <LedgerRow entry={entry} />
                  ) : (
                    // Sentinel / loading row
                    <div className="flex items-center justify-center py-4">
                      {isFetchingNextPage && <Loader2 size={13} className="animate-spin text-slate-600" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default LedgerTable;
