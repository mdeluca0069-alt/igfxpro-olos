import { NavLink } from "react-router-dom";
import {
  Bot,
  Building2,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trading",   label: "Trade",     icon: LineChart        },
  { to: "/olos-ai",  label: "OLOS",      icon: Bot              },
  { to: "/risk",      label: "Risk",      icon: ShieldCheck      },
  { to: "/wallet",    label: "Wallet",    icon: Wallet           },
];

export function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-800 bg-[#05070d]/95 backdrop-blur-sm safe-area-inset-bottom lg:hidden"
      aria-label="Mobile navigation"
    >
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={`Navigate to ${label}`}
          className={({ isActive }) =>
            clsx(
              "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition-colors",
              isActive
                ? "text-cyan-400"
                : "text-slate-500 hover:text-slate-300 active:text-slate-200"
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                isActive && "bg-cyan-400/10"
              )}>
                <Icon size={18} aria-hidden />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/** Extra nav items for expanded mobile drawer (academy, onboarding, support) */
const secondaryItems = [
  { to: "/onboarding", label: "Onboarding", icon: Building2    },
  { to: "/academy",    label: "Academy",    icon: GraduationCap },
];

export function MobileNavExtended() {
  return (
    <div className="grid grid-cols-2 gap-2 p-4 lg:hidden">
      {secondaryItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                : "border-slate-800 text-slate-400 hover:bg-slate-900"
            )
          }
        >
          <Icon size={16} aria-hidden />
          {label}
        </NavLink>
      ))}
    </div>
  );
}

export default MobileNav;
