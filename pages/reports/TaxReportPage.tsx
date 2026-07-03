/**
 * Tax Report — IGFX OLOS Annual P&L Reporting
 * Country-specific realized gains/losses, CSV & JSON export.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, ChevronDown, TrendingUp,
  Globe, Calendar, BarChart3, CheckCircle2, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Info, Table, Filter,
} from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { money2 } from "../../shared/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaxCountry = "IT" | "DE" | "UK" | "US" | "FR" | "ES" | "NL" | "CH" | "OTHER";

type TaxableTrade = {
  tradeId: string; symbol: string; assetClass: string;
  direction: "BUY" | "SELL"; quantity: number;
  openDate: string; closeDate: string;
  entryPrice: number; exitPrice: number;
  realizedPnl: number; commission: number; swap: number; netPnl: number;
  holdingDays: number; isLongTerm: boolean; washSale: boolean;
};

type TaxReport = {
  userId: string; year: number; country: TaxCountry;
  totalTrades: number; profitableTrades: number; losingTrades: number;
  totalGross: number; totalCommission: number; totalSwap: number;
  netRealizedPnl: number; shortTermGains: number; longTermGains: number;
  taxableAmount: number; estimatedTax: number;
  currency: string; generatedAt: string; trades: TaxableTrade[];
};

// ─── Country info ─────────────────────────────────────────────────────────────

const COUNTRIES: { code: TaxCountry; label: string; flag: string; taxName: string; rate: string }[] = [
  { code: "IT", label: "Italy",          flag: "🇮🇹", taxName: "Imposta sostitutiva", rate: "26%" },
  { code: "DE", label: "Germany",        flag: "🇩🇪", taxName: "Abgeltungsteuer",     rate: "25%" },
  { code: "UK", label: "United Kingdom", flag: "🇬🇧", taxName: "Capital Gains Tax",   rate: "20%" },
  { code: "US", label: "United States",  flag: "🇺🇸", taxName: "Capital Gains Tax",   rate: "20%" },
  { code: "FR", label: "France",         flag: "🇫🇷", taxName: "Flat tax (PFU)",      rate: "30%" },
  { code: "ES", label: "Spain",          flag: "🇪🇸", taxName: "IRPF ganancias",      rate: "23%" },
  { code: "NL", label: "Netherlands",    flag: "🇳🇱", taxName: "Box 3",               rate: "31%" },
  { code: "CH", label: "Switzerland",    flag: "🇨🇭", taxName: "Kapitalgewinne",      rate: "0%" },
  { code: "OTHER", label: "Other",       flag: "🌍", taxName: "Est. flat rate",       rate: "20%" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, positive, icon: Icon }: {
  label: string; value: string; sub?: string;
  positive?: boolean; icon: React.ElementType;
}) {
  const color = positive === undefined ? "#00d4ff" : positive ? "#00ff9f" : "#ff4a4a";
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} style={{ color }} />
        <span className="text-[10px] font-data text-white/30 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-xl font-display font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

function TradeRow({ t }: { t: TaxableTrade }) {
  const pos = t.netPnl >= 0;
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
      <td className="py-2.5 px-3 font-data text-xs text-white/50">{t.tradeId.slice(0, 12)}…</td>
      <td className="py-2.5 px-3 font-display text-xs font-semibold text-white/90">{t.symbol}</td>
      <td className="py-2.5 px-3 text-xs">
        <span className={`font-data text-[10px] px-1.5 py-0.5 rounded ${t.direction === "BUY" ? "bg-[#00ff9f]/10 text-[#00ff9f]" : "bg-[#ff4a4a]/10 text-[#ff4a4a]"}`}>
          {t.direction}
        </span>
      </td>
      <td className="py-2.5 px-3 font-data text-xs text-white/50">{t.quantity.toFixed(4)}</td>
      <td className="py-2.5 px-3 font-data text-xs text-white/40">{t.openDate.slice(0, 10)}</td>
      <td className="py-2.5 px-3 font-data text-xs text-white/40">{t.closeDate.slice(0, 10)}</td>
      <td className="py-2.5 px-3 font-data text-xs text-white/60">{t.entryPrice.toFixed(5)}</td>
      <td className="py-2.5 px-3 font-data text-xs text-white/60">{t.exitPrice.toFixed(5)}</td>
      <td className="py-2.5 px-3 font-data text-xs font-bold" style={{ color: pos ? "#00ff9f" : "#ff4a4a" }}>
        {pos ? "+" : ""}{money2(t.netPnl)}
      </td>
      <td className="py-2.5 px-3 text-xs">
        {t.washSale && <span className="px-1.5 py-0.5 rounded bg-[#ff9f00]/10 text-[#ff9f00] text-[9px] font-data">WASH</span>}
        {t.isLongTerm && <span className="px-1.5 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff] text-[9px] font-data ml-1">LT</span>}
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaxReportPage() {
  const currentYear = new Date().getFullYear();
  const [year,    setYear]    = useState(currentYear - 1);
  const [country, setCountry] = useState<TaxCountry>("IT");
  const [showTrades, setShowTrades] = useState(false);
  const [filterSymbol, setFilterSymbol] = useState("");

  const { data: years = [] } = useQuery<number[]>({
    queryKey: ["tax", "years"],
    queryFn: () => apiGet("/api/v1/tax/years").then((r: any) => r.years ?? [currentYear - 1, currentYear]),
  });

  const { data: report, isLoading } = useQuery<TaxReport>({
    queryKey: ["tax", "report", year, country],
    queryFn:  () => apiGet(`/api/v1/tax/report?year=${year}&country=${country}`).then((r: any) => r.report),
  });

  const selectedCountry = COUNTRIES.find(c => c.code === country)!;
  const netPos  = (report?.netRealizedPnl ?? 0) >= 0;
  const taxPos  = (report?.estimatedTax ?? 0) > 0;

  const filteredTrades = (report?.trades ?? []).filter(t =>
    !filterSymbol || t.symbol.toUpperCase().includes(filterSymbol.toUpperCase())
  );

  const downloadCsv = () => {
    window.open(`/api/v1/tax/export?year=${year}&country=${country}&format=csv`, "_blank");
  };
  const downloadJson = () => {
    window.open(`/api/v1/tax/export?year=${year}&country=${country}&format=json`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#000] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
            <FileText size={20} style={{ color: "#00d4ff" }} />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Tax Report</h1>
            <p className="text-xs text-white/40">Annual realized P&L · Country-specific tax estimates</p>
          </div>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            <button onClick={downloadCsv}
              className="flex items-center gap-2 px-4 py-2 text-sm font-display rounded-xl border border-white/10 text-white/50 hover:border-[#00d4ff]/30 hover:text-[#00d4ff] transition-all">
              <Download size={14} /> CSV
            </button>
            <button onClick={downloadJson}
              className="flex items-center gap-2 px-4 py-2 text-sm font-display rounded-xl border border-white/10 text-white/50 hover:border-[#00d4ff]/30 hover:text-[#00d4ff] transition-all">
              <Download size={14} /> JSON
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Year selector */}
        <div className="flex items-center gap-2 glass-panel rounded-xl px-4 py-2">
          <Calendar size={14} style={{ color: "#00d4ff" }} />
          <span className="text-xs text-white/40 font-data mr-1">Year</span>
          <select
            className="bg-transparent text-sm font-display text-white outline-none cursor-pointer"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
          >
            {(years.length > 0 ? years : [currentYear - 1, currentYear]).map(y => (
              <option key={y} value={y} className="bg-[#050c14]">{y}</option>
            ))}
          </select>
        </div>

        {/* Country selector */}
        <div className="flex items-center gap-2 glass-panel rounded-xl px-4 py-2">
          <Globe size={14} style={{ color: "#00d4ff" }} />
          <span className="text-xs text-white/40 font-data mr-1">Country</span>
          <select
            className="bg-transparent text-sm font-display text-white outline-none cursor-pointer"
            value={country}
            onChange={e => setCountry(e.target.value as TaxCountry)}
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code} className="bg-[#050c14]">{c.flag} {c.label}</option>
            ))}
          </select>
        </div>

        {/* Selected country info */}
        <div className="flex items-center gap-2 rounded-xl border border-white/5 px-4 py-2">
          <span className="text-lg">{selectedCountry.flag}</span>
          <div className="text-xs">
            <div className="font-display text-white/60">{selectedCountry.taxName}</div>
            <div className="font-data text-[#00d4ff]">{selectedCountry.rate} rate</div>
          </div>
        </div>
      </div>

      {/* Loading / error */}
      {isLoading && (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-sm text-[#00d4ff] font-data">COMPUTING TAX REPORT...</motion.div>
        </div>
      )}

      {/* Report */}
      {report && !isLoading && (
        <>
          {/* Summary grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <SummaryCard label="Total Trades"      value={report.totalTrades.toString()} icon={BarChart3} />
            <SummaryCard label="Win Rate"          value={`${report.totalTrades > 0 ? Math.round((report.profitableTrades / report.totalTrades) * 100) : 0}%`}
              positive={report.profitableTrades >= report.losingTrades} icon={TrendingUp} />
            <SummaryCard label="Gross P&L"         value={money2(report.totalGross)} positive={report.totalGross >= 0} icon={TrendingUp} />
            <SummaryCard label="Net Realized P&L"  value={money2(report.netRealizedPnl)} positive={netPos} icon={netPos ? ArrowUpRight : ArrowDownRight} />
            <SummaryCard label="Taxable Amount"    value={money2(report.taxableAmount)} positive={report.taxableAmount === 0} icon={FileText} />
            <SummaryCard label={`Est. Tax (${selectedCountry.rate})`} value={money2(report.estimatedTax)}
              positive={!taxPos} icon={AlertTriangle} />
          </div>

          {/* Breakdown bar */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} style={{ color: "#00d4ff" }} />
              <span className="text-xs font-data text-white/40 uppercase tracking-widest">P&L Breakdown</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-data text-white/40">
                  <span>Short-Term Gains</span>
                  <span className={report.shortTermGains >= 0 ? "text-[#00ff9f]" : "text-[#ff4a4a]"}>{money2(report.shortTermGains)}</span>
                </div>
                <div className="flex justify-between text-xs font-data text-white/40">
                  <span>Long-Term Gains</span>
                  <span className={report.longTermGains >= 0 ? "text-[#00d4ff]" : "text-[#ff4a4a]"}>{money2(report.longTermGains)}</span>
                </div>
                <div className="flex justify-between text-xs font-data text-white/40">
                  <span>Total Commission</span>
                  <span className="text-[#ff9f00]">-{money2(report.totalCommission)}</span>
                </div>
                <div className="flex justify-between text-xs font-data text-white/40">
                  <span>Total Swap</span>
                  <span className="text-white/50">{money2(report.totalSwap)}</span>
                </div>
              </div>

              {/* Visual bar */}
              <div className="md:col-span-2">
                {report.netRealizedPnl !== 0 && (
                  <div className="space-y-2">
                    {[
                      { label: "Profitable trades", val: report.profitableTrades, total: report.totalTrades, color: "#00ff9f" },
                      { label: "Losing trades",     val: report.losingTrades,     total: report.totalTrades, color: "#ff4a4a" },
                    ].map(({ label, val, total, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[10px] font-data text-white/30 mb-1">
                          <span>{label}</span>
                          <span>{val} / {total}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${total > 0 ? (val / total) * 100 : 0}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ background: color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {country === "CH" && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-[#00ff9f]/5 border border-[#00ff9f]/10">
                <CheckCircle2 size={14} style={{ color: "#00ff9f" }} className="mt-0.5 shrink-0" />
                <p className="text-xs text-[#00ff9f]/80">Capital gains from private securities trading are tax-free in Switzerland. No tax is due on this P&L.</p>
              </div>
            )}
          </div>

          {/* Trade table */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <button
                onClick={() => setShowTrades(!showTrades)}
                className="flex items-center gap-2 text-xs font-data text-white/40 uppercase tracking-widest hover:text-white/60 transition-colors"
              >
                <Table size={13} />
                {showTrades ? "Hide" : "Show"} Trade Detail
                <ChevronDown size={12} className={`transition-transform ${showTrades ? "rotate-180" : ""}`} />
              </button>
              {showTrades && (
                <div className="flex items-center gap-2">
                  <Filter size={12} style={{ color: "#00d4ff" }} />
                  <input
                    className="bg-transparent border-none outline-none text-xs font-data text-white/60 placeholder-white/20 w-24"
                    placeholder="Filter symbol"
                    value={filterSymbol}
                    onChange={e => setFilterSymbol(e.target.value)}
                  />
                </div>
              )}
            </div>

            <AnimatePresence>
              {showTrades && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          {["Trade ID", "Symbol", "Dir", "Qty", "Open", "Close", "Entry", "Exit", "Net P&L", "Flags"].map(h => (
                            <th key={h} className="px-3 py-2 text-[10px] font-data text-white/20 uppercase tracking-widest font-normal">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTrades.length === 0 ? (
                          <tr><td colSpan={10} className="px-3 py-8 text-center text-white/20 text-sm">No trades match filter</td></tr>
                        ) : filteredTrades.map(t => <TradeRow key={t.tradeId} t={t} />)}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-3 py-2 border-t border-white/5 text-[10px] text-white/20 font-data">
                    {filteredTrades.length} trades · LT = Long-Term (&gt;365 days) · WASH = US Wash Sale Rule
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-white/5">
            <Info size={14} style={{ color: "#ff9f00" }} className="mt-0.5 shrink-0" />
            <p className="text-xs text-white/30 leading-relaxed">
              Tax estimates are for informational purposes only and do not constitute professional tax advice.
              IGFX OLOS does not guarantee accuracy for your specific tax jurisdiction. Consult a qualified tax advisor
              before filing. Tax regulations vary by country and individual circumstances.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
