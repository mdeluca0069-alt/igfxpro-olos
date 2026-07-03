import PublicLayout from "../../../components/public/PublicLayout";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

const SECTIONS = [
  {
    id: "1", title: "1. Who We Are and How to Contact Us",
    body: `IGFX Global Ltd ("IGFXPRO") is the data controller responsible for your personal data. Our registered address is 15 Financial District, London, EC2V 8RT, United Kingdom.

Data Protection Officer (DPO): dpo@igfxpro.com
General privacy enquiries: privacy@igfxpro.com
Telephone: +44 (0)20 7946 0321

This Privacy Policy explains how IGFXPRO collects, uses, stores, and protects your personal data in accordance with:
• Regulation (EU) 2016/679 (General Data Protection Regulation — GDPR)
• UK GDPR and the Data Protection Act 2018
• Directive (EU) 2015/849 (Anti-Money Laundering Directive — AMLD)
• Directive 2014/65/EU (MiFID II) record-keeping requirements`,
  },
  {
    id: "2", title: "2. Personal Data We Collect",
    body: `We collect the following categories of personal data:

Identity Data:
• Full legal name, date of birth, nationality
• Government-issued ID numbers (passport, national ID)
• Photographs (for identity verification)

Contact Data:
• Email address, telephone number, residential address
• Business address (for corporate accounts)

Financial Data:
• Bank account details (IBAN, BIC/SWIFT)
• Payment card details (tokenised — we do not store full card numbers)
• Source of funds declarations
• Tax identification number (TIN)

Trading Data:
• All orders placed, executed, cancelled, and modified
• Account balances, positions, margin utilisation, P&L history
• IP addresses associated with login and order placement sessions

KYC/AML Data:
• Identity verification documents and selfies
• PEP (Politically Exposed Persons) screening results
• Adverse media screening results
• Source of wealth declarations

Technical Data:
• Browser type and version, device type and operating system
• Session data, cookies, and usage analytics
• Error logs and platform interaction records

Communications:
• Records of all communications between you and IGFXPRO (email, chat, phone)
• Recordings of telephone calls (retained for regulatory compliance)`,
  },
  {
    id: "3", title: "3. Legal Bases for Processing",
    body: `IGFXPRO processes your personal data on the following legal bases:

Contract Performance (Article 6(1)(b) GDPR):
Processing necessary to open your account, execute trades, process deposits and withdrawals, and provide the Platform services.

Legal Obligation (Article 6(1)(c) GDPR):
Processing required to comply with AML/KYC obligations (AMLD5), MiFID II transaction reporting, ESMA regulatory reporting, and tax reporting obligations.

Legitimate Interests (Article 6(1)(f) GDPR):
Processing for fraud prevention, platform security, product improvement, and internal analytics. We balance our interests against your rights and freedoms.

Consent (Article 6(1)(a) GDPR):
Marketing communications (email newsletters, promotional offers). You may withdraw consent at any time by unsubscribing or contacting us at privacy@igfxpro.com.`,
  },
  {
    id: "4", title: "4. How We Use Your Data",
    body: `We use your personal data to:

Account Management:
• Create and manage your trading account
• Process identity verification and maintain KYC compliance
• Monitor transactions for AML compliance

Trade Execution:
• Execute, record, and report all transactions as required by MiFID II
• Maintain complete audit trails of all order activity

Risk Management:
• Monitor margin utilisation and enforce stop-out procedures
• Conduct credit assessments for professional client applications

Platform Improvement:
• Analyse platform usage patterns to improve functionality
• Train and improve OLOS AI models using anonymised trading data
• Debug technical issues and optimise performance

Communications:
• Send account notifications, trade confirmations, and margin alerts
• Provide customer support via email, chat, and telephone
• Send regulatory notices and policy updates

Marketing (with consent):
• Send newsletters, market commentary, and promotional content
• Conduct satisfaction surveys`,
  },
  {
    id: "5", title: "5. Data Sharing and Third Parties",
    body: `IGFXPRO shares personal data with third parties only when necessary and lawful:

Regulatory Authorities:
We are required to report transaction data to financial regulators, tax authorities, and law enforcement agencies under MiFID II, EMIR, and applicable AML law. This sharing is mandatory and does not require your consent.

Identity Verification Providers:
Your identity documents and biometric data are processed by authorised KYC/AML providers (e.g., Onfido, Jumio) for document verification and liveness checks. These providers act as data processors under GDPR.

Banking and Payment Partners:
Your banking details are shared with licensed payment service providers to process deposits and withdrawals.

Liquidity and Technology Providers:
Anonymised or aggregated trading data may be shared with liquidity providers for pricing purposes.

Auditors and Legal Advisors:
Professional advisors engaged by IGFXPRO under confidentiality obligations.

We do not sell your personal data to third parties for commercial purposes.`,
  },
  {
    id: "6", title: "6. International Data Transfers",
    body: `IGFXPRO may transfer your personal data to countries outside the European Economic Area (EEA) in the following circumstances:

• When using cloud service providers (such as AWS or Google Cloud) whose infrastructure is partially located outside the EEA
• When sharing data with correspondent banks or verification providers operating internationally

All international transfers are conducted under appropriate safeguards, including:
• EU Standard Contractual Clauses (SCCs) as approved by the European Commission
• UK International Data Transfer Agreements (IDTAs)
• Adequacy decisions where applicable

Details of the safeguards applied to specific transfers are available upon request by contacting dpo@igfxpro.com.`,
  },
  {
    id: "7", title: "7. Data Retention",
    body: `IGFXPRO retains your personal data for the following periods:

KYC/Identity Documents: 5 years from account closure (required by AMLD)
Transaction Records: 5 years from the date of the transaction (required by MiFID II)
Communication Records (including call recordings): 5 years from the date of communication
Account Profile Data: Duration of account plus 5 years after closure
Marketing Consent Records: Until consent is withdrawn plus 1 year

After the applicable retention period, data is securely deleted or anonymised.`,
  },
  {
    id: "8", title: "8. Your Rights Under GDPR",
    body: `You have the following rights regarding your personal data:

Right of Access (Article 15): Request a copy of all personal data we hold about you. We will respond within 30 days.

Right to Rectification (Article 16): Request correction of inaccurate personal data.

Right to Erasure (Article 17): Request deletion of your data where it is no longer necessary, or where you withdraw consent. Note: we cannot erase data where we are under a legal obligation to retain it (e.g., AML records).

Right to Restriction (Article 18): Request that we limit processing of your data in certain circumstances.

Right to Data Portability (Article 20): Receive your data in a structured, machine-readable format.

Right to Object (Article 21): Object to processing based on legitimate interests or for direct marketing purposes.

Rights Related to Automated Decision-Making (Article 22): Request human review of any automated decisions that significantly affect you. OLOS AI signals are informational only and do not constitute automated decision-making in the legal sense — you retain full discretion over all trading decisions.

To exercise any of these rights, contact: privacy@igfxpro.com. You also have the right to lodge a complaint with your national data protection authority (e.g., the ICO in the UK, or your local EU supervisory authority).`,
  },
  {
    id: "9", title: "9. Cookies and Tracking Technologies",
    body: `IGFXPRO uses cookies and similar tracking technologies on the Platform. For full details, please see our Cookie Policy. In summary:

Essential Cookies: Required for platform functionality (session management, security). Cannot be disabled.

Analytics Cookies: Used to understand how the Platform is used (e.g., Google Analytics, PostHog). May be disabled via cookie preferences.

Marketing Cookies: Used to measure the effectiveness of marketing campaigns. Disabled by default; enabled only with your consent.`,
  },
  {
    id: "10", title: "10. Security",
    body: `IGFXPRO implements appropriate technical and organisational measures to protect your personal data, including:

• TLS 1.3 encryption for all data in transit
• AES-256 encryption for sensitive data at rest
• RS256 JWT tokens for authentication (access tokens stored in memory only — never localStorage)
• HttpOnly, Secure, SameSite=Strict cookies for refresh tokens
• Multi-factor authentication (MFA) available and encouraged
• Regular penetration testing and vulnerability assessments
• Role-based access control (RBAC) for all internal systems
• Comprehensive access logging and anomaly detection

Despite these measures, no security system is impenetrable. In the event of a data breach affecting your rights and freedoms, IGFXPRO will notify you and the relevant supervisory authority within 72 hours as required by GDPR.`,
  },
];

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-[900px] px-6 py-20 lg:px-8 lg:py-28">

        <div className="mb-12 border-b border-white/[0.06] pb-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08]">
              <Lock size={18} className="text-cyan-400" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Legal Document</span>
          </div>
          <h1 className="text-[40px] font-bold tracking-[-0.025em] text-white">Privacy Policy</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-[13px] text-slate-500">
            <span>Version: 2.4</span>
            <span>Effective date: 1 January 2025</span>
            <span>GDPR compliant</span>
          </div>
          <p className="mt-5 text-[14px] leading-7 text-slate-400">
            IGFXPRO is committed to protecting your personal data. This Privacy Policy describes what personal information
            we collect, why we collect it, how we use it, and your rights under the GDPR and UK GDPR.
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
            Privacy enquiries: <a href="mailto:privacy@igfxpro.com" className="text-cyan-400 hover:underline">privacy@igfxpro.com</a>
            {" · "}DPO: <a href="mailto:dpo@igfxpro.com" className="text-cyan-400 hover:underline">dpo@igfxpro.com</a>
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/legal/cookies" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Cookie Policy</Link>
            <Link to="/legal/terms" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Terms of Use</Link>
            <Link to="/legal/risk-disclosure" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Risk Disclosure</Link>
          </div>
        </div>

      </div>
    </PublicLayout>
  );
}
