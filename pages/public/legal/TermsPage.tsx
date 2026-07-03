import PublicLayout from "../../../components/public/PublicLayout";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

const SECTIONS = [
  {
    id: "1", title: "1. Definitions",
    body: `In these Terms of Use, the following terms have the following meanings:

"IGFXPRO" / "Company" / "we" / "us": IGFX Global Ltd, a company authorised and regulated as a demonstration broker. Registered address: IGFX Global Ltd, 15 Financial District, London, EC2V 8RT, United Kingdom.

"Platform": The IGFXPRO web application, including the iTrader terminal, OLOS AI system, mobile applications, and all associated APIs and services.

"Account": A registered trading account on the IGFXPRO Platform.

"Client" / "you": Any individual or legal entity that has registered for an Account and is subject to these Terms.

"CFD": A Contract for Difference, a derivative financial instrument whose value is derived from the price of an underlying asset.

"OLOS": The AI intelligence system proprietary to IGFXPRO, providing market signals, risk assessments, and automated trading capabilities.

"Autopilot": The automated execution feature within OLOS that can place and manage orders on behalf of the Client.

"Margin": The minimum amount of funds required in your Account to open and maintain a CFD position.

"Leverage": A mechanism by which you can control positions larger than your deposited capital.`,
  },
  {
    id: "2", title: "2. Eligibility and Account Registration",
    body: `2.1 Minimum Age: You must be at least 18 years of age to open an Account. By registering, you confirm that you are of legal age in your jurisdiction to enter into binding contracts.

2.2 Residency Restrictions: IGFXPRO does not accept clients from jurisdictions where the offer or sale of CFDs is prohibited by law. This includes, but is not limited to, the United States of America, Japan, and certain other restricted jurisdictions listed in our Restricted Countries Policy. It is your responsibility to ensure that opening and maintaining an Account is legal in your jurisdiction.

2.3 KYC and AML Verification: To comply with Anti-Money Laundering (AML) regulations and MiFID II Know Your Customer (KYC) requirements, you must provide:
• Government-issued photo identification (passport, national ID card, or driving licence)
• Proof of residential address dated within 3 months (utility bill, bank statement, or official government correspondence)
• Source of funds declaration for deposits above applicable thresholds
• PEP (Politically Exposed Persons) and sanctions screening

IGFXPRO reserves the right to request additional documentation at any time for compliance purposes. Failure to provide requested documentation may result in account suspension or closure.

2.4 Appropriateness Assessment: Prior to account opening, you must complete an appropriateness assessment as required by MiFID II. IGFXPRO will ask you questions about your financial knowledge, trading experience, and investment objectives. If IGFXPRO determines that CFD products are not appropriate for you, you will be notified. You may still proceed with account opening, but do so at your own risk.`,
  },
  {
    id: "3", title: "3. Platform Use and Acceptable Conduct",
    body: `3.1 Licence Grant: Subject to compliance with these Terms, IGFXPRO grants you a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform for your personal trading activities.

3.2 Prohibited Conduct: You agree not to:
• Use the Platform for any unlawful purpose, including market manipulation, wash trading, or insider trading
• Attempt to reverse-engineer, decompile, or circumvent the security of the Platform
• Use automated bots, scrapers, or other tools to harvest data or place orders without authorisation
• Share your login credentials with any third party
• Open multiple accounts to circumvent account restrictions
• Engage in abusive behaviour toward IGFXPRO staff
• Attempt to exploit platform errors, pricing delays, or system failures for profit

3.3 API Usage: If you access the IGFXPRO API, you must comply with the separate API Terms of Use. API access is rate-limited and may be revoked if misused.

3.4 OLOS Autopilot: When enabling OLOS Autopilot, you authorise IGFXPRO to place orders on your behalf according to your configured parameters. You remain solely responsible for all orders placed under your account, including automated orders. You may disable Autopilot at any time through the platform settings.`,
  },
  {
    id: "4", title: "4. Deposits, Withdrawals, and Fees",
    body: `4.1 Deposits: You may deposit funds into your Account via bank transfer, credit/debit card, or other approved payment methods listed on the Platform. Minimum deposit is €100. IGFXPRO does not accept third-party deposits — funds must originate from a bank account or card registered in your name.

4.2 Withdrawals: Withdrawal requests are processed within 1–3 business days. Funds are returned to the same payment method used for deposit (AML policy). IGFXPRO may apply a minimum withdrawal amount of €50. In cases of suspected fraud or pending KYC verification, withdrawals may be held for investigation.

4.3 Trading Fees: IGFXPRO generates revenue through the spread (the difference between the bid and ask price). No separate commission is charged on standard accounts. Additional charges include:
• Overnight financing (swap) charges for positions held past 22:00 UTC
• Inactivity fee: €10 per month after 6 consecutive months of no login activity
• Currency conversion fee: 0.5% on deposits/withdrawals not in the account base currency

4.4 Taxes: You are responsible for all taxes arising from your trading activity. IGFXPRO does not withhold taxes on behalf of clients unless required by applicable law.`,
  },
  {
    id: "5", title: "5. Order Execution and Best Execution",
    body: `5.1 Order Types: IGFXPRO supports market orders, limit orders, stop orders, stop-limit orders, and trailing stops. The availability of order types may vary by instrument.

5.2 Best Execution: IGFXPRO operates an internal matching engine (OLOS) for all CFD orders. As principal counterparty, IGFXPRO is required to apply a best execution policy that considers price, cost, speed, likelihood of execution, and size. IGFXPRO's Best Execution Policy is available on request.

5.3 Slippage: In fast-moving or illiquid markets, orders may execute at a price different from the requested price. IGFXPRO's system provides positive and negative slippage (execution at better or worse prices than requested). Slippage analytics are available in the terminal.

5.4 Order Refusal: IGFXPRO reserves the right to refuse or cancel any order that:
• Would cause your margin utilisation to exceed permissible levels
• Is placed during a market halt or suspension
• Is suspected to be associated with market manipulation
• Exceeds maximum position size limits`,
  },
  {
    id: "6", title: "6. Intellectual Property",
    body: `6.1 Platform IP: All intellectual property in the Platform, including the OLOS AI system, signal algorithms, interface design, brand assets, and proprietary methodologies, is owned by IGFX Global Ltd. You may not reproduce, distribute, or create derivative works from any Platform content without written permission.

6.2 OLOS Signals: OLOS-generated signals, confidence scores, and AI outputs are proprietary to IGFXPRO. You may not redistribute, sell, or publish OLOS signals without express written authorisation.

6.3 User Data: By using the Platform, you grant IGFXPRO a non-exclusive, worldwide licence to use your anonymised trading data to improve the OLOS models and Platform services.`,
  },
  {
    id: "7", title: "7. Limitation of Liability",
    body: `7.1 To the maximum extent permitted by applicable law, IGFXPRO shall not be liable for:
• Trading losses of any kind, whether arising from market movements, signal reliance, execution delays, or platform unavailability
• Indirect, consequential, special, incidental, or punitive damages
• Loss of profits, data, or business opportunity
• Losses arising from system outages, internet interruptions, or third-party provider failures

7.2 IGFXPRO's total aggregate liability to you for any claim arising out of or in connection with these Terms shall not exceed the total amount of funds deposited by you in the 12 months preceding the claim.

7.3 Nothing in these Terms limits IGFXPRO's liability for fraud, gross negligence, or death/personal injury caused by IGFXPRO's negligence.`,
  },
  {
    id: "8", title: "8. Account Termination",
    body: `8.1 Termination by You: You may close your Account at any time by submitting a written request to support@igfxpro.com. Prior to closure, all open positions must be closed and all outstanding charges must be settled. Any remaining balance will be returned to your designated bank account within 5 business days.

8.2 Termination by IGFXPRO: IGFXPRO may suspend or close your Account with immediate effect in cases of:
• Suspected fraud, money laundering, or regulatory violation
• Breach of these Terms
• Failure to complete KYC verification within required timeframes
• Instruction from a regulatory authority
• Non-payment of negative balances (where applicable to professional clients)

8.3 Upon termination, your access to the Platform ceases immediately. Data retention obligations require IGFXPRO to retain your account records for a minimum of 5 years.`,
  },
  {
    id: "9", title: "9. Governing Law and Disputes",
    body: `9.1 Governing Law: These Terms are governed by the laws of England and Wales.

9.2 Dispute Resolution: In the event of a dispute, you should first contact IGFXPRO's Compliance department at compliance@igfxpro.com. IGFXPRO will acknowledge your complaint within 2 business days and provide a final response within 8 weeks.

9.3 Escalation: If you are not satisfied with IGFXPRO's response, you may refer your complaint to the Financial Ombudsman Service (FOS) in the UK, or to the competent authority in your jurisdiction.

9.4 Arbitration: For claims exceeding £50,000, disputes may be referred to binding arbitration under the LCIA Arbitration Rules. The seat of arbitration shall be London, England.`,
  },
  {
    id: "10", title: "10. Amendments",
    body: `IGFXPRO reserves the right to amend these Terms at any time. Material changes will be notified to you via email and in-platform notification at least 30 days prior to taking effect. Your continued use of the Platform after the effective date of any amendment constitutes your acceptance of the amended Terms. If you do not accept the amended Terms, you must close your Account before the effective date.`,
  },
];

export default function TermsPage() {
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
          <h1 className="text-[40px] font-bold tracking-[-0.025em] text-white">Terms of Use</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-[13px] text-slate-500">
            <span>Version: 4.1</span>
            <span>Effective date: 1 January 2025</span>
            <span>Company: IGFX Global Ltd</span>
          </div>
          <p className="mt-5 text-[14px] leading-7 text-slate-400">
            These Terms of Use ("Terms") constitute a legally binding agreement between you and IGFX Global Ltd governing
            your access to and use of the IGFXPRO trading platform. Please read these Terms carefully before opening an account.
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
            Questions about these Terms? Contact us at{" "}
            <a href="mailto:legal@igfxpro.com" className="text-cyan-400 hover:underline">legal@igfxpro.com</a>
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/legal/risk-disclosure" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Risk Disclosure</Link>
            <Link to="/legal/privacy" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Privacy Policy</Link>
            <Link to="/legal/client-agreement" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Client Agreement</Link>
          </div>
        </div>

      </div>
    </PublicLayout>
  );
}
