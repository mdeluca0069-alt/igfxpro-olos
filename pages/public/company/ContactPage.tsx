import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, Shield, MessageSquare } from "lucide-react";
import PublicLayout from "../../../components/public/PublicLayout";

const DEPARTMENTS = [
  { icon: MessageSquare, name: "Client Support",    email: "support@igfxpro.com",    hours: "Mon–Fri 08:00–22:00 UTC", desc: "Account issues, trading queries, platform assistance, deposit/withdrawal support." },
  { icon: Shield,        name: "Compliance & AML",  email: "compliance@igfxpro.com", hours: "Mon–Fri 09:00–18:00 UTC", desc: "KYC verification, account documentation, formal complaints, regulatory enquiries." },
  { icon: Mail,          name: "Legal & Privacy",   email: "legal@igfxpro.com",      hours: "Mon–Fri 09:00–17:00 UTC", desc: "Data protection requests (DSAR), GDPR enquiries, Terms of Use questions, subpoenas." },
  { icon: Mail,          name: "Institutional Sales",email: "institutional@igfxpro.com",hours: "By appointment",        desc: "API access, white-label solutions, professional client onboarding, enterprise tier." },
  { icon: Mail,          name: "Press & Media",     email: "press@igfxpro.com",       hours: "Mon–Fri 09:00–17:00 UTC", desc: "Media enquiries, press releases, interview requests, platform screenshots and branding." },
];

const FAQ = [
  { q: "How do I open an account?",          a: "Click 'Open account' and complete the registration form. You will need to verify your identity (passport or national ID) and provide proof of address. Verification typically completes within 24 hours." },
  { q: "How do I deposit funds?",            a: "Log in and navigate to Wallet → Deposit. We accept bank transfers (SEPA/SWIFT), credit/debit cards (Visa, Mastercard), and selected e-wallets. Minimum deposit is €100." },
  { q: "How long do withdrawals take?",      a: "Withdrawals are processed within 1–3 business days. Bank transfers may take an additional 1–3 days depending on your bank. We return funds to the same payment method used for deposit." },
  { q: "What is OLOS AI?",                   a: "OLOS is IGFXPRO's proprietary AI intelligence layer. It analyses 12 concurrent models to generate directional signals with confidence scores, macro context, and full explainability." },
  { q: "Can I use automated trading?",       a: "Yes. OLOS Autopilot allows you to automate execution based on AI signals within configurable risk parameters. You can enable, configure, and disable Autopilot from the OLOS section of the platform." },
  { q: "What leverage is available?",        a: "Retail clients: FX majors 30:1, indices/FX minors 20:1, commodities 10:1, equities 5:1, crypto 2:1. Higher leverage may be available to elective professional clients subject to eligibility assessment." },
  { q: "Is my money protected?",             a: "Client funds are held in segregated accounts separate from IGFXPRO's own funds. Retail clients have negative balance protection — you cannot lose more than your deposited balance." },
  { q: "How do I apply for professional client status?", a: "Contact institutional@igfxpro.com. You must meet at least two of: portfolio >€500,000, relevant financial employment >1 year, or >10 significant transactions per quarter in the past 12 months." },
];

export default function ContactPage() {
  return (
    <PublicLayout>

      {/* Hero */}
      <section className="bg-[#030712] py-24">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Contact IGFXPRO</span>
            <h1 className="mt-4 text-[44px] font-bold leading-[1.15] tracking-[-0.025em] text-white">
              We're here to help
            </h1>
            <p className="mt-5 text-[16px] leading-8 text-slate-400">
              Our client support team is available Monday to Friday, 08:00–22:00 UTC.
              For account and trading assistance, our average first-response time is under 2 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact channels */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-16">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Mail,    title: "Email",      detail: "support@igfxpro.com",     note: "Response within 2 hours (business hours)" },
              { icon: Phone,   title: "Telephone",  detail: "+44 (0)20 7946 0321",     note: "Mon–Fri 08:00–22:00 UTC" },
              { icon: MapPin,  title: "Address",    detail: "15 Financial District",    note: "London, EC2V 8RT, United Kingdom" },
            ].map(({ icon: Icon, title, detail, note }) => (
              <div key={title} className="rounded-xl border border-white/[0.06] bg-[#030912] p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  <Icon size={18} className="text-cyan-400" strokeWidth={1.5} />
                </div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
                <p className="mt-1.5 text-[15px] font-semibold text-white">{detail}</p>
                <p className="mt-1 text-[12px] text-slate-500">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="bg-[#030712] py-20">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Departments</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Contact the right team</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DEPARTMENTS.map(({ icon: Icon, name, email, hours, desc }) => (
              <div key={name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                    <Icon size={16} className="text-cyan-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-semibold text-white">{name}</p>
                </div>
                <a href={`mailto:${email}`} className="text-[13px] text-cyan-400 hover:underline">{email}</a>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
                  <Clock size={11} />
                  {hours}
                </div>
                <p className="mt-3 text-[12px] leading-5 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-white/[0.04] bg-[#050b14] py-20">
        <div className="mx-auto max-w-[900px] px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">FAQ</span>
            <h2 className="mt-3 text-[32px] font-bold tracking-[-0.025em] text-white">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/[0.06] bg-[#030912] p-6">
                <p className="text-[14px] font-semibold text-white">{q}</p>
                <p className="mt-2.5 text-[13px] leading-6 text-slate-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Complaint notice */}
      <section className="bg-[#030712] py-12">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-8">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:flex sm:items-start sm:gap-6">
            <Shield size={24} className="mt-0.5 shrink-0 text-cyan-400/70" />
            <div>
              <p className="text-[14px] font-semibold text-white">Making a formal complaint</p>
              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                To submit a formal complaint, email <a href="mailto:compliance@igfxpro.com" className="text-cyan-400 hover:underline">compliance@igfxpro.com</a> with
                subject "FORMAL COMPLAINT", your account number, and a description of the issue.
                We will acknowledge within 2 business days and resolve within 8 weeks.
                Unresolved complaints may be escalated to the Financial Ombudsman Service (UK) or your national competent authority.
              </p>
              <Link to="/legal/client-agreement#section-8" className="mt-3 inline-block text-[13px] text-cyan-400 hover:underline">
                View full complaints procedure →
              </Link>
            </div>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
