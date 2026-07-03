/**
 * IGFXPRO — Orders
 * Order history from the execution pipeline.
 */
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { CheckCircle2, ChevronRight, ClipboardList, LineChart, XCircle } from "lucide-react";
import { useTradingStore } from "../../store/trading.store";
import { money, number, priceDigits, dateShort } from "../../shared/utils/format";
import { usePageTitle } from "../../hooks/usePageTitle";

export default function OrdersPage() {
  usePageTitle("Orders");

  const orders = useTradingStore(useShallow((s) => s.orders ?? []));

  const filled   = orders.filter((o) => o.status === "FILLED").length;
  const rejected = orders.filter((o) => o.status === "REJECTED").length;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1100px] space-y-5 p-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">IGFXPRO</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Orders</h1>
          </div>
          <Link to="/trading"
            className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-4 py-2.5 text-[12px] font-bold text-cyan-300 transition hover:bg-cyan-400/14">
            <LineChart size={13} /> New order
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total orders",  value: `${orders.length}`,  cls: "text-white"         },
            { label: "Filled",        value: `${filled}`,          cls: "text-emerald-300"   },
            { label: "Rejected",      value: `${rejected}`,        cls: rejected > 0 ? "text-rose-300" : "text-slate-500" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800/60 bg-[#07111e] px-4 py-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
              <p className={`mt-1.5 text-xl font-extrabold tabular-nums ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Orders table */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#07111e]">
          <div className="border-b border-slate-800/50 px-5 py-3.5">
            <h2 className="text-[13px] font-bold text-white">Execution history</h2>
          </div>

          <div className="overflow-x-auto">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ClipboardList size={28} className="mb-3 text-slate-700" />
                <p className="text-sm text-slate-600">No orders yet</p>
                <p className="mt-1 text-[11px] text-slate-700">Orders appear here after submission via the Trading Terminal</p>
                <Link to="/trading" className="mt-3 flex items-center gap-1.5 text-[12px] text-cyan-400 hover:text-cyan-300">
                  <LineChart size={12} /> Open Trading Terminal
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    {["Status", "Symbol", "Side", "Type", "Qty", "Fill Price", "Margin", "Date"].map((h) => (
                      <th key={h} className="px-5 pb-3 pt-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...orders].reverse().map((ord) => {
                    const pd = priceDigits(ord.symbol);
                    return (
                      <tr key={ord.id} className="border-t border-slate-800/40 transition hover:bg-slate-900/20">
                        <td className="px-5 py-3.5">
                          {ord.status === "FILLED"
                            ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                                <CheckCircle2 size={11} /> Filled
                              </span>
                            : <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-300">
                                <XCircle size={11} /> {ord.status}
                              </span>}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-white">{ord.symbol}</td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                            ord.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                          }`}>{ord.side}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">{ord.type}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-300">{number(ord.quantity, 0)}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-300">
                          {ord.averageFillPrice ? number(ord.averageFillPrice, pd) : "—"}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-500">{money(ord.marginRequired)}</td>
                        <td className="px-5 py-3.5 text-[11px] text-slate-600">{dateShort(ord.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[10px] text-slate-700">
          <span>Order history is stored locally — cleared on logout</span>
          <Link to="/trading" className="flex items-center gap-1 text-cyan-500 hover:text-cyan-400">
            Trading Terminal <ChevronRight size={10} />
          </Link>
        </div>
      </main>
    </div>
  );
}
