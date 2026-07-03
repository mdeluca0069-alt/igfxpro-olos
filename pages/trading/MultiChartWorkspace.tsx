/**
 * Multi-Chart Workspace — institutional multi-panel chart view.
 * Layouts: 1×1, 2×2, 1×3, 3×1
 * Reuses TradingChart from LightweightCharts (real OHLCV API + WS quotes).
 * Crosshair + time-range sync across all visible panels via zero-rerender ref broadcast.
 * Layout persistence via localStorage.
 */
import {
  useState, useCallback, useMemo, useRef, memo,
  lazy, Suspense,
  type ChangeEvent,
} from "react";
import {
  Grid2X2, LayoutList, Columns2, Rows2,
  Bookmark, Trash2, ChevronDown, LayoutGrid,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePageTitle } from "../../hooks/usePageTitle";
import type { Timeframe, ChartHandle } from "../../components/realtime/LightweightCharts";
import type { LogicalRange, Time } from "lightweight-charts";

const TradingChart = lazy(() =>
  import("../../components/realtime/LightweightCharts").then((m) => ({ default: m.TradingChart }))
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Layout = "1x1" | "2x2" | "1x3" | "3x1";

interface PanelConfig {
  id:        string;
  symbol:    string;
  timeframe: Timeframe;
}

interface SavedWorkspace {
  name:    string;
  layout:  Layout;
  panels:  PanelConfig[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LAYOUT_DEFS: { id: Layout; label: string; icon: React.ElementType; grid: string; count: number }[] = [
  { id: "1x1", label: "1×1",  icon: LayoutGrid, grid: "grid-cols-1 grid-rows-1",                     count: 1 },
  { id: "2x2", label: "2×2",  icon: Grid2X2,    grid: "grid-cols-2 grid-rows-2",                     count: 4 },
  { id: "1x3", label: "1×3",  icon: Columns2,   grid: "grid-cols-3 grid-rows-1",                     count: 3 },
  { id: "3x1", label: "3×1",  icon: Rows2,      grid: "grid-cols-1 grid-rows-3",                     count: 3 },
];

const SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "EURGBP",
  "XAUUSD", "XAGUSD", "WTI", "BRENT",
  "US500", "US100", "DE40", "UK100",
  "BTCUSD", "ETHUSD",
  "AAPL", "MSFT", "NVDA", "TSLA",
];

const TIMEFRAMES: Timeframe[] = ["1M", "5M", "15M", "1H", "4H", "1D"];

const LS_KEY = "igfxpro:workspace:v1";

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadWorkspaces(): SavedWorkspace[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedWorkspace[];
  } catch {
    return [];
  }
}

function saveWorkspaces(list: SavedWorkspace[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch { /* storage full */ }
}

function makeDefaultPanels(count: number): PanelConfig[] {
  const defaults = ["EURUSD", "GBPUSD", "XAUUSD", "US500", "BTCUSD", "USDJPY"];
  return Array.from({ length: count }, (_, i) => ({
    id:        `p${i}`,
    symbol:    defaults[i] ?? "EURUSD",
    timeframe: "1H" as Timeframe,
  }));
}

// ─── Panel header ─────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  panel:       PanelConfig;
  count:       number;
  onChange:    (id: string, patch: Partial<Omit<PanelConfig, "id">>) => void;
}

const PanelHeader = memo(function PanelHeader({ panel, count, onChange }: PanelHeaderProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#06090f] px-3 py-2">
      {/* Symbol selector */}
      <div className="relative">
        <select
          value={panel.symbol}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(panel.id, { symbol: e.target.value })}
          className="cursor-pointer appearance-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-1 pl-2 pr-6 text-[11px] font-black text-white outline-none focus:border-white/[0.16]"
        >
          {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown size={9} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>

      {/* Timeframe pills */}
      <div className="flex gap-0.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onChange(panel.id, { timeframe: tf })}
            className={[
              "rounded px-1.5 py-0.5 text-[10px] font-bold transition",
              panel.timeframe === tf
                ? "bg-cyan-400/20 text-cyan-300"
                : "text-slate-600 hover:text-slate-400",
            ].join(" ")}
          >
            {tf}
          </button>
        ))}
      </div>

      <span className="ml-auto text-[9px] text-slate-700">{count === 1 ? "1×1" : ""}</span>
    </div>
  );
});

// ─── Single chart panel ───────────────────────────────────────────────────────

interface ChartPanelProps {
  panel:                 PanelConfig;
  count:                 number;
  height:                number;
  onChange:              (id: string, patch: Partial<Omit<PanelConfig, "id">>) => void;
  handleRef:             React.MutableRefObject<ChartHandle | null>;
  onCrosshairMove:       (time: Time | null, price: number | null) => void;
  onLogicalRangeChange:  (range: LogicalRange | null) => void;
}

const ChartPanel = memo(function ChartPanel({
  panel, count, height, onChange,
  handleRef, onCrosshairMove, onLogicalRangeChange,
}: ChartPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06]">
      <PanelHeader panel={panel} count={count} onChange={onChange} />
      <div className="flex-1">
        <Suspense fallback={<div style={{ height }} className="flex items-center justify-center text-slate-700 text-[11px]">Loading chart…</div>}>
          <TradingChart
            symbol={panel.symbol}
            timeframe={panel.timeframe}
            height={height}
            showVolume
            showMA
            handleRef={handleRef}
            onCrosshairMove={onCrosshairMove}
            onLogicalRangeChange={onLogicalRangeChange}
          />
        </Suspense>
      </div>
    </div>
  );
});

// ─── Layout grid ──────────────────────────────────────────────────────────────

interface WorkspaceGridProps {
  layout:   Layout;
  panels:   PanelConfig[];
  onChange: (id: string, patch: Partial<Omit<PanelConfig, "id">>) => void;
  // Sync
  handleRefs:           React.MutableRefObject<Map<string, ChartHandle | null>>;
  onCrosshairMove:      (panelId: string, time: Time | null) => void;
  onLogicalRangeChange: (panelId: string, range: LogicalRange | null) => void;
}

function panelHeight(layout: Layout): number {
  switch (layout) {
    case "1x1": return 580;
    case "2x2": return 320;
    case "1x3":
    case "3x1": return 400;
  }
}

const WorkspaceGrid = memo(function WorkspaceGrid({
  layout, panels, onChange, handleRefs, onCrosshairMove, onLogicalRangeChange,
}: WorkspaceGridProps) {
  const def = LAYOUT_DEFS.find((d) => d.id === layout)!;
  const h   = panelHeight(layout);

  return (
    <div className={`grid gap-2 ${def.grid}`} style={{ height: layout === "2x2" ? "660px" : undefined }}>
      {panels.slice(0, def.count).map((p) => {
        // Stable per-panel ref stored in the map
        if (!handleRefs.current.has(p.id)) handleRefs.current.set(p.id, null);
        const panelHandleRef = { get current() { return handleRefs.current.get(p.id) ?? null; },
                                 set current(v: ChartHandle | null) { handleRefs.current.set(p.id, v); } };
        return (
          <ChartPanel
            key={p.id}
            panel={p}
            count={def.count}
            height={h}
            onChange={onChange}
            handleRef={panelHandleRef}
            onCrosshairMove={(time, _price) => onCrosshairMove(p.id, time)}
            onLogicalRangeChange={(range) => onLogicalRangeChange(p.id, range)}
          />
        );
      })}
    </div>
  );
});

// ─── Save workspace dialog ────────────────────────────────────────────────────

interface SaveDialogProps {
  onSave:  (name: string) => void;
  onClose: () => void;
}

const SaveDialog = memo(function SaveDialog({ onSave, onClose }: SaveDialogProps) {
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) { onSave(trimmed); onClose(); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-[#080f1a] p-5 shadow-2xl">
        <p className="mb-3 text-sm font-bold text-white">Save Workspace</p>
        <form onSubmit={submit}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name…"
            maxLength={40}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-white/[0.16]"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-700 py-2 text-[12px] text-slate-400 transition hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()}
              className="flex-1 rounded-xl bg-cyan-500/20 py-2 text-[12px] font-bold text-cyan-300 transition hover:bg-cyan-500/30 disabled:opacity-40">
              Save
            </button>
          </div>
        </form>
      </div>
    </>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MultiChartWorkspace() {
  usePageTitle("Multi-Chart Workspace");

  const [layout,     setLayout]     = useState<Layout>("2x2");
  const [panels,     setPanels]     = useState<PanelConfig[]>(() => makeDefaultPanels(4));
  const [workspaces, setWorkspaces] = useState<SavedWorkspace[]>(loadWorkspaces);
  const [showSave,   setShowSave]   = useState(false);
  const [wsMenu,     setWsMenu]     = useState(false);

  const layoutDef = useMemo(() => LAYOUT_DEFS.find((d) => d.id === layout)!, [layout]);

  // ── Crosshair + range sync (zero rerender — pure ref broadcast) ─────────────
  const handleRefs = useRef<Map<string, ChartHandle | null>>(new Map());

  const broadcastCrosshair = useCallback((sourceId: string, time: Time | null) => {
    handleRefs.current.forEach((handle, id) => {
      if (id !== sourceId && handle) handle.syncCrosshair(time);
    });
  }, []);

  const broadcastRange = useCallback((sourceId: string, range: LogicalRange | null) => {
    handleRefs.current.forEach((handle, id) => {
      if (id !== sourceId && handle) handle.syncLogicalRange(range);
    });
  }, []);

  const handleLayoutChange = useCallback((newLayout: Layout) => {
    const def = LAYOUT_DEFS.find((d) => d.id === newLayout)!;
    setLayout(newLayout);
    setPanels((prev) => {
      if (prev.length >= def.count) return prev;
      const extras = makeDefaultPanels(def.count - prev.length).map((p, i) => ({
        ...p,
        id: `p${prev.length + i}`,
      }));
      return [...prev, ...extras];
    });
  }, []);

  const handlePanelChange = useCallback((id: string, patch: Partial<Omit<PanelConfig, "id">>) => {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const handleSave = useCallback((name: string) => {
    const ws: SavedWorkspace = { name, layout, panels: panels.slice(0, layoutDef.count) };
    setWorkspaces((prev) => {
      const next = [ws, ...prev.filter((w) => w.name !== name)].slice(0, 20);
      saveWorkspaces(next);
      return next;
    });
  }, [layout, panels, layoutDef.count]);

  const handleLoad = useCallback((ws: SavedWorkspace) => {
    setLayout(ws.layout);
    setPanels(ws.panels);
    setWsMenu(false);
  }, []);

  const handleDelete = useCallback((name: string) => {
    setWorkspaces((prev) => {
      const next = prev.filter((w) => w.name !== name);
      saveWorkspaces(next);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] antialiased">
      <div className="mx-auto max-w-[1600px] px-4 py-5 lg:px-6">

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-cyan-400" />
            <h1 className="text-[15px] font-black text-white">Multi-Chart Workspace</h1>
          </div>

          {/* Layout switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5">
            {LAYOUT_DEFS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleLayoutChange(id)}
                title={`${label} layout`}
                aria-label={`${label} layout`}
                aria-pressed={layout === id}
                className={[
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                  layout === id
                    ? "bg-cyan-400/20 text-cyan-300"
                    : "text-slate-500 hover:text-slate-300",
                ].join(" ")}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Saved workspaces dropdown */}
            <div className="relative">
              <button
                onClick={() => setWsMenu((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-400 transition hover:text-white"
              >
                <LayoutList size={12} />
                Workspaces
                {workspaces.length > 0 && (
                  <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400">
                    {workspaces.length}
                  </span>
                )}
                <ChevronDown size={10} className={`transition-transform ${wsMenu ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {wsMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setWsMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-700 bg-[#0d1629] shadow-2xl"
                    >
                      {workspaces.length === 0 ? (
                        <div className="flex h-20 items-center justify-center text-[11px] text-slate-600">
                          No saved workspaces
                        </div>
                      ) : (
                        workspaces.map((ws) => (
                          <div key={ws.name} className="flex items-center justify-between border-b border-slate-800/40 last:border-0 hover:bg-slate-800/40 transition">
                            <button
                              onClick={() => handleLoad(ws)}
                              className="flex-1 px-4 py-3 text-left text-[12px] text-slate-300"
                            >
                              <p className="font-semibold">{ws.name}</p>
                              <p className="text-[9px] text-slate-600">{ws.layout} · {ws.panels.length} panels</p>
                            </button>
                            <button
                              onClick={() => handleDelete(ws.name)}
                              aria-label={`Delete workspace ${ws.name}`}
                              className="px-3 py-3 text-slate-700 transition hover:text-rose-400 focus:outline-none focus:text-rose-400"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Save */}
            <button
              onClick={() => setShowSave(true)}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-3 py-2 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-400/[0.14]"
            >
              <Bookmark size={12} />
              Save
            </button>
          </div>
        </div>

        {/* Chart grid */}
        <WorkspaceGrid
          layout={layout}
          panels={panels}
          onChange={handlePanelChange}
          handleRefs={handleRefs}
          onCrosshairMove={broadcastCrosshair}
          onLogicalRangeChange={broadcastRange}
        />

        {/* Panel legend */}
        <div className="mt-3 flex flex-wrap gap-3">
          {panels.slice(0, layoutDef.count).map((p, i) => (
            <div key={p.id} className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60" />
              Panel {i + 1}: <span className="text-slate-400">{p.symbol}</span> · <span className="text-slate-400">{p.timeframe}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save dialog */}
      <AnimatePresence>
        {showSave && (
          <SaveDialog onSave={handleSave} onClose={() => setShowSave(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export { MultiChartWorkspace };
