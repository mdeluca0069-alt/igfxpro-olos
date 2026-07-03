import PublicLayout from "../../../components/public/PublicLayout";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const SECTIONS = [
  {
    id: "1", title: "1. Parties to This Agreement",
    body: `This Client Agreement ("Agreement") is entered into between:

Provider: IGFX Global Ltd ("IGFXPRO"), a company incorporated in England and Wales, authorised to operate a demonstration trading platform. Registered address: 15 Financial District, London, EC2V 8RT, United Kingdom.

Client: The individual or entity who has completed account registration and accepted these terms ("you", "Client").

This Agreement governs the provision of CFD trading services through the IGFXPRO Platform, including access to the iTrader terminal, OLOS AI intelligence system, and all associated features.`,
  },
  {
    id: "2", title: "2. Account Categories",
    body: `2.1 Retail Client: The default classification for all new accounts. Retail clients benefit from ESMA investor protections including leverage limits, negative balance protection, and mandatory risk warnings.

2.2 Elective Professional Client: Clients who meet at least two of the following criteria may apply for professional classification:
• Portfolio size exceeding €500,000 in financial instruments or cash
• Employment in the financial sector for at least 1 year in a relevant position
• Execution of at least 10 significant CFD transactions per quarter in the past year

Professional clients lose ESMA retail protections (including negative balance protection and leverage limits). Higher leverage is available. Professional client applications are subject to IGFXPRO's internal review process.

2.3 Account Tiers: IGFXPRO offers four service tiers: Standard, Gold, VIP, and Platinum/Enterprise. Each tier unlocks additional platform features as described in the Tier Benefits Schedule available in the platform.`,
  },
  {
    id: "3", title: "3. Relationship and Execution Basis",
    body: `3.1 Principal Counterparty: IGFXPRO acts as principal counterparty to all CFD transactions. When you buy a CFD, IGFXPRO sells it to you; when you sell, IGFXPRO buys. IGFXPRO may hedge its exposure in external markets at its discretion.

3.2 No Independent Advice: IGFXPRO does not provide investment advice. OLOS AI signals are informational tools only and do not constitute personal recommendations. You are solely responsible for all trading decisions.

3.3 Order Execution: IGFXPRO executes all orders through the OLOS matching engine. IGFXPRO is not obligated to accept any order and may decline orders at its absolute discretion.

3.4 Conflicts of Interest: As principal counterparty, IGFXPRO's interests may conflict with yours (e.g., IGFXPRO profits when you lose on a trade). IGFXPRO manages this conflict through its Conflicts of Interest Policy, available on request.`,
  },
  {
    id: "4", title: "4. Margin and Risk Management",
    body: `4.1 Margin Requirements: You must maintain sufficient margin in your account at all times. IGFXPRO applies ESMA-mandated margin requirements. Detailed margin requirements by asset class are published in the Trading Conditions Schedule.

4.2 Margin Monitoring: IGFXPRO continuously monitors your margin utilisation. You may receive margin alerts via email and in-platform notifications when utilisation reaches configured thresholds.

4.3 Margin Call: When your equity falls below 100% of required margin, IGFXPRO will issue a margin call. You must deposit additional funds or reduce positions within a reasonable timeframe (typically 24 hours, subject to market conditions).

4.4 Stop-Out: When equity falls to 50% of required margin, IGFXPRO will automatically close positions beginning with the largest losing position, until margin utilisation is restored. Stop-outs may occur rapidly during volatile market conditions with little or no advance notice.

4.5 Negative Balance: In the event that your account balance becomes negative following a stop-out (due to market gaps), IGFXPRO will absorb the deficit for retail clients as required by ESMA regulations. Your account balance will be reset to zero. You will not owe IGFXPRO any funds.`,
  },
  {
    id: "5", title: "5. Pricing, Spreads, and Financing",
    body: `5.1 Spread Pricing: All CFD prices are quoted as a two-way spread (bid/ask). IGFXPRO's revenue is derived from the spread. Spreads are variable and widen during periods of low liquidity, significant economic events, and market open/close.

5.2 Spread Guarantee: IGFXPRO does not guarantee maximum spreads. Published "typical spread" values are representative of normal market conditions during the primary session. Spreads during NYMEX crude settlement, Non-Farm Payrolls releases, and other high-impact events may be significantly wider.

5.3 Overnight Financing: Positions held past 22:00 UTC incur overnight financing charges ("swaps"). Swap rates are based on interbank rates (SOFR, EURIBOR) plus/minus IGFXPRO's spread. Rates are published in the trading terminal and updated daily. On Wednesdays, a triple swap applies to account for the weekend.

5.4 Cryptocurrency Financing: Crypto CFD positions incur a flat daily financing charge of 0.04% on notional value (both long and short positions). This replaces the standard bid/offer swap rate.

5.5 Dividend Adjustments: For equity and index CFDs, IGFXPRO applies dividend adjustments at the ex-dividend date. Long position holders receive a credit; short position holders are debited the equivalent cash amount.`,
  },
  {
    id: "6", title: "6. OLOS AI and Autopilot Terms",
    body: `6.1 Signal Disclaimer: OLOS AI signals are generated by probabilistic machine learning models. They represent estimates of market direction, not guarantees. IGFXPRO provides no warranty as to the accuracy, completeness, or reliability of OLOS signals. You use OLOS signals entirely at your own risk.

6.2 Autopilot Authorisation: By enabling OLOS Autopilot, you grant IGFXPRO's automated system the authority to place, modify, and close trades on your account within the parameters you configure. You retain the ability to disable Autopilot at any time. You are fully responsible for all orders generated by Autopilot.

6.3 Autopilot Governance: IGFXPRO builds risk controls into Autopilot including: minimum confidence threshold (default 70%), maximum position size per signal, pre-trade event lockout windows, and global kill-switch accessible by administrators and clients.

6.4 AI Model Changes: IGFXPRO may update, retrain, or replace OLOS models at any time without prior notice. Model performance varies across market regimes and may deteriorate without warning.`,
  },
  {
    id: "7", title: "7. Reporting and Record-Keeping",
    body: `7.1 Trade Confirmations: You will receive trade confirmation for every executed order via in-platform notification and email (where configured). Confirmation includes: instrument, direction, price, size, time, and applicable fees.

7.2 Account Statements: Monthly account statements are available in the Documents section of the platform. Statements cover: opening/closing balance, all transactions, P&L, and applicable fees.

7.3 MiFID II Reports: As required by MiFID II, IGFXPRO produces and retains complete transaction records. Transaction reports are available to clients upon written request.

7.4 Audit Trail: Every order, cancellation, modification, and system event is logged with microsecond timestamps and stored in IGFXPRO's tamper-proof audit log in compliance with MiFID II Article 25.`,
  },
  {
    id: "8", title: "8. Complaints Procedure",
    body: `8.1 How to Complain: Submit complaints to compliance@igfxpro.com with the subject "FORMAL COMPLAINT" and include your account number, description of the issue, and relevant dates.

8.2 Acknowledgement: IGFXPRO will acknowledge your complaint within 2 business days.

8.3 Investigation: IGFXPRO will investigate and provide a final response within 8 weeks (or sooner where possible). For complex complaints requiring extended investigation, we will provide progress updates.

8.4 Escalation: If you are dissatisfied with IGFXPRO's response, you may escalate to:
• UK: Financial Ombudsman Service (FOS), Exchange Tower, London E14 9SR
• EU: The relevant National Competent Authority in your member state
• Alternative Dispute Resolution (ADR): IGFXPRO participates in applicable ADR schemes

8.5 Legal Action: Nothing in this procedure limits your right to bring legal proceedings.`,
  },
];

export default function ClientAgreementPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-[900px] px-6 py-20 lg:px-8 lg:py-28">

        <div className="mb-12 border-b border-white/[0.06] pb-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08]">
              <FileText size={18} className="text-cyan-400" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Legal Document</span>
          </div>
          <h1 className="text-[40px] font-bold tracking-[-0.025em] text-white">Client Agreement</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-[13px] text-slate-500">
            <span>Version: 5.0</span>
            <span>Effective date: 1 January 2025</span>
            <span>MiFID II compliant</span>
          </div>
          <p className="mt-5 text-[14px] leading-7 text-slate-400">
            This Client Agreement governs the relationship between you and IGFXPRO for the provision of CFD trading services.
            By opening an account, you accept these terms in full. Please read this Agreement carefully.
          </p>
        </div>

        <div className="mb-12 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500">Table of Contents</p>
          <ul className="space-y-2">
            {SECTIONS.map(({ id, title }) => (
              <li key={id}>
                <a href={`#section-${id}`} className="text-[13px] text-cyan-400/80 transition hover:text-cyan-300">{title}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-10">
          {SECTIONS.map(({ id, title, body }) => (
            <section key={id} id={`section-${id}`} className="scroll-mt-24">
              <h2 className="mb-4 text-[20px] font-bold tracking-[-0.01em] text-white">{title}</h2>
              <div className="text-[14px] leading-8 text-slate-400 whitespace-pre-line">{body}</div>
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-white/[0.06] pt-10">
          <p className="text-[13px] leading-7 text-slate-500">
            Client Agreement enquiries: <a href="mailto:legal@igfxpro.com" className="text-cyan-400 hover:underline">legal@igfxpro.com</a>
            {" · "}Compliance: <a href="mailto:compliance@igfxpro.com" className="text-cyan-400 hover:underline">compliance@igfxpro.com</a>
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/legal/terms" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Terms of Use</Link>
            <Link to="/legal/risk-disclosure" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Risk Disclosure</Link>
            <Link to="/legal/privacy" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Privacy Policy</Link>
          </div>
        </div>

      </div>
    </PublicLayout>
  );
}
