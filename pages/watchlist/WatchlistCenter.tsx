/**
 * Watchlist Center — custom lists, favorites, top movers, hot symbols, search.
 */
import { useEffect, useRef, useState } from "react";
import { Link }                         from "react-router-dom";
import { useQuery }                     from "@tanstack/react-query";
import { useShallow }                   from "zustand/react/shallow";
import { motion, AnimatePresence }      from "framer-motion";
import {
  BookMarked, ChevronRight, Edit2, Flame, LayoutList,
  Loader2, Plus, Search, Star, Trash2, TrendingDown,
  TrendingUp, X,
} from "lucide-react";
import { useWatchlistStore }   from "../../store/watchlist.store";
import { useMarketStore }      from "../../store/market.store";
import { WatchlistAPI }        from "../../api/endpoints/watchlist";
import { pct, price }          from "../../shared/utils/format";
import { usePageTitle }        from "../../hooks/usePageTitle";
import type { WatchlistRow }   from "../../api/endpoints/watchlist";

// ── Primitive helpers ─────────────────────────────────────────────────────────

function clsx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">
      {children}
    </p>
  );
}

function ChangeChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        up
          ? "bg-emerald-400/10 text-emerald-400"
          : "bg-rose-400/10 text-rose-400",
      )}
    >
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {pct(value)}
    </span>
  );
}

// ── Symbol row inside an active list ─────────────────────────────────────────

type SymbolRowProps = {
  symbol:    string;
  listId:    string;
  isDefault: boolean;
  onTrade:   (symbol: string) => void;
};

function SymbolRow({ symbol, listId, isDefault, onTrade }: SymbolRowProps) {
  const { removeSymbol, isFavorite, addToFavorites, removeFromFavorites } =
    useWatchlistStore(
      useShallow((s) => ({
        removeSymbol:        s.removeSymbol,
        isFavorite:          s.isFavorite,
        addToFavorites:      s.addToFavorites,
        removeFromFavorites: s.removeFromFavorites,
      })),
    );
  const quote    = useMarketStore((s) => s.getQuote(symbol));
  const favorite = isFavorite(symbol);
  const [busy, setBusy] = useState(false);

  const mid       = quote?.mid       ?? 0;
  const changePct = quote?.changePct ?? 0;
  const up        = changePct >= 0;

  async function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (favorite) await removeFromFavorites(symbol);
      else          await addToFavorites(symbol);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    await removeSymbol(listId, symbol);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition hover:bg-slate-900/60"
      onClick={() => onTrade(symbol)}
    >
      {/* Favorite star */}
      <button
        onClick={toggleFavorite}
        className={clsx(
          "shrink-0 transition-colors",
          favorite ? "text-amber-400" : "text-slate-700 hover:text-amber-400",
        )}
        title={favorite ? "Remove from Favorites" : "Add to Favorites"}
      >
        <Star size={12} fill={favorite ? "currentColor" : "none"} />
      </button>

      {/* Symbol + asset class dot */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-white">{symbol}</p>
      </div>

      {/* Price */}
      <p
        className={clsx(
          "font-mono text-[12px] font-semibold tabular-nums transition-colors",
          up ? "text-emerald-300" : "text-rose-300",
        )}
      >
        {mid > 0 ? price(mid, symbol) : "—"}
      </p>

      {/* Change */}
      <div className="w-[62px] text-right">
        {quote ? <ChangeChip value={changePct} /> : null}
      </div>

      {/* Remove — only visible on hover, not for default list */}
      {!isDefault && (
        <button
          onClick={handleRemove}
          className="invisible shrink-0 text-slate-700 transition hover:text-rose-400 group-hover:visible"
          title="Remove symbol"
        >
          <X size={11} />
        </button>
      )}
    </motion.div>
  );
}

// ── Mover/Hot row ─────────────────────────────────────────────────────────────

type MoverRowProps = {
  symbol:    string;
  changePct: number;
  mid:       number;
  onAdd:     (symbol: string) => void;
  onTrade:   (symbol: string) => void;
};

function MoverRow({ symbol, changePct, mid, onAdd, onTrade }: MoverRowProps) {
  return (
    <div
      className="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-slate-900/60"
      onClick={() => onTrade(symbol)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-white">{symbol}</p>
        <p className="text-[10px] text-slate-600">{mid > 0 ? price(mid, symbol) : "—"}</p>
      </div>
      <ChangeChip value={changePct} />
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(symbol); }}
        className="invisible shrink-0 text-slate-600 transition hover:text-cyan-400 group-hover:visible"
        title="Add to active list"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

// ── Search modal ──────────────────────────────────────────────────────────────

type SearchModalProps = {
  open:       boolean;
  onClose:    () => void;
  onAdd:      (symbol: string) => void;
  activeList: WatchlistRow | null;
};

function SearchModal({ open, onClose, onAdd, activeList }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const instruments = useMarketStore((s) => s.instruments);
  const quotes      = useMarketStore((s) => s.quotes);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const results = instruments.filter((ins) => {
    if (!query) return true;
    const q = query.toUpperCase();
    return ins.symbol.includes(q) || ins.name.toUpperCase().includes(q);
  }).slice(0, 20);

  const already = new Set(activeList?.symbols ?? []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-24 z-50 w-full max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-700/60 bg-[#07111e] shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-slate-800/60 px-4 py-3">
              <Search size={15} className="shrink-0 text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search symbols or name…"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 ? (
                <p className="py-8 text-center text-[12px] text-slate-600">No symbols found</p>
              ) : (
                results.map((ins) => {
                  const q     = quotes[ins.symbol];
                  const added = already.has(ins.symbol);
                  return (
                    <div
                      key={ins.symbol}
                      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-slate-900/60"
                      onClick={() => { if (!added) { onAdd(ins.symbol); onClose(); } }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-white">{ins.symbol}</p>
                        <p className="truncate text-[10px] text-slate-500">{ins.name}</p>
                      </div>
                      {q && (
                        <div className="text-right">
                          <p className="font-mono text-[11px] text-slate-300">
                            {price(q.mid, ins.symbol)}
                          </p>
                          <ChangeChip value={q.changePct} />
                        </div>
                      )}
                      <span
                        className={clsx(
                          "shrink-0 rounded px-2 py-0.5 text-[9px] font-bold uppercase",
                          added
                            ? "bg-slate-700/60 text-slate-500"
                            : "bg-cyan-400/10 text-cyan-400",
                        )}
                      >
                        {added ? "Added" : "Add"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800/60 px-4 py-2.5 text-[10px] text-slate-600">
              Adding to: <span className="font-semibold text-slate-400">{activeList?.name ?? "—"}</span>
              {" · "}Press <kbd className="rounded bg-slate-800 px-1 py-0.5">Esc</kbd> to close
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── New / Rename modal ────────────────────────────────────────────────────────

type NameModalProps = {
  open:         boolean;
  title:        string;
  placeholder:  string;
  initialValue: string;
  onConfirm:    (name: string) => Promise<void>;
  onClose:      () => void;
};

function NameModal({ open, title, placeholder, initialValue, onConfirm, onClose }: NameModalProps) {
  const [value, setValue]   = useState(initialValue);
  const [busy,  setBusy]    = useState(false);
  const [err,   setErr]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setErr("");
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 60);
    }
  }, [open, initialValue]);

  async function submit() {
    const name = value.trim();
    if (!name) return;
    setBusy(true);
    setErr("");
    try {
      await onConfirm(name);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="fixed left-1/2 top-1/3 z-50 w-80 -translate-x-1/2 rounded-2xl border border-slate-700/60 bg-[#07111e] p-5 shadow-2xl"
          >
            <p className="mb-3 text-sm font-semibold text-white">{title}</p>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
              className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/60"
            />
            {err && <p className="mt-1.5 text-[11px] text-rose-400">{err}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-[12px] text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || !value.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-[12px] font-semibold text-cyan-300 transition hover:bg-cyan-500/30 disabled:opacity-40"
              >
                {busy && <Loader2 size={11} className="animate-spin" />}
                Confirm
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── List nav item ─────────────────────────────────────────────────────────────

type ListNavItemProps = {
  list:      WatchlistRow;
  active:    boolean;
  onClick:   () => void;
  onRename:  () => void;
  onDelete:  () => void;
};

function ListNavItem({ list, active, onClick, onRename, onDelete }: ListNavItemProps) {
  return (
    <div
      className={clsx(
        "group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition",
        active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400 hover:bg-slate-900/60 hover:text-white",
      )}
      onClick={onClick}
    >
      {list.isDefault
        ? <Star size={12} fill="currentColor" className="shrink-0 text-amber-400" />
        : <LayoutList size={12} className="shrink-0" />
      }
      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{list.name}</span>
      <span className={clsx(
        "shrink-0 text-[10px] tabular-nums",
        active ? "text-cyan-500" : "text-slate-600",
      )}>
        {list.symbols.length}
      </span>

      {/* Actions — only on hover, never for default list deletion */}
      <div className="invisible flex shrink-0 items-center gap-1 group-hover:visible">
        <button
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          className="rounded p-0.5 text-slate-600 hover:text-slate-300"
          title="Rename"
        >
          <Edit2 size={10} />
        </button>
        {!list.isDefault && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded p-0.5 text-slate-600 hover:text-rose-400"
            title="Delete list"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── WatchlistCenter ───────────────────────────────────────────────────────────

export default function WatchlistCenter() {
  usePageTitle("Watchlist");

  const {
    lists, activeListId, activeList, load, setActiveList,
    createList, renameList, deleteList, addSymbol,
  } = useWatchlistStore(
    useShallow((s) => ({
      lists:         s.lists,
      activeListId:  s.activeListId,
      activeList:    s.activeList,
      load:          s.load,
      setActiveList: s.setActiveList,
      createList:    s.createList,
      renameList:    s.renameList,
      deleteList:    s.deleteList,
      addSymbol:     s.addSymbol,
    })),
  );

  const instruments = useMarketStore((s) => s.instruments);
  const quotes      = useMarketStore((s) => s.quotes);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [renameOpen,  setRenameOpen]  = useState(false);
  const [renamingId,  setRenamingId]  = useState<string | null>(null);

  // Keyboard shortcut: / to open search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNewListOpen(false);
        setRenameOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load watchlists once
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // React Query: top movers + hot symbols
  const { data: movers } = useQuery({
    queryKey: ["watchlist", "top-movers"],
    queryFn:  () => WatchlistAPI.getTopMovers(8),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const { data: hotSymbols } = useQuery({
    queryKey: ["watchlist", "hot-symbols"],
    queryFn:  () => WatchlistAPI.getHotSymbols(8),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Navigate to trading page with symbol selected
  function handleTrade(symbol: string) {
    window.location.href = `/trading?symbol=${encodeURIComponent(symbol)}`;
  }

  async function handleAddToActive(symbol: string) {
    if (!activeList) return;
    await addSymbol(activeList.id, symbol);
  }

  const renamingList = lists.find((l) => l.id === renamingId) ?? null;

  // Live-enrich top movers with current quotes
  const enrichedMovers = (movers ?? []).map((m) => ({
    ...m,
    changePct: quotes[m.symbol]?.changePct ?? m.changePct,
    mid:       quotes[m.symbol]?.mid       ?? m.mid,
  })).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const enrichedHot = (hotSymbols ?? []).map((h) => ({
    ...h,
    changePct: quotes[h.symbol]?.changePct ?? h.changePct,
    mid:       quotes[h.symbol]?.mid       ?? h.mid,
  }));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#05070d] pb-24 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <BookMarked size={18} className="text-cyan-400" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">Watchlist Center</h1>
            <p className="text-[10px] text-slate-500">
              {lists.length} list{lists.length !== 1 ? "s" : ""} · {" "}
              {lists.reduce((s, l) => s + l.symbols.length, 0)} symbols tracked
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-400 transition hover:border-slate-600 hover:text-white"
          >
            <Search size={12} />
            Search symbols
            <kbd className="rounded bg-slate-800 px-1 text-[9px] text-slate-600">/</kbd>
          </button>

          <button
            onClick={() => setNewListOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/25"
          >
            <Plus size={12} />
            New List
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[220px_1fr_280px]">

        {/* ── Left: list nav ─────────────────────────────────────────────── */}
        <div className="space-y-1 lg:sticky lg:top-20 lg:self-start">
          <SectionHeader>My Lists</SectionHeader>

          <div className="space-y-0.5">
            {lists.map((list) => (
              <ListNavItem
                key={list.id}
                list={list}
                active={list.id === activeListId}
                onClick={() => setActiveList(list.id)}
                onRename={() => { setRenamingId(list.id); setRenameOpen(true); }}
                onDelete={async () => {
                  if (!confirm(`Delete "${list.name}"? Symbols will be removed.`)) return;
                  await deleteList(list.id);
                }}
              />
            ))}
          </div>

          <button
            onClick={() => setNewListOpen(true)}
            className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] text-slate-600 transition hover:text-slate-300"
          >
            <Plus size={11} />
            New list
          </button>
        </div>

        {/* ── Centre: active list ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#07111e]">
          {/* List header */}
          <div className="flex items-center justify-between border-b border-slate-800/50 px-5 py-3.5">
            <div className="flex items-center gap-2">
              {activeList?.isDefault
                ? <Star size={14} fill="currentColor" className="text-amber-400" />
                : <LayoutList size={14} className="text-slate-400" />
              }
              <span className="text-sm font-bold text-white">{activeList?.name ?? "—"}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">
                {activeList?.symbols.length ?? 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/trading`}
                className="flex items-center gap-1 text-[11px] text-slate-500 transition hover:text-cyan-400"
              >
                Trade <ChevronRight size={11} />
              </Link>
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-400 transition hover:bg-cyan-500/20"
              >
                <Plus size={11} /> Add
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 border-b border-slate-800/30 px-5 py-2">
            <span className="w-4" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Symbol</p>
            <p className="text-right text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Price</p>
            <p className="w-[62px] text-right text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">Change</p>
            <span className="w-4" />
          </div>

          {/* Rows */}
          <div className="px-2 py-1">
            {(!activeList || activeList.symbols.length === 0) ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <LayoutList size={28} className="text-slate-700" />
                <p className="text-[12px] text-slate-600">No symbols in this list</p>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-400 hover:bg-cyan-500/20"
                >
                  <Plus size={11} /> Add symbols
                </button>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {activeList.symbols.map((sym) => (
                  <SymbolRow
                    key={sym}
                    symbol={sym}
                    listId={activeList.id}
                    isDefault={activeList.isDefault}
                    onTrade={handleTrade}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Right: top movers + hot symbols ────────────────────────────── */}
        <div className="space-y-5">

          {/* Top Movers */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#07111e]">
            <div className="flex items-center gap-2 border-b border-slate-800/50 px-5 py-3">
              <TrendingUp size={13} className="text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Top Movers</span>
            </div>
            <div className="px-2 py-1">
              {(enrichedMovers.length === 0) ? (
                <p className="py-6 text-center text-[11px] text-slate-600">Loading…</p>
              ) : (
                enrichedMovers.map((m) => (
                  <MoverRow
                    key={m.symbol}
                    symbol={m.symbol}
                    changePct={m.changePct}
                    mid={m.mid}
                    onAdd={handleAddToActive}
                    onTrade={handleTrade}
                  />
                ))
              )}
            </div>
          </div>

          {/* Hot Symbols */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#07111e]">
            <div className="flex items-center gap-2 border-b border-slate-800/50 px-5 py-3">
              <Flame size={13} className="text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Hot Symbols</span>
            </div>
            <div className="px-2 py-1">
              {(enrichedHot.length === 0) ? (
                <p className="py-6 text-center text-[11px] text-slate-600">Loading…</p>
              ) : (
                enrichedHot.map((h) => (
                  <MoverRow
                    key={h.symbol}
                    symbol={h.symbol}
                    changePct={h.changePct}
                    mid={h.mid}
                    onAdd={handleAddToActive}
                    onTrade={handleTrade}
                  />
                ))
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#07111e] p-5">
            <SectionHeader>All Instruments</SectionHeader>
            <div className="space-y-2">
              {(["FX_MAJOR", "FX_MINOR", "COMMODITY", "CRYPTO", "INDEX", "EQUITY"] as const).map((cls) => {
                const count = instruments.filter((i) => i.assetClass === cls).length;
                if (!count) return null;
                return (
                  <div key={cls} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{cls.replace("_", " ")}</span>
                    <span className="font-mono text-[11px] font-bold text-slate-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAdd={handleAddToActive}
        activeList={activeList}
      />

      <NameModal
        open={newListOpen}
        title="New Watchlist"
        placeholder="e.g. My Forex Picks"
        initialValue=""
        onConfirm={(name) => createList(name).then(() => {})}
        onClose={() => setNewListOpen(false)}
      />

      <NameModal
        open={renameOpen}
        title="Rename List"
        placeholder="New name"
        initialValue={renamingList?.name ?? ""}
        onConfirm={(name) => renameList(renamingId!, name)}
        onClose={() => { setRenameOpen(false); setRenamingId(null); }}
      />
    </div>
  );
}
