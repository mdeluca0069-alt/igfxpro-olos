import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart2,
  BookOpen,
  Briefcase,
  ChevronUp,
  LayoutDashboard,
  Wallet,
} from "lucide-react";
import { useTradingStore } from "../../store/trading.store";

const NAV_ITEMS = [
  { to: "/trading",   icon: BarChart2,       label: "Trade"     },
  { to: "/trading/positions", icon: Briefcase, label: "Positions" },
  { to: "/watchlist", icon: BookOpen,         label: "Watch"     },
  { to: "/wallet",    icon: Wallet,           label: "Wallet"    },
  { to: "/dashboard", icon: LayoutDashboard,  label: "Dashboard" },
] as const;

interface Props {
  onOrderTicketOpen?: () => void;
}

export const BottomNavigation = memo(function BottomNavigation({ onOrderTicketOpen }: Props) {
  const location       = useLocation();
  const openPositions  = useTradingStore((s) => s.positions.length);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 block md:hidden">
      {/* Frosted glass bar */}
      <div className="border-t border-slate-700/60 bg-[#080f1a]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around px-1 pb-safe">

          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === "/trading"
                ? location.pathname === "/trading"
                : location.pathname.startsWith(to);
            const showBadge = label === "Positions" && openPositions > 0;

            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-1 flex-col items-center gap-0.5 py-3 text-center"
              >
                <span className="relative">
                  <Icon
                    size={22}
                    className={isActive ? "text-cyan-400" : "text-slate-500"}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-0.5 text-[9px] font-black text-black">
                      {openPositions > 9 ? "9+" : openPositions}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-semibold tracking-wider ${
                    isActive ? "text-cyan-400" : "text-slate-600"
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}

          {/* Quick-trade FAB slot */}
          {onOrderTicketOpen && (
            <button
              onClick={onOrderTicketOpen}
              className="flex flex-1 flex-col items-center gap-0.5 py-3 text-center"
              aria-label="Open order ticket"
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-cyan-500/20 ring-1 ring-cyan-400/50">
                <ChevronUp size={14} className="text-cyan-300" />
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-cyan-400">Order</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
});

export default BottomNavigation;
