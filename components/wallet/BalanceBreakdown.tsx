import { memo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { WalletBalance } from "../../store/wallet.store";

interface Props {
  balance: WalletBalance | null;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0]!;
  return (
    <div className="rounded-lg border border-slate-700 bg-[#050a0f] px-3 py-2 text-[11px]">
      <p className="text-slate-400">{name}</p>
      <p className="font-mono font-bold text-white">${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
    </div>
  );
};

export const BalanceBreakdown = memo(function BalanceBreakdown({ balance }: Props) {
  if (!balance) {
    return (
      <div className="flex h-40 items-center justify-center text-[12px] text-slate-600">
        No Data Available
      </div>
    );
  }

  const freeMargin  = Math.max(balance.freeMargin, 0);
  const marginUsed  = Math.max(balance.marginUsed, 0);
  const unrealPnl   = balance.unrealizedPnL;
  const total       = freeMargin + marginUsed + Math.abs(unrealPnl);

  if (total <= 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[12px] text-slate-600">
        No Data Available
      </div>
    );
  }

  const data = [
    { name: "Free Margin",    value: freeMargin,         color: "#06b6d4" },
    { name: "Used Margin",    value: marginUsed,          color: "#f59e0b" },
    { name: "Unrealized P&L", value: Math.abs(unrealPnl), color: unrealPnl >= 0 ? "#34d399" : "#f43f5e" },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} opacity={0.9} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 space-y-2">
        {data.map(({ name, value, color }) => (
          <div key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-[11px] text-slate-500">{name}</span>
            </div>
            <span className="font-mono text-[12px] font-bold text-white">
              ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
        <div className="border-t border-slate-800/40 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Equity</span>
            <span className="font-mono text-[13px] font-bold text-cyan-300">
              ${balance.equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
