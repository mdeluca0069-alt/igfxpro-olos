import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Activity, BookOpen, Bot, GraduationCap, LayoutDashboard,
  LifeBuoy, LineChart, Scale, Search, Settings, ShieldCheck,
  Terminal, Wallet,
} from "lucide-react";

type Command = {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
};

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Autofocus search input on open
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const commands = useMemo<Command[]>(
    () => [
      // Navigation
      { id: "nav-dashboard",  label: "Dashboard",             description: "Client overview",       category: "Navigate", icon: LayoutDashboard, action: () => navigate("/dashboard"),                keywords: ["home"] },
      { id: "nav-trading",    label: "Trading",               description: "Open trading terminal", category: "Navigate", icon: LineChart,       action: () => navigate("/trading"),                  keywords: ["terminal", "chart", "order"] },
      { id: "nav-olos",       label: "OLOS AI",               description: "AI signals & models",   category: "Navigate", icon: Bot,             action: () => navigate("/olos-ai"),                  keywords: ["ai", "signal", "confidence"] },
      { id: "nav-risk",       label: "Risk",                  description: "Risk dashboard",        category: "Navigate", icon: ShieldCheck,     action: () => navigate("/risk"),                     keywords: ["margin", "exposure", "pnl"] },
      { id: "nav-wallet",     label: "Wallet",                description: "Balance & transfers",   category: "Navigate", icon: Wallet,          action: () => navigate("/wallet"),                   keywords: ["balance", "funds"] },
      { id: "nav-overview",   label: "Overview",              description: "Platform overview",     category: "Navigate", icon: Activity,        action: () => navigate("/overview"),                 keywords: ["summary"] },
      { id: "nav-academy",    label: "Academy",               description: "Learning modules",      category: "Navigate", icon: GraduationCap,   action: () => navigate("/academy"),                  keywords: ["learn", "course"] },
      { id: "nav-settings",   label: "Settings",              description: "Account settings",      category: "Navigate", icon: Settings,        action: () => navigate("/settings"),                 keywords: ["profile", "preferences"] },
      { id: "nav-support",    label: "Support",               description: "Help & contacts",       category: "Navigate", icon: LifeBuoy,        action: () => navigate("/support"),                  keywords: ["help", "contact"] },
      // Actions
      { id: "act-deposit",    label: "Deposit funds",         description: "Go to deposit page",    category: "Actions",  icon: Wallet,          action: () => navigate("/wallet/deposit"),           keywords: ["money", "fund", "add"] },
      { id: "act-withdraw",   label: "Withdraw funds",        description: "Request a withdrawal",  category: "Actions",  icon: Wallet,          action: () => navigate("/wallet/withdraw"),          keywords: ["money", "remove"] },
      { id: "act-history",    label: "Transaction history",   description: "View all transactions", category: "Actions",  icon: BookOpen,        action: () => navigate("/wallet/transactions"),      keywords: ["ledger", "log"] },
      { id: "act-mt5",        label: "Open MT5 terminal",     description: "Switch to MT5",         category: "Actions",  icon: Terminal,        action: () => navigate("/trading?platform=mt5"),     keywords: ["platform", "metatrader"] },
      { id: "act-itrader",    label: "Open iTrader terminal", description: "Switch to iTrader",     category: "Actions",  icon: Terminal,        action: () => navigate("/trading?platform=itrader"), keywords: ["platform"] },
      { id: "act-indicators", label: "Indicators",            description: "Technical indicators",  category: "Actions",  icon: Scale,           action: () => navigate("/trading"),                  keywords: ["rsi", "ema", "macd", "vwap"] },
    ],
    [navigate],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(({ label, description = "", category, keywords = [] }) =>
      [label, description, category, ...keywords].join(" ").toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Reset active index whenever the filtered list changes
  useEffect(() => setActiveIndex(0), [filtered]);

  const categories = useMemo(
    () => [...new Set(filtered.map((c) => c.category))],
    [filtered],
  );

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) { cmd.action(); close(); }
        break;
      }
      case "Escape":
        close();
        break;
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Search className="shrink-0 text-slate-500" size={18} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <kbd className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500">esc</kbd>
        </div>

        {/* Command list */}
        <div className="max-h-[360px] overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No commands found</p>
          ) : (
            categories.map((category) => (
              <div key={category}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {category}
                </p>
                {filtered
                  .filter((c) => c.category === category)
                  .map((cmd) => {
                    const index = filtered.indexOf(cmd);
                    const active = index === activeIndex;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={[
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                          active ? "bg-cyan-400/10 text-white" : "text-slate-300 hover:bg-slate-900",
                        ].join(" ")}
                        onClick={() => { cmd.action(); close(); }}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <Icon size={16} className={active ? "text-cyan-300" : "text-slate-500"} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="truncate text-xs text-slate-500">{cmd.description}</div>
                          )}
                        </div>
                        {active && (
                          <kbd className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500">
                            enter
                          </kbd>
                        )}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint bar */}
        <div className="flex items-center gap-4 border-t border-slate-800 px-4 py-2">
          <span className="text-[11px] text-slate-600">
            <kbd className="rounded border border-slate-700 px-1 py-0.5 text-[10px]">↑↓</kbd> navigate
          </span>
          <span className="text-[11px] text-slate-600">
            <kbd className="rounded border border-slate-700 px-1 py-0.5 text-[10px]">↵</kbd> select
          </span>
          <span className="text-[11px] text-slate-600">
            <kbd className="rounded border border-slate-700 px-1 py-0.5 text-[10px]">esc</kbd> close
          </span>
          <span className="ml-auto text-[11px] text-slate-600">
            <kbd className="rounded border border-slate-700 px-1 py-0.5 text-[10px]">⌘K</kbd>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default CommandPalette;
