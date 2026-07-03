/**
 * IGFXPRO — Application Shell v3
 * Institutional prime brokerage portal layout.
 * Sidebar: 4-group navigation hierarchy matching prime brokerage conventions.
 * Top bar: Account ID · Type · Currency · Status · Connection · Sync · Notifications · User
 */
import { ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart2,
  Bot,
  CalendarDays,
  ClipboardList,
  Cpu,
  FileCheck2,
  FileText,
  FlaskConical,
  Globe,
  GraduationCap,
  Key,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  LogOut,
  Radio,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { useOptionalAuth }       from "./AuthGate";
import { useFeatureFlags }       from "./FeatureFlagProvider";
import { useT }                  from "../hooks/useT";
import { useMarketStore }        from "../store/market.store";
import { useWalletStore }        from "../store/wallet.store";
import { useTier }               from "./TierProvider";
import { NotificationCenter }    from "../components/notifications/NotificationCenter";
import { PushNotificationManager, PushBellButton } from "./PushNotificationManager";
import { clearAuth, brokerRequest } from "../shared/lib/brokerApi";
import { readStoredPrincipal, writeStoredPrincipal } from "../shared/lib/principalStorage";
import type { AccountTier } from "../shared/schemas/auth.principal";
import type { ClientAccountState } from "../shared/lib/clientAccountStore";

// ─── Navigation structure ─────────────────────────────────────────────────────

type NavItem = { to: string; label: string; icon: React.ElementType };

const TRADING_NAV: NavItem[] = [
  { to: "/dashboard",               label: "Dashboard",        icon: LayoutDashboard },
  { to: "/trading",                 label: "Trading Terminal", icon: LineChart       },
  { to: "/trading/time-and-sales",  label: "Time & Sales",     icon: ScrollText      },
  { to: "/paper-trading",           label: "Paper Trading",    icon: FlaskConical    },
  { to: "/portfolio",               label: "Portfolio",        icon: BarChart2       },
  { to: "/orders",                  label: "Orders",           icon: ClipboardList   },
  { to: "/watchlist",               label: "Markets",          icon: Globe           },
  { to: "/wallet",                  label: "Wallet",           icon: Wallet          },
];

const ANALYTICS_NAV: NavItem[] = [
  { to: "/risk",        label: "Risk Center",         icon: Shield      },
  { to: "/analytics",   label: "Trading Analytics",   icon: Activity    },
  { to: "/reports",     label: "Reports",             icon: FileText    },
  { to: "/reports/tax", label: "Tax Report",          icon: Receipt     },
  { to: "/compliance",  label: "Compliance",          icon: FileCheck2  },
];

const INTELLIGENCE_NAV: NavItem[] = [
  { to: "/olos-ai",    label: "OLOS Intelligence", icon: Bot          },
  { to: "/signals",    label: "Signal Center",     icon: Radio        },
  { to: "/autopilot",  label: "Autopilot",         icon: Cpu          },
  { to: "/calendar",   label: "Eco Calendar",      icon: CalendarDays },
];

const RESOURCES_NAV: NavItem[] = [
  { to: "/academy",          label: "Academy",    icon: GraduationCap },
  { to: "/support",          label: "Support",    icon: LifeBuoy      },
  { to: "/settings",         label: "Settings",   icon: Settings      },
  { to: "/settings/api-keys",label: "API Keys",   icon: Key           },
];

// ─── Paths that bypass the shell (public / admin) ────────────────────────────

const SHELL_BYPASS = new Set([
  "/", "/register", "/login", "/admin/login",
  "/about", "/contact", "/careers",
]);

function bypassShell(pathname: string): boolean {
  return (
    SHELL_BYPASS.has(pathname) ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/markets/") ||
    pathname.startsWith("/legal/") ||
    pathname.startsWith("/platform/")
  );
}

// ─── NavGroup ─────────────────────────────────────────────────────────────────

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700">
        {label}
      </p>
      <div className="space-y-px">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-[12px] font-medium transition-colors ${
                isActive
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={13}
                  className={isActive ? "text-slate-300" : "text-slate-600"}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const TIER_TEXT: Record<string, string> = {
  STANDARD:   "text-slate-400",
  GOLD:       "text-amber-400",
  VIP:        "text-violet-400",
  PLATINUM:   "text-cyan-400",
  ENTERPRISE: "text-emerald-400",
};

function InstitutionalSidebar() {
  const auth      = useOptionalAuth();
  const { tier }  = useTier();
  const connected = useMarketStore((s) => s.connected);
  const navigate  = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const initial = (auth?.user?.email?.[0] ?? "U").toUpperCase();
  const email   = auth?.user?.email ?? "—";

  async function handleLogout() {
    setLoggingOut(true);
    clearAuth();
    // Brief delay so clearAuth POST can fire before navigation
    await new Promise((r) => setTimeout(r, 150));
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex h-full flex-col border-r border-slate-800/80 bg-[#060a12]">

      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-slate-800/60 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-900">
          IG
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-black tracking-[0.1em] text-white">IGFXPRO</div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
            <span className="text-[9px] font-semibold text-slate-600">
              {connected ? "LIVE FEED" : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3" style={{ scrollbarWidth: "none" }}>
        <NavGroup label="Trading"      items={TRADING_NAV}      />
        <NavGroup label="Analytics"    items={ANALYTICS_NAV}    />
        <NavGroup label="Intelligence" items={INTELLIGENCE_NAV} />
        <NavGroup label="Resources"    items={RESOURCES_NAV}    />
      </nav>

      {/* Footer: user identity + logout */}
      <div className="border-t border-slate-800/60 px-3 py-2.5 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-300">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-slate-400">{email}</p>
            <p className={`text-[9px] font-bold ${TIER_TEXT[tier] ?? "text-slate-600"}`}>
              {tier}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:bg-rose-900/30 hover:text-rose-400 disabled:opacity-50"
        >
          <LogOut size={13} />
          <span>{loggingOut ? "Disconnessione..." : "Esci"}</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────

const LANG_FLAGS: Record<string, string> = { en: "🇬🇧", it: "🇮🇹", de: "🇩🇪", es: "🇪🇸" };
const SUPPORTED_LANGS = ["en", "it", "de", "es"] as const;

function LanguageSwitcher() {
  const { lang, setLang } = useT();
  const [open, setOpen]   = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
        title="Change language"
      >
        <span>{LANG_FLAGS[lang] ?? "🌐"}</span>
        <span className="hidden sm:inline uppercase">{lang}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-28 rounded-lg border border-slate-700 bg-[#0d1629] py-1 shadow-xl">
            {SUPPORTED_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => { setLang(l); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition hover:bg-slate-800 ${
                  lang === l ? "text-cyan-400 font-bold" : "text-slate-400"
                }`}
              >
                <span>{LANG_FLAGS[l]}</span>
                <span className="uppercase">{l}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TopBar() {
  const auth      = useOptionalAuth();
  const { tier }  = useTier();
  const { flags } = useFeatureFlags();
  const connected = useMarketStore((s) => s.connected);
  const balance   = useWalletStore((s) => s.balance);
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Format a clean account ID — hide internal sandbox user IDs
  const rawId = auth?.user?.id ?? "";
  const accountId = rawId
    ? rawId.includes("demo") || rawId.includes("seed")
      ? `ACC-${rawId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
      : `ACC-${rawId.replace(/-/g, "").slice(-8).toUpperCase()}`
    : "—";
  const currency  = (balance as any)?.currency ?? "USD";
  const isLive    = flags.liveTrading !== false;
  const syncTime  = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const initial = (auth?.user?.email?.[0] ?? "U").toUpperCase();

  function handleLogout() {
    setMenuOpen(false);
    clearAuth();
    setTimeout(() => navigate("/login", { replace: true }), 150);
  }

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-800/60 bg-[#060a12] px-4">
      {/* Left: account identifiers */}
      <div className="flex items-center divide-x divide-slate-800">
        <span className="pr-3 font-mono text-[10px] text-slate-500">{accountId}</span>
        <span className="px-3 text-[10px] text-slate-500">{tier}</span>
        <span className="px-3 text-[10px] text-slate-500">{currency}</span>

        {/* Account status */}
        <div className="flex items-center gap-1.5 px-3">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className={`text-[10px] font-bold ${isLive ? "text-emerald-400" : "text-amber-400"}`}>
            {isLive ? "LIVE" : "DEMO"}
          </span>
        </div>

        {/* Connection status */}
        <div className="hidden items-center gap-1.5 px-3 sm:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`} />
          <span className={`text-[10px] ${connected ? "text-slate-400" : "text-slate-600"}`}>
            {connected ? "Connected" : "Offline"}
          </span>
        </div>

        {/* Last sync */}
        <span className="hidden px-3 font-mono text-[10px] text-slate-700 lg:block">
          {syncTime}
        </span>
      </div>

      {/* Right: language switcher + notifications + user menu */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <PushBellButton />
        <NotificationCenter />

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            {initial}
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

              {/* Dropdown */}
              <div className="absolute right-0 top-8 z-50 w-48 rounded-lg border border-slate-700 bg-[#0d1629] py-1 shadow-xl">
                {/* User info */}
                <div className="border-b border-slate-800 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-white">{auth?.user?.email ?? "—"}</p>
                  <p className={`text-[9px] font-bold ${TIER_TEXT[tier] ?? "text-slate-600"}`}>{tier}</p>
                </div>

                {/* Profile link */}
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); navigate("/settings"); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <User size={12} />
                  <span>Profilo</span>
                </button>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-rose-400 transition hover:bg-rose-900/30"
                >
                  <LogOut size={12} />
                  <span>Esci</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export interface AppShellProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  workspace?: ReactNode;
  floatingAI?: ReactNode;
  notifications?: ReactNode;
  children?: ReactNode;
}

export const AppShell = ({
  sidebar,
  workspace,
  floatingAI,
  notifications,
  children,
}: AppShellProps) => {
  const location = useLocation();
  const bypass   = useMemo(() => bypassShell(location.pathname), [location.pathname]);

  // Global tier sync: fetch the server-authoritative account on every navigation
  // and push the tier to TierProvider so it reflects admin changes immediately,
  // without requiring a logout/login. Only runs for authenticated client pages.
  useEffect(() => {
    if (bypass) return;
    // Don't sync on admin pages (admin doesn't have a client account)
    if (location.pathname.startsWith("/admin")) return;

    let cancelled = false;
    brokerRequest<ClientAccountState>("/api/v1/client/account", { method: "GET" }, "client")
      .then((r) => {
        if (cancelled) return;
        const stored = readStoredPrincipal();
        if (stored && stored.tier !== r.profile.tier) {
          writeStoredPrincipal({ ...stored, tier: r.profile.tier as AccountTier });
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (bypass) return <>{children}</>;

  const sidebarNode   = sidebar  ?? <InstitutionalSidebar />;
  const workspaceNode = workspace ?? children;

  return (
    <PushNotificationManager>
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#050a0f] text-white">

      {/* Desktop sidebar — 224 px fixed */}
      <div className="hidden w-56 shrink-0 lg:block">{sidebarNode}</div>

      {/* Main area */}
      <div className="relative flex min-w-0 flex-1 flex-col">

        {/* Institutional top bar */}
        <TopBar />

        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-16 lg:pb-0">
          {workspaceNode}
        </div>

        {/* Floating overlay zones */}
        <div className="pointer-events-none absolute right-4 top-14 z-20">
          {notifications}
        </div>
        <div className="pointer-events-none absolute bottom-20 right-4 z-20 lg:bottom-4">
          {floatingAI}
        </div>
      </div>
    </div>
    </PushNotificationManager>
  );
};
