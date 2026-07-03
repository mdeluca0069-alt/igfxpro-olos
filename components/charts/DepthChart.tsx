import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TradingAPI } from "../../api/endpoints/trading";
import type { LiquidityBook } from "../../shared/types/trading";

export interface DepthChartProps {
  symbol?: string;
  book?: LiquidityBook;
  className?: string;
}

export function DepthChart({ symbol = "EURUSD", book, className = "" }: DepthChartProps) {
  const query = useQuery({
    queryKey: ["liquidity-depth", symbol],
    queryFn: () => TradingAPI.getLiquidityBook(symbol),
    refetchInterval: 1000,
    enabled: !book,
  });
  const activeBook = book ?? query.data;
  const data = useMemo(() => {
    if (!activeBook) return [];
    return activeBook.bids.map((bid, index) => ({
      level: `${index + 1}`,
      bid: bid.cumulativeVolume,
      ask: activeBook.asks[index]?.cumulativeVolume ?? 0,
    }));
  }, [activeBook]);

  return (
    <section className={["rounded-lg border border-slate-800 bg-slate-950/82 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)]", className].filter(Boolean).join(" ")}>
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Market depth</p>
        <h3 className="mt-1 text-sm font-semibold text-white">Profondita {symbol}</h3>
      </div>
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="level" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8 }} />
            <Bar dataKey="bid" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ask" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default DepthChart;
