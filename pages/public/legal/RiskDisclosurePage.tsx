import PublicLayout from "../../../components/public/PublicLayout";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const SECTIONS = [
  {
    id: "1", title: "1. Introduction and Scope",
    body: `This Risk Disclosure Statement ("Statement") is provided by IGFX Global Ltd ("IGFXPRO", "we", "us") in accordance with the requirements of Directive 2014/65/EU (MiFID II) and Commission Delegated Regulation (EU) 2017/565. This Statement applies to all financial instruments offered through the IGFXPRO platform, including Contracts for Difference (CFDs) on foreign exchange, equity indices, commodities, cryptocurrencies, and individual equities.

Before opening an account or placing any trade, you must read this Statement carefully. By proceeding, you acknowledge that you understand the risks described herein and that you accept them. This Statement does not disclose every risk associated with trading — it highlights the most significant risks that you must be aware of.

If you do not fully understand the risks set out herein, you should seek independent financial advice before proceeding.`,
  },
  {
    id: "2", title: "2. Nature of CFDs",
    body: `A Contract for Difference (CFD) is a derivative product that allows you to speculate on price movements of underlying assets without owning those assets. When you buy a CFD, you agree to exchange the difference in price of an underlying asset between when the contract opens and when it closes.

Key characteristics of CFDs:
• CFDs are leveraged instruments — small price movements can result in large profits or losses relative to your deposit.
• You do not acquire ownership of the underlying asset. CFD positions do not entitle you to voting rights, physical delivery, or custody of the underlying asset.
• CFDs may expire or have rollover costs if held beyond specific dates (for futures-based CFDs).
• CFD trading involves paying or receiving overnight financing charges ("swaps") for positions held past 22:00 UTC.
• The value of a CFD position can fall to zero, resulting in a total loss of all funds allocated to that position.`,
  },
  {
    id: "3", title: "3. Leverage and Margin Risk",
    body: `IGFXPRO offers leveraged trading. Leverage amplifies both gains and losses. For retail clients, IGFXPRO applies ESMA-mandated leverage limits:

• Foreign Exchange — Major Pairs: 30:1 (margin requirement: 3.33%)
• Foreign Exchange — Minor/Exotic Pairs: 20:1 (margin requirement: 5.00%)
• Major Stock Indices: 20:1 (margin requirement: 5.00%)
• Commodities (excluding gold): 10:1 (margin requirement: 10.00%)
• Gold: 20:1 (margin requirement: 5.00%)
• Individual Equities: 5:1 (margin requirement: 20.00%)
• Cryptocurrencies: 2:1 (margin requirement: 50.00%)

Example of leverage risk: If you deposit €1,000 and trade EUR/USD at 30:1 leverage, your notional exposure is €30,000. A 1% adverse move in EUR/USD would result in a €300 loss — 30% of your entire deposit.

Margin Call: When your account equity falls below 100% of required margin, IGFXPRO will issue a margin call notification. You must either deposit additional funds or reduce your exposure.

Stop-Out Level: When your account equity falls to 50% of required margin, IGFXPRO's automated risk engine will begin closing your positions, starting with the largest losing position, until your margin usage returns to an acceptable level.`,
  },
  {
    id: "4", title: "4. Negative Balance Protection",
    body: `IGFXPRO provides negative balance protection to all retail clients as required under ESMA regulations. This means that your total losses on CFD positions cannot exceed your total deposited funds. You will not owe IGFXPRO any money beyond your account balance under any circumstances.

However, this protection does not reduce the risk of losing 100% of your deposited funds. In fast-moving markets (including after significant economic announcements, political events, or during cryptocurrency market hours), prices may gap significantly, and stop-loss orders may not execute at the specified level. Negative balance protection acts as a backstop only.

Note: Negative balance protection applies to retail clients only. Elective professional clients are not covered by this protection.`,
  },
  {
    id: "5", title: "5. Market Risk",
    body: `All financial instruments offered by IGFXPRO are subject to market risk — the risk of losses arising from adverse movements in market prices. Market risk includes but is not limited to:

Foreign Exchange Risk: Currency pairs are affected by interest rate differentials, central bank policy, economic data releases (GDP, CPI, NFP, etc.), geopolitical events, and market sentiment. EUR/USD alone can move 100–200 pips in a single day during high-impact events.

Equity Index Risk: Stock indices reflect the aggregate performance of constituent companies. Index values are influenced by corporate earnings, monetary policy, economic cycles, and systemic events such as financial crises.

Commodity Risk: Commodities are subject to supply/demand imbalances, weather events, geopolitical conflicts (particularly for energy), production decisions by cartels (OPEC), and currency fluctuations.

Cryptocurrency Risk: Cryptocurrencies exhibit extreme volatility. Daily price movements of 10–30% are not uncommon. The cryptocurrency market operates 24/7, including periods of very low liquidity. Regulatory changes can cause sharp, sustained price moves.

Equity CFD Risk: Individual stocks can move 20–50% following earnings announcements, M&A activity, regulatory actions, or management changes.`,
  },
  {
    id: "6", title: "6. Liquidity Risk",
    body: `Under certain market conditions, it may be difficult or impossible to execute an order at a specified price. Liquidity risk is heightened:

• During and immediately after major economic announcements (Non-Farm Payrolls, central bank rate decisions, CPI releases)
• At market open and close, particularly for equity CFDs
• During overnight and weekend periods, especially for cryptocurrency CFDs
• During major geopolitical events (elections, referendums, military conflicts)
• When trading instruments with inherently lower liquidity (exotic FX pairs, small-cap equity CFDs)

In illiquid conditions, your stop-loss orders may be executed at significantly worse prices than specified ("slippage"). Slippage can work in your favour or against you. IGFXPRO provides slippage analytics in the trading terminal for all executed orders.`,
  },
  {
    id: "7", title: "7. Execution Risk and Technological Risk",
    body: `IGFXPRO strives to provide sub-5ms order execution through the OLOS matching engine. However, execution is not guaranteed at any specific price or time. Technological risks include:

System Outages: Hardware failures, software bugs, or infrastructure incidents may temporarily prevent order execution, position management, or account access.

Internet Connectivity: Orders placed via the internet are subject to transmission delays and interruptions. You should have alternative means of contacting IGFXPRO (telephone) in the event of platform unavailability.

Third-Party Data Feeds: IGFXPRO sources market data from third-party providers. Data errors or delays at the source may affect the prices displayed in the platform.

Algorithm and Autopilot Risk: If you use IGFXPRO's Autopilot feature (OLOS AI-driven automated trading), you are subject to algorithm risk — the risk that automated logic produces unintended behaviour during abnormal market conditions. You retain full responsibility for all trades executed under your account, including those generated by Autopilot.`,
  },
  {
    id: "8", title: "8. Counterparty and Regulatory Risk",
    body: `IGFXPRO acts as principal counterparty to all CFD transactions. When you buy a CFD from IGFXPRO, IGFXPRO is the seller. This means you are exposed to the credit risk of IGFXPRO. In the event of IGFXPRO's insolvency, you may be unable to recover all or part of your funds, even though client money is held in segregated accounts.

Client Money Segregation: IGFXPRO holds client funds in accounts separate from its own operational funds, in accordance with MiFID II Client Money Rules. Segregated client funds are not available to creditors of IGFXPRO in the event of insolvency. However, the protection offered by segregation is not absolute and depends on jurisdictional laws.

Regulatory Risk: The regulatory framework governing CFD products may change. ESMA leverage caps were introduced in 2018 and have been reviewed periodically. Future regulatory changes could restrict available instruments, leverage levels, or the ability to offer certain products.`,
  },
  {
    id: "9", title: "9. OLOS AI Signal Risk",
    body: `IGFXPRO provides AI-generated trading signals through the OLOS intelligence system. These signals represent probabilistic assessments of market direction based on historical patterns, technical analysis, and macroeconomic factors. You must understand the following:

• OLOS signals are not financial advice. They are informational tools only.
• Past performance of OLOS signals does not guarantee future results.
• Confidence scores (0–100%) represent model confidence only — even a 95% confidence signal can be wrong.
• OLOS signals may fail entirely in unprecedented market conditions ("black swan" events) outside the training distribution.
• You are solely responsible for all trading decisions made based on or in connection with OLOS signals.
• IGFXPRO does not accept liability for losses arising from reliance on OLOS AI signals.`,
  },
  {
    id: "10", title: "10. Statistical Evidence",
    body: `In compliance with ESMA Product Intervention Measures (2018) and national regulator requirements, IGFXPRO is required to disclose the percentage of retail investor accounts that lose money when trading CFDs with IGFXPRO.

The majority of retail investor accounts lose money when trading CFDs. The exact percentage will be disclosed on your account opening documentation and updated periodically in accordance with regulatory requirements.

You should consider this information carefully before deciding to trade.`,
  },
  {
    id: "11", title: "11. Tax Implications",
    body: `The tax treatment of CFD trading profits and losses varies by jurisdiction. IGFXPRO does not provide tax advice. You are solely responsible for all applicable taxes arising from your trading activity. You should consult a qualified tax advisor in your jurisdiction before trading. In some jurisdictions, CFD gains may be subject to capital gains tax, income tax, or financial transaction taxes.`,
  },
  {
    id: "12", title: "12. Risk Mitigation Tools",
    body: `IGFXPRO provides several tools to help you manage risk:

Stop-Loss Orders: Automatically close a position when the price reaches a specified adverse level. Note that stop-losses are not guaranteed — in fast markets, execution may occur at a worse price than specified.

Take-Profit Orders: Automatically close a position when the price reaches a specified favourable level.

Negative Balance Protection: Ensures losses cannot exceed your account balance (retail clients only).

Margin Alerts: Email and in-platform notifications when margin utilisation reaches configured thresholds.

OLOS Risk Centre: Real-time portfolio risk metrics including position-level P&L, aggregate exposure, margin utilisation, and drawdown tracking.

Position Sizing Calculator: Available in the trading terminal to calculate position size based on account balance and risk percentage.

You should use these tools as part of a comprehensive risk management strategy. No tool eliminates risk entirely.`,
  },
];

export default function RiskDisclosurePage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-[900px] px-6 py-20 lg:px-8 lg:py-28">

        {/* Header */}
        <div className="mb-12 border-b border-white/[0.06] pb-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/[0.08]">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-400">Legal Document</span>
          </div>
          <h1 className="text-[40px] font-bold tracking-[-0.025em] text-white">Risk Disclosure Statement</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-[13px] text-slate-500">
            <span>Version: 3.2</span>
            <span>Effective date: 1 January 2025</span>
            <span>Jurisdiction: European Union (ESMA)</span>
          </div>
          <div className="mt-6 rounded-lg border border-rose-400/[0.15] bg-rose-400/[0.05] px-5 py-4">
            <p className="text-[13px] font-semibold text-rose-400">Important Warning</p>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-400">
              CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.
              The majority of retail investor accounts lose money when trading CFDs with IGFXPRO.
              You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.
            </p>
          </div>
        </div>

        {/* Table of contents */}
        <div className="mb-12 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500">Table of Contents</p>
          <ul className="space-y-2">
            {SECTIONS.map(({ id, title }) => (
              <li key={id}>
                <a href={`#section-${id}`} className="text-[13px] text-cyan-400/80 transition hover:text-cyan-300">
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map(({ id, title, body }) => (
            <section key={id} id={`section-${id}`} className="scroll-mt-24">
              <h2 className="mb-4 text-[20px] font-bold tracking-[-0.01em] text-white">{title}</h2>
              <div className="text-[14px] leading-8 text-slate-400 whitespace-pre-line">{body}</div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-14 border-t border-white/[0.06] pt-10">
          <p className="text-[13px] leading-7 text-slate-500">
            This document has been prepared by IGFX Global Ltd. For questions regarding this Risk Disclosure Statement,
            contact our Compliance department at{" "}
            <a href="mailto:compliance@igfxpro.com" className="text-cyan-400 hover:underline">compliance@igfxpro.com</a>.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/legal/terms" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Terms of Use</Link>
            <Link to="/legal/client-agreement" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Client Agreement</Link>
            <Link to="/legal/privacy" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Privacy Policy</Link>
          </div>
        </div>

      </div>
    </PublicLayout>
  );
}
