import { Link, useLocation } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart2, Bot, Cpu, Database,
  DollarSign, Globe, Layers, Lock, Radio, Shield, ShieldAlert,
  Sliders, Tag, TrendingUp, Users, Zap, FileText, LayoutDashboard,
  GitBranch, ChevronRight, Headphones,
} from "lucide-react";

const ADMIN_NAV = [
  { label: "Overview",          href: "/admin",                icon: LayoutDashboard },
  { label: "Dashboard",         href: "/admin/dashboard",      icon: BarChart2 },
  { separator: true, label: "Trading Operations" },
  { label: "Liquidity Monitor", href: "/admin/liquidity",      icon: Activity },
  { label: "Spread Controller", href: "/admin/spreads",        icon: Sliders },
  { label: "Market Freeze",     href: "/admin/market-freeze",  icon: Lock },
  { label: "Margin Risk Board", href: "/admin/margin-risk",    icon: ShieldAlert },
  { label: "Exposure Map",      href: "/admin/exposure-map",   icon: Layers },
  { label: "Exposure Netting",  href: "/admin/netting",        icon: GitBranch },
  { separator: true, label: "AI & Signals" },
  { label: "Signal Center",     href: "/admin/signals",        icon: Radio },
  { label: "Autopilot Oversight", href: "/admin/autopilot",    icon: Bot },
  { label: "AI Behavior",       href: "/admin/ai-behavior",    icon: Bot },
  { label: "AI Governance",     href: "/admin/ai-governance",  icon: Shield },
  { label: "Hedge Monitor",     href: "/admin/hedge-monitor",  icon: TrendingUp },
  { label: "Event Risk Shield", href: "/admin/event-risk",     icon: AlertTriangle },
  { separator: true, label: "Compliance" },
  { label: "AML Alerts",        href: "/admin/aml",            icon: AlertTriangle },
  { label: "Compliance",        href: "/admin/compliance",     icon: Shield },
  { label: "KYC Review",        href: "/admin/kyc",            icon: Users },
  { separator: true, label: "Infrastructure" },
  { label: "Broker Health",     href: "/admin/broker-health",  icon: Activity },
  { label: "Service Health",    href: "/admin/service-health", icon: Cpu },
  { label: "Infrastructure",    href: "/admin/infrastructure", icon: Database },
  { label: "Latency Monitor",   href: "/admin/latency",        icon: Zap },
  { label: "Failover Panel",    href: "/admin/failover",       icon: Globe },
  { label: "System Logs",       href: "/admin/logs",           icon: FileText },
  { separator: true, label: "Client Care" },
  { label: "Support Queue",     href: "/admin/support",        icon: Headphones },
  { separator: true, label: "Business" },
  { label: "Revenue",           href: "/admin/revenue",        icon: DollarSign },
  { label: "Tiers",             href: "/admin/tiers",          icon: Tag },
  { label: "Feature Flags",     href: "/admin/feature-flags",  icon: Sliders },
  { label: "Affiliates",        href: "/admin/affiliates",     icon: Users },
  { label: "User Analytics",    href: "/admin/user-analytics", icon: BarChart2 },
];

type NavItem =
  | { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }
  | { separator: true; label: string };

export function AdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const { pathname } = useLocation();

  return (
    <aside
      className={[
        "flex h-full flex-col border-r border-slate-800 bg-slate-950 transition-all",
        collapsed ? "w-14" : "w-56",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        {!collapsed && (
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Admin Panel
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {ADMIN_NAV.map((item, i) => {
          if ("separator" in item) {
            if (collapsed) return null;
            return (
              <div key={i} className="mt-4 mb-1 px-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  {item.label}
                </span>
              </div>
            );
          }

          const navItem = item as Extract<NavItem, { href: string }>;
          const Icon    = navItem.icon;
          const active  = pathname === navItem.href;

          return (
            <Link
              key={navItem.href}
              to={navItem.href}
              title={collapsed ? navItem.label : undefined}
              className={[
                "flex items-center gap-2.5 px-4 py-2 text-[12px] font-medium transition-colors",
                active
                  ? "bg-cyan-400/10 text-cyan-400"
                  : "text-slate-500 hover:bg-slate-900 hover:text-slate-300",
              ].join(" ")}
            >
              <Icon size={14} className="shrink-0" />
              {!collapsed && <span className="truncate">{navItem.label}</span>}
              {!collapsed && active && (
                <ChevronRight size={12} className="ml-auto shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="border-t border-slate-800 p-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:text-slate-400"
        >
          <Globe size={12} className="shrink-0" />
          {!collapsed && "Back to platform"}
        </Link>
      </div>
    </aside>
  );
}

export default AdminSidebar;
