/**
 * Institutional PDF Report Generator — v2
 *
 * Generates a fully-formatted, print-optimised HTML report with:
 *  — Inline SVG equity-curve and drawdown charts (no canvas/external libs)
 *  — Monthly P&L heatmap (HTML/CSS grid with intensity colours)
 *  — Trade statistics, symbol breakdown, performance ratios
 *
 * Export modes
 *  downloadAnalyticsPDF(report, label)  → opens new tab → auto-triggers print dialog
 *                                          (user clicks "Save as PDF")
 *  openAnalyticsPDF(report, label)      → opens new tab for review (no auto-print)
 *
 *  downloadStatementPDF(trades)         → trade-statement PDF for ExportButton
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EquityPoint {
  date: string; dailyPnl: number; cumPnl: number; drawdown: number;
}
export interface SymbolStat {
  symbol: string; trades: number; wins: number; losses: number; pnl: number;
  winRate: number; profitFactor: number; avgPnl: number; avgWin: number; avgLoss: number;
}
export interface MonthStat {
  month: string; label: string; pnl: number; trades: number; winRate: number;
}
export interface AnalyticsTrade {
  id: string; symbol: string; side: string; pnl: number; fees: number;
  durationMs: number; openedAt: string; closedAt: string;
  entryPrice: number; exitPrice: number;
}
export interface AnalyticsSummary {
  totalTrades: number; winRate: number; lossRate: number;
  profitFactor: number; expectancy: number;
  totalPnl: number; totalFees: number;
  maxDrawdown: number; maxDrawdownUsd: number;
  sharpeRatio: number; sortinoRatio: number; calmarRatio: number;
  avgWin: number; avgLoss: number;
  bestTrade: number; worstTrade: number;
  avgHoldTimeMs: number;
  dailyPnl: number; weeklyPnl: number; monthlyPnl: number;
  annualizedReturn: number; annualizedVol: number;
  recoveryFactor: number; cagr: number;
}
export interface Report {
  period:           { days: number; from: string; to: string };
  summary:          AnalyticsSummary;
  equityCurve:      EquityPoint[];
  trades:           AnalyticsTrade[];
  symbolBreakdown:  SymbolStat[];
  monthlyBreakdown: MonthStat[];
}

// Statement PDF type (from ExportButton)
export interface TradeRecord {
  id: string; symbol: string; side: "BUY" | "SELL";
  quantity: number; entryPrice: number; exitPrice: number;
  pnl: number; commission: number; swap: number; netPnl: number;
  openedAt: string; closedAt: string; durationMs: number; status: string;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt$(v: number, d = 2): string {
  const abs = Math.abs(v).toFixed(d);
  return `${v < 0 ? "−" : ""}$${abs}`;
}
function fmtPct(v: number, d = 2): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`;
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}
function fmtDur(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)   return `${h}h ${m}m`;
  return `${m}m`;
}
function ratio(v: number): string {
  return v >= 999 ? "∞" : v.toFixed(2);
}

// ─── SVG chart builders ───────────────────────────────────────────────────────

function buildEquitySvg(points: EquityPoint[]): string {
  const W = 680, H = 160;
  const PL = 70, PR = 10, PT = 10, PB = 28;
  const iW = W - PL - PR, iH = H - PT - PB;

  if (points.length < 2) {
    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="11" fill="#94a3b8" font-family="Arial,sans-serif">No closed-trade data for this period</text></svg>`;
  }

  const vals  = points.map((p) => p.cumPnl);
  const minV  = Math.min(...vals, 0);
  const maxV  = Math.max(...vals, 0);
  const range = maxV - minV || 1;

  const toX = (i: number) => PL + (i / (points.length - 1)) * iW;
  const toY = (v: number) => PT + iH - ((v - minV) / range) * iH;

  const linePts  = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(p.cumPnl).toFixed(1)}`).join(" ");
  const finalVal = vals[vals.length - 1] ?? 0;
  const lc       = finalVal >= 0 ? "#06b6d4" : "#f43f5e";
  const zeroY    = toY(0);

  const coords    = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.cumPnl).toFixed(1)}`);
  const firstX    = toX(0).toFixed(1);
  const lastX     = toX(points.length - 1).toFixed(1);
  const areaPath  = `M${firstX},${zeroY.toFixed(1)} ${coords.map((c) => `L${c}`).join(" ")} L${lastX},${zeroY.toFixed(1)} Z`;

  // Y-axis ticks (4)
  const yTicks = [0, 0.33, 0.67, 1].map((f) => {
    const v = minV + f * range;
    const y = toY(v);
    const label = Math.abs(v) >= 1000 ? `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(1)}k` : `${v >= 0 ? "+" : ""}${v.toFixed(0)}`;
    return `<text x="${PL - 5}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="#64748b" font-family="Arial,sans-serif">$${label}</text>
    <line x1="${PL}" y1="${y.toFixed(1)}" x2="${W - PR}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.5"/>`;
  }).join("\n  ");

  // X-axis date labels
  const xPts = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const xLabels = xPts.map((i) => {
    const x = toX(i);
    const d = (points[i]?.date ?? "").slice(0, 10);
    return `<text x="${x.toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="8" fill="#64748b" font-family="Arial,sans-serif">${d}</text>`;
  }).join("\n  ");

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="eq-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${lc}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${lc}" stop-opacity="0.0"/>
    </linearGradient>
    <clipPath id="eq-c"><rect x="${PL}" y="${PT}" width="${iW}" height="${iH}"/></clipPath>
  </defs>
  ${yTicks}
  ${minV < 0 && maxV > 0 ? `<line x1="${PL}" y1="${zeroY.toFixed(1)}" x2="${W - PR}" y2="${zeroY.toFixed(1)}" stroke="#94a3b8" stroke-width="0.75" stroke-dasharray="4 3"/>` : ""}
  <g clip-path="url(#eq-c)">
    <path d="${areaPath}" fill="url(#eq-g)"/>
    <path d="${linePts}" stroke="${lc}" stroke-width="1.5" fill="none"/>
  </g>
  ${xLabels}
</svg>`;
}

function buildDrawdownSvg(points: EquityPoint[]): string {
  const W = 680, H = 110;
  const PL = 52, PR = 10, PT = 8, PB = 22;
  const iW = W - PL - PR, iH = H - PT - PB;

  if (points.length < 2) {
    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="11" fill="#94a3b8" font-family="Arial,sans-serif">No data</text></svg>`;
  }

  // drawdown values are negative (e.g., -5.2 = 5.2% drawdown). Use abs for chart.
  const absDDs  = points.map((p) => Math.abs(p.drawdown));
  const maxAbsDD = Math.max(...absDDs, 0.001);

  // Y: 0 (top = no drawdown) → iH bottom (= max drawdown)
  const toX  = (i: number) => PL + (i / (points.length - 1)) * iW;
  const toY  = (abs: number) => PT + (abs / maxAbsDD) * iH;
  const zeroY = PT;

  const linePts  = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(Math.abs(p.drawdown)).toFixed(1)}`).join(" ");
  const coords   = points.map((p, i) => `${toX(i).toFixed(1)},${toY(Math.abs(p.drawdown)).toFixed(1)}`);
  const firstX   = toX(0).toFixed(1);
  const lastX    = toX(points.length - 1).toFixed(1);
  const areaPath = `M${firstX},${zeroY} ${coords.map((c) => `L${c}`).join(" ")} L${lastX},${zeroY} Z`;

  const halfDD = maxAbsDD / 2;
  const yLabels = [
    { v: 0,        y: PT,         label: "0%" },
    { v: halfDD,   y: PT + iH / 2, label: `${halfDD.toFixed(1)}%` },
    { v: maxAbsDD, y: PT + iH,    label: `${maxAbsDD.toFixed(1)}%` },
  ].map(({ y, label }) =>
    `<text x="${PL - 4}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="#64748b" font-family="Arial,sans-serif">${label}</text>`
  ).join("\n  ");

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dd-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.45"/>
    </linearGradient>
    <clipPath id="dd-c"><rect x="${PL}" y="${PT}" width="${iW}" height="${iH}"/></clipPath>
  </defs>
  <line x1="${PL}" y1="${zeroY}" x2="${W - PR}" y2="${zeroY}" stroke="#cbd5e1" stroke-width="0.75"/>
  <g clip-path="url(#dd-c)">
    <path d="${areaPath}" fill="url(#dd-g)"/>
    <path d="${linePts}" stroke="#f43f5e" stroke-width="1.5" fill="none"/>
  </g>
  ${yLabels}
  <text x="${W - PR}" y="${H - 4}" text-anchor="end" font-size="8.5" fill="#f43f5e" font-family="Arial,sans-serif" font-weight="700">Max: ${maxAbsDD.toFixed(2)}%</text>
</svg>`;
}

// ─── Monthly Heatmap ──────────────────────────────────────────────────────────

function buildMonthlyHeatmap(data: MonthStat[]): string {
  if (data.length === 0) return "<p style=\"color:#94a3b8;font-size:10pt\">No monthly data available.</p>";

  const yearMap = new Map<string, Map<number, MonthStat>>();
  for (const m of data) {
    const [y, mo] = m.month.split("-");
    if (!yearMap.has(y!)) yearMap.set(y!, new Map());
    yearMap.get(y!)!.set(Number(mo) - 1, m);
  }
  const years  = [...yearMap.keys()].sort();
  const maxAbs = Math.max(...data.map((m) => Math.abs(m.pnl)), 1);
  const MONTHS  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const headerCells = MONTHS.map((mn) =>
    `<th style="font-size:7.5pt;font-weight:700;color:#64748b;text-align:center;padding:3px 2px;text-transform:uppercase;letter-spacing:.06em">${mn}</th>`
  ).join("");

  const rows = years.map((yr) => {
    const cells = Array.from({ length: 12 }, (_, mi) => {
      const s = yearMap.get(yr)?.get(mi);
      if (!s) return `<td style="background:#f8fafc;border-radius:3px;height:36px"></td>`;
      const intensity = Math.min(Math.abs(s.pnl) / maxAbs, 1);
      const alpha = (0.14 + intensity * 0.76).toFixed(2);
      const bg    = s.pnl >= 0 ? `rgba(22,163,74,${alpha})` : `rgba(220,38,38,${alpha})`;
      const tc    = s.pnl >= 0 ? "#14532d" : "#7f1d1d";
      const sub   = s.pnl >= 0 ? "#166534" : "#991b1b";
      const shortPnl = Math.abs(s.pnl) >= 1000
        ? `${s.pnl >= 0 ? "+" : "−"}${(Math.abs(s.pnl) / 1000).toFixed(1)}k`
        : `${s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}`;
      return `<td title="${s.label}: $${s.pnl.toFixed(2)} · ${s.trades} trades · ${s.winRate.toFixed(0)}% WR" style="background:${bg};border-radius:3px;text-align:center;padding:3px 2px;height:36px;vertical-align:middle">
        <div style="font-family:'SF Mono',Consolas,monospace;font-size:7.5pt;font-weight:800;color:${tc};line-height:1.1">${shortPnl}</div>
        <div style="font-size:6.5pt;color:${sub};margin-top:1px">${s.winRate.toFixed(0)}%</div>
      </td>`;
    }).join("");
    return `<tr>
      <td style="font-size:8.5pt;font-weight:700;color:#475569;padding-right:10px;white-space:nowrap;vertical-align:middle">${yr}</td>
      ${cells}
    </tr>`;
  }).join("\n");

  return `<table style="width:100%;border-collapse:separate;border-spacing:3px;font-size:8.5pt">
  <thead><tr><th></th>${headerCells}</tr></thead>
  <tbody>${rows}</tbody>
</table>
<div style="margin-top:8px;display:flex;gap:16px;align-items:center">
  <span style="font-size:7pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em">Scale</span>
  ${[
    ["rgba(220,38,38,0.90)", "Large loss"],
    ["rgba(220,38,38,0.20)", "Small loss"],
    ["rgba(248,250,252,1)", "No trades"],
    ["rgba(22,163,74,0.20)", "Small gain"],
    ["rgba(22,163,74,0.90)", "Large gain"],
  ].map(([bg, label]) => `<div style="display:flex;gap:4px;align-items:center"><div style="width:18px;height:10px;border-radius:2px;background:${bg}"></div><span style="font-size:7pt;color:#64748b">${label}</span></div>`).join("")}
</div>`;
}

// ─── PDF CSS ──────────────────────────────────────────────────────────────────

const PDF_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
     background:#fff;color:#0f172a;font-size:10pt;line-height:1.5}
@page{size:A4;margin:16mm 14mm}
@media screen{body{max-width:920px;margin:0 auto;padding:24px;background:#f8fafc}}
@media print{.no-print{display:none!important}}

/* Print-to-PDF bar (screen only) */
.print-bar{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;
  padding:10px 16px;background:#1e293b;color:#fff;border-radius:0 0 8px 8px;margin-bottom:16px}
.print-bar-title{font-size:11pt;font-weight:700;color:#06b6d4}
.print-bar-actions{display:flex;gap:8px}
.btn-print{background:#06b6d4;color:#fff;border:none;border-radius:6px;padding:7px 16px;
  font-size:9.5pt;font-weight:700;cursor:pointer;letter-spacing:.04em}
.btn-close{background:#334155;color:#94a3b8;border:none;border-radius:6px;padding:7px 12px;
  font-size:9.5pt;font-weight:600;cursor:pointer}

/* Cover */
.cover{padding:28px 0 16px;border-bottom:3px solid #0f172a;margin-bottom:18px}
.cover-brand{font-size:7.5pt;font-weight:800;letter-spacing:.22em;color:#06b6d4;text-transform:uppercase}
.cover-title{font-size:20pt;font-weight:800;color:#0f172a;margin:4px 0 2px;letter-spacing:-.01em}
.cover-sub{font-size:9pt;color:#64748b}
.cover-meta{margin-top:10px;display:flex;flex-wrap:wrap;gap:20px;font-size:8.5pt;color:#475569}
.cover-stamp{display:inline-block;border:1.5px solid #06b6d4;color:#06b6d4;font-size:7pt;
  font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:2px 8px;border-radius:4px;margin-top:6px}

/* Section headers */
h2{font-size:8.5pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
   color:#0f172a;margin:20px 0 8px;padding-bottom:4px;border-bottom:1.5px solid #e2e8f0}
h3{font-size:8pt;font-weight:700;color:#64748b;letter-spacing:.1em;text-transform:uppercase;margin:12px 0 5px}

/* KPI grid */
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:12px}
.kpi-grid-5{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:12px}
.kpi{border:1px solid #e2e8f0;border-radius:6px;padding:9px 11px;background:#f8fafc}
.kpi-label{font-size:7pt;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#94a3b8;margin-bottom:2px}
.kpi-value{font-size:13pt;font-weight:800;font-variant-numeric:tabular-nums;font-family:"SF Mono",Consolas,monospace;line-height:1.1}
.kpi-sub{font-size:6.5pt;color:#94a3b8;margin-top:2px}

/* Chart containers */
.chart-box{border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;background:#f8fafc;margin-bottom:10px}
.chart-title{font-size:7.5pt;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#64748b;margin-bottom:8px;
  display:flex;justify-content:space-between;align-items:center}
.chart-title-meta{font-size:7pt;color:#94a3b8;text-transform:none;letter-spacing:normal;font-weight:600}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:12px}
th{text-align:left;font-size:7pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
   color:#64748b;padding:5px 8px;border-bottom:1.5px solid #e2e8f0;background:#f8fafc;white-space:nowrap}
td{padding:4.5px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:last-child td{border-bottom:none}
.mono{font-family:"SF Mono","Fira Code",Consolas,monospace;font-variant-numeric:tabular-nums}

/* Footer */
.footer{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;
        font-size:7.5pt;color:#94a3b8;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px}
.footer-brand{font-weight:700;color:#06b6d4}
.page-break{page-break-before:always}
.no-break{page-break-inside:avoid}
`;

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function buildReportHTML(report: Report, dateRangeLabel: string, autoprint = false): string {
  const { summary, equityCurve, symbolBreakdown, monthlyBreakdown, trades } = report;
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  const pc = (v: number) => v >= 0 ? "#16a34a" : "#dc2626";
  const rc = (v: number) => v >= 1 ? "#16a34a" : "#d97706";

  // Charts
  const equitySvg   = buildEquitySvg(equityCurve);
  const drawdownSvg  = buildDrawdownSvg(equityCurve);
  const heatmapHtml  = buildMonthlyHeatmap(monthlyBreakdown);

  // KPI rows
  const monthRows = [...monthlyBreakdown]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 24)
    .map((m) => `<tr>
      <td>${m.label}</td>
      <td class="mono" style="color:${pc(m.pnl)};font-weight:700">${fmt$(m.pnl)}</td>
      <td>${m.trades}</td>
      <td class="mono" style="color:${m.winRate >= 50 ? "#16a34a" : "#dc2626"}">${m.winRate.toFixed(1)}%</td>
    </tr>`).join("");

  const symRows = [...symbolBreakdown]
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 15)
    .map((s) => `<tr>
      <td class="mono" style="font-weight:700;color:#0891b2">${s.symbol}</td>
      <td>${s.trades}</td>
      <td class="mono" style="color:${s.winRate >= 50 ? "#16a34a" : "#dc2626"}">${s.winRate.toFixed(1)}%</td>
      <td class="mono" style="color:${pc(s.pnl)};font-weight:700">${fmt$(s.pnl)}</td>
      <td class="mono" style="color:${s.profitFactor >= 1 ? "#16a34a" : "#dc2626"}">${ratio(s.profitFactor)}</td>
      <td class="mono" style="color:#16a34a">+${s.avgWin.toFixed(2)}</td>
      <td class="mono" style="color:#dc2626">−${s.avgLoss.toFixed(2)}</td>
    </tr>`).join("");

  const tradeRows = [...trades]
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
    .slice(0, 50)
    .map((t) => `<tr>
      <td class="mono" style="font-weight:700;color:#0891b2">${t.symbol}</td>
      <td style="color:${t.side === "BUY" ? "#16a34a" : "#dc2626"};font-weight:700">${t.side}</td>
      <td class="mono">${Number(t.entryPrice) > 0 ? Number(t.entryPrice).toFixed(5) : "—"}</td>
      <td class="mono">${Number(t.exitPrice)  > 0 ? Number(t.exitPrice).toFixed(5)  : "—"}</td>
      <td class="mono" style="color:${pc(t.pnl)};font-weight:700">${fmt$(t.pnl)}</td>
      <td class="mono" style="color:#94a3b8">${fmt$(t.fees)}</td>
      <td>${fmtDur(t.durationMs)}</td>
      <td style="color:#64748b">${fmtDate(t.closedAt)}</td>
    </tr>`).join("");

  const printBar = autoprint ? "" : `
<div class="print-bar no-print">
  <span class="print-bar-title">IGFXPRO · Analytics Report</span>
  <div class="print-bar-actions">
    <button class="btn-print" onclick="window.print()">Download PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>
</div>`;

  const autoPrintScript = autoprint
    ? `<script>window.addEventListener("load",function(){document.title="IGFXPRO Analytics Report";window.print();})</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>IGFXPRO — Analytics Report</title>
<style>${PDF_CSS}</style>
</head>
<body>

${printBar}

<!-- ── Cover ── -->
<div class="cover">
  <div class="cover-brand">IGFXPRO · Institutional Trading Platform</div>
  <div class="cover-title">Trading Analytics Report</div>
  <div class="cover-sub">${dateRangeLabel}</div>
  <div class="cover-meta">
    <span>Generated: ${generatedAt}</span>
    <span>Period: ${fmtDate(report.period.from)} – ${fmtDate(report.period.to)}</span>
    <span>Closed Trades: ${summary.totalTrades.toLocaleString()}</span>
  </div>
  <div class="cover-stamp">Confidential · Authorised Client Use Only</div>
</div>

<!-- ── Section 1: Performance Summary ── -->
<h2>Performance Summary</h2>
<div class="kpi-grid no-break">
  <div class="kpi"><div class="kpi-label">Net P&amp;L</div><div class="kpi-value" style="color:${pc(summary.totalPnl)}">${fmt$(summary.totalPnl)}</div></div>
  <div class="kpi"><div class="kpi-label">Win Rate</div><div class="kpi-value" style="color:${summary.winRate >= 50 ? "#16a34a" : "#dc2626"}">${summary.winRate.toFixed(1)}%</div><div class="kpi-sub">${summary.totalTrades} closed trades</div></div>
  <div class="kpi"><div class="kpi-label">Profit Factor</div><div class="kpi-value" style="color:${rc(summary.profitFactor)}">${ratio(summary.profitFactor)}</div></div>
  <div class="kpi"><div class="kpi-label">Expectancy</div><div class="kpi-value" style="color:${pc(summary.expectancy)}">${fmt$(summary.expectancy)}</div><div class="kpi-sub">per trade</div></div>
  <div class="kpi"><div class="kpi-label">Max Drawdown</div><div class="kpi-value" style="color:#dc2626">${summary.maxDrawdown.toFixed(2)}%</div><div class="kpi-sub">${fmt$(summary.maxDrawdownUsd, 0)} USD</div></div>
  <div class="kpi"><div class="kpi-label">Best Trade</div><div class="kpi-value" style="color:#16a34a">+${fmt$(summary.bestTrade)}</div></div>
  <div class="kpi"><div class="kpi-label">Worst Trade</div><div class="kpi-value" style="color:#dc2626">${fmt$(summary.worstTrade)}</div></div>
  <div class="kpi"><div class="kpi-label">CAGR</div><div class="kpi-value" style="color:${pc(summary.cagr)}">${summary.cagr !== 0 ? fmtPct(summary.cagr, 1) : "N/A"}</div><div class="kpi-sub">compound annual</div></div>
</div>

<!-- ── Section 2: Performance Ratios ── -->
<h2>Performance Ratios</h2>
<div class="kpi-grid-5 no-break">
  <div class="kpi"><div class="kpi-label">Sharpe Ratio</div><div class="kpi-value" style="color:${rc(summary.sharpeRatio)}">${summary.sharpeRatio.toFixed(2)}</div><div class="kpi-sub">252-annualised</div></div>
  <div class="kpi"><div class="kpi-label">Sortino Ratio</div><div class="kpi-value" style="color:${rc(summary.sortinoRatio)}">${ratio(summary.sortinoRatio)}</div><div class="kpi-sub">downside deviation</div></div>
  <div class="kpi"><div class="kpi-label">Calmar Ratio</div><div class="kpi-value" style="color:${rc(summary.calmarRatio)}">${summary.calmarRatio.toFixed(2)}</div><div class="kpi-sub">ann. ret ÷ max DD</div></div>
  <div class="kpi"><div class="kpi-label">Recovery Factor</div><div class="kpi-value" style="color:${rc(summary.recoveryFactor)}">${summary.recoveryFactor.toFixed(2)}</div><div class="kpi-sub">P&amp;L ÷ max DD $</div></div>
  <div class="kpi"><div class="kpi-label">Ann. Volatility</div><div class="kpi-value" style="color:#d97706">${fmt$(summary.annualizedVol, 0)}</div><div class="kpi-sub">daily σ × √252</div></div>
</div>

<div class="kpi-grid no-break">
  <div class="kpi"><div class="kpi-label">Avg Win</div><div class="kpi-value" style="color:#16a34a;font-size:11pt">+${fmt$(summary.avgWin)}</div></div>
  <div class="kpi"><div class="kpi-label">Avg Loss</div><div class="kpi-value" style="color:#dc2626;font-size:11pt">−${fmt$(summary.avgLoss)}</div></div>
  <div class="kpi"><div class="kpi-label">Total Fees</div><div class="kpi-value" style="color:#d97706;font-size:11pt">${fmt$(summary.totalFees)}</div></div>
  <div class="kpi"><div class="kpi-label">Avg Hold Time</div><div class="kpi-value" style="font-size:11pt">${fmtDur(summary.avgHoldTimeMs)}</div></div>
</div>

<!-- ── Section 3: Equity Curve ── -->
<div class="page-break"></div>
<h2>Equity Curve</h2>
<div class="chart-box no-break">
  <div class="chart-title">
    <span>Cumulative P&amp;L — ${dateRangeLabel}</span>
    <span class="chart-title-meta">Net of fees · Closed trades only</span>
  </div>
  ${equitySvg}
</div>

<!-- ── Section 4: Drawdown Curve ── -->
<h2>Drawdown Curve</h2>
<div class="chart-box no-break">
  <div class="chart-title">
    <span>Peak-to-Trough Drawdown</span>
    <span class="chart-title-meta">Max: ${summary.maxDrawdown.toFixed(2)}% · Recovery Factor: ${summary.recoveryFactor.toFixed(2)}×</span>
  </div>
  ${drawdownSvg}
</div>

<!-- ── Section 5: Monthly Heatmap ── -->
${monthlyBreakdown.length > 0 ? `
<h2>Monthly Return Heatmap</h2>
<div class="chart-box no-break">
  <div class="chart-title">Monthly P&amp;L · Win Rate</div>
  ${heatmapHtml}
</div>` : ""}

<!-- ── Section 6: Trade Statistics ── -->
<div class="page-break"></div>
<h2>Trade Statistics</h2>
${symbolBreakdown.length > 0 ? `
<h3>Symbol Breakdown</h3>
<table class="no-break">
  <thead>
    <tr><th>Symbol</th><th>Trades</th><th>Win %</th><th>P&amp;L</th><th>Profit Factor</th><th>Avg Win</th><th>Avg Loss</th></tr>
  </thead>
  <tbody>${symRows}</tbody>
</table>` : ""}

${monthlyBreakdown.length > 0 ? `
<h3>Monthly Performance</h3>
<table class="no-break">
  <thead><tr><th>Month</th><th>P&amp;L</th><th>Trades</th><th>Win Rate</th></tr></thead>
  <tbody>${monthRows}</tbody>
</table>` : ""}

<!-- ── Section 7: Portfolio Metrics ── -->
<h2>Portfolio Metrics</h2>
<div class="kpi-grid no-break">
  <div class="kpi"><div class="kpi-label">Annualised Return</div><div class="kpi-value" style="color:${pc(summary.annualizedReturn)}">${summary.annualizedReturn !== 0 ? fmt$(summary.annualizedReturn, 0) : "N/A"}</div><div class="kpi-sub">projected</div></div>
  <div class="kpi"><div class="kpi-label">Daily P&amp;L</div><div class="kpi-value" style="color:${pc(summary.dailyPnl)};font-size:11pt">${fmt$(summary.dailyPnl)}</div></div>
  <div class="kpi"><div class="kpi-label">Weekly P&amp;L</div><div class="kpi-value" style="color:${pc(summary.weeklyPnl)};font-size:11pt">${fmt$(summary.weeklyPnl)}</div></div>
  <div class="kpi"><div class="kpi-label">Monthly P&amp;L</div><div class="kpi-value" style="color:${pc(summary.monthlyPnl)};font-size:11pt">${fmt$(summary.monthlyPnl)}</div></div>
</div>

<!-- ── Trade History ── -->
${trades.length > 0 ? `
<div class="page-break"></div>
<h2>Trade History (last ${Math.min(trades.length, 50)} trades)</h2>
<table>
  <thead>
    <tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>P&amp;L</th><th>Fees</th><th>Duration</th><th>Closed</th></tr>
  </thead>
  <tbody>${tradeRows}</tbody>
</table>` : ""}

<!-- ── Footer ── -->
<div class="footer">
  <span><span class="footer-brand">IGFXPRO</span> · Confidential — For authorised client use only · Not financial advice</span>
  <span>Report generated ${generatedAt}</span>
</div>

${autoPrintScript}
</body>
</html>`;
}

// ─── Public export functions ──────────────────────────────────────────────────

function openInTab(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (!win) {
    // Popup blocked — fall back to direct download
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `igfxpro_report_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 8_000);
}

/** Opens report in a new tab then auto-triggers the browser Print → Save as PDF dialog */
export function downloadAnalyticsPDF(report: Report, dateRangeLabel: string): void {
  openInTab(buildReportHTML(report, dateRangeLabel, true));
}

/** Opens report in a new tab for review — no auto-print, user can print manually */
export function openAnalyticsPDF(report: Report, dateRangeLabel: string): void {
  openInTab(buildReportHTML(report, dateRangeLabel, false));
}

// ─── Statement PDF (for ExportButton / trade history page) ───────────────────

export function buildStatementHTML(trades: TradeRecord[]): string {
  const today = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  if (trades.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>IGFXPRO Statement</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;color:#0f172a}</style></head>
      <body><h2>No trades found for the selected period.</h2></body></html>`;
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
  );

  const totalGross  = sorted.reduce((s, t) => s + t.pnl, 0);
  const totalNet    = sorted.reduce((s, t) => s + t.netPnl, 0);
  const totalFees   = sorted.reduce((s, t) => s + t.commission, 0);
  const totalSwap   = sorted.reduce((s, t) => s + t.swap, 0);
  const wins        = sorted.filter((t) => t.pnl > 0).length;
  const winRate     = sorted.length > 0 ? (wins / sorted.length) * 100 : 0;

  const pc = (v: number) => v >= 0 ? "#16a34a" : "#dc2626";

  const tradeRows = sorted.map((t) => {
    const dur = fmtDur(t.durationMs);
    const openDt = (() => { try { return new Date(t.openedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); } catch{ return t.openedAt; } })();
    const closeDt = (() => { try { return new Date(t.closedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); } catch{ return t.closedAt; } })();
    return `<tr>
      <td style="font-family:monospace;color:#0891b2;font-weight:700">${t.symbol}</td>
      <td style="color:${t.side === "BUY" ? "#16a34a" : "#dc2626"};font-weight:700">${t.side}</td>
      <td style="font-family:monospace">${t.quantity.toFixed(2)}</td>
      <td style="font-family:monospace">${Number(t.entryPrice) > 0 ? Number(t.entryPrice).toFixed(5) : "—"}</td>
      <td style="font-family:monospace">${Number(t.exitPrice)  > 0 ? Number(t.exitPrice).toFixed(5)  : "—"}</td>
      <td style="font-family:monospace;color:${pc(t.pnl)};font-weight:700">${fmt$(t.pnl)}</td>
      <td style="font-family:monospace;color:#d97706">${fmt$(t.commission)}</td>
      <td style="font-family:monospace;color:${pc(t.netPnl)};font-weight:700">${fmt$(t.netPnl)}</td>
      <td>${dur}</td>
      <td style="color:#64748b">${openDt}</td>
      <td style="color:#64748b">${closeDt}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>IGFXPRO Trade Statement</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#fff;color:#0f172a;font-size:9.5pt;line-height:1.5}
@page{size:A4 landscape;margin:14mm 12mm}
@media screen{body{max-width:1100px;margin:0 auto;padding:20px;background:#f8fafc}}
@media print{.no-print{display:none!important}}
.print-bar{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;
  padding:9px 14px;background:#1e293b;color:#fff;border-radius:0 0 8px 8px;margin-bottom:14px}
.btn-print{background:#06b6d4;color:#fff;border:none;border-radius:5px;padding:6px 14px;font-size:9pt;font-weight:700;cursor:pointer}
.cover{padding:20px 0 12px;border-bottom:2.5px solid #0f172a;margin-bottom:14px}
.brand{font-size:7pt;font-weight:800;letter-spacing:.22em;color:#06b6d4;text-transform:uppercase}
h1{font-size:17pt;font-weight:800;margin:3px 0;letter-spacing:-.01em}
.meta{margin-top:8px;display:flex;flex-wrap:wrap;gap:16px;font-size:8pt;color:#475569}
.summary{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:12px 0}
.scard{border:1px solid #e2e8f0;border-radius:5px;padding:8px 10px;background:#f8fafc}
.sl{font-size:6.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8;margin-bottom:2px}
.sv{font-size:12pt;font-weight:800;font-family:'SF Mono',Consolas,monospace;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;font-size:8pt}
th{text-align:left;font-size:6.5pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
   color:#64748b;padding:5px 6px;border-bottom:1.5px solid #e2e8f0;white-space:nowrap;background:#f8fafc}
td{padding:4px 6px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:last-child td{border-bottom:none}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:7pt;color:#94a3b8;
  display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px}
</style>
</head>
<body>

<div class="print-bar no-print">
  <span style="font-size:10pt;font-weight:700;color:#06b6d4">IGFXPRO · Trade Statement</span>
  <button class="btn-print" onclick="window.print()">Download PDF</button>
</div>

<div class="cover">
  <div class="brand">IGFXPRO · Institutional Trading Platform</div>
  <h1>Trade Statement</h1>
  <div class="meta">
    <span>Generated: ${today}</span>
    <span>Total trades: ${sorted.length}</span>
  </div>
</div>

<div class="summary">
  <div class="scard"><div class="sl">Gross P&amp;L</div><div class="sv" style="color:${pc(totalGross)}">${fmt$(totalGross)}</div></div>
  <div class="scard"><div class="sl">Net P&amp;L</div><div class="sv" style="color:${pc(totalNet)}">${fmt$(totalNet)}</div></div>
  <div class="scard"><div class="sl">Total Fees</div><div class="sv" style="color:#d97706">${fmt$(totalFees)}</div></div>
  <div class="scard"><div class="sl">Total Swap</div><div class="sv" style="color:#d97706">${fmt$(totalSwap)}</div></div>
  <div class="scard"><div class="sl">Win Rate</div><div class="sv" style="color:${winRate >= 50 ? "#16a34a" : "#dc2626"}">${winRate.toFixed(1)}%</div></div>
  <div class="scard"><div class="sl">Trade Count</div><div class="sv">${sorted.length}</div></div>
</div>

<table>
  <thead>
    <tr>
      <th>Symbol</th><th>Side</th><th>Volume</th><th>Entry</th><th>Exit</th>
      <th>Gross P&amp;L</th><th>Commission</th><th>Net P&amp;L</th>
      <th>Duration</th><th>Opened</th><th>Closed</th>
    </tr>
  </thead>
  <tbody>${tradeRows}</tbody>
</table>

<div class="footer">
  <span><strong style="color:#06b6d4">IGFXPRO</strong> · Confidential — For authorised client use only</span>
  <span>Statement generated ${today}</span>
</div>

</body>
</html>`;
}

/** Downloads a trade statement as HTML (user opens and prints to PDF) */
export function downloadStatementPDF(trades: TradeRecord[]): void {
  const html = buildStatementHTML(trades);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `igfxpro_statement_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
