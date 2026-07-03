import PublicLayout from "../../../components/public/PublicLayout";
import { Link } from "react-router-dom";

const COOKIE_TABLE = [
  { name: "igfxpro_session",    type: "Essential",  duration: "Session",   purpose: "Maintains your authenticated session on the platform. Deleted when you close your browser." },
  { name: "igfxpro_rt",         type: "Essential",  duration: "30 days",   purpose: "Encrypted refresh token stored as HttpOnly cookie. Used to silently renew your access token without re-login." },
  { name: "igfxpro_tid",        type: "Essential",  duration: "Session",   purpose: "Identifies your tenant context (multi-tenant environment). SessionStorage fallback available." },
  { name: "csrf_token",         type: "Essential",  duration: "Session",   purpose: "Cross-Site Request Forgery protection. Included in all state-modifying requests." },
  { name: "cookie_consent",     type: "Essential",  duration: "1 year",    purpose: "Stores your cookie preferences so we do not ask again on every visit." },
  { name: "_ga",                type: "Analytics",  duration: "2 years",   purpose: "Google Analytics — distinguishes unique users. Anonymised (IP anonymisation enabled)." },
  { name: "_ga_XXXXXX",         type: "Analytics",  duration: "2 years",   purpose: "Google Analytics 4 session persistence. Contains no personally identifiable information." },
  { name: "ph_xxxxx",           type: "Analytics",  duration: "1 year",    purpose: "PostHog product analytics. Tracks feature usage to improve the platform." },
  { name: "_fbp",               type: "Marketing",  duration: "3 months",  purpose: "Facebook Pixel — measures ad campaign effectiveness. Set only with your consent." },
  { name: "lp_td",              type: "Marketing",  duration: "1 year",    purpose: "LinkedIn Insight Tag — measures conversions from LinkedIn campaigns. Set only with your consent." },
];

export default function CookiePolicyPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-[900px] px-6 py-20 lg:px-8 lg:py-28">

        <div className="mb-12 border-b border-white/[0.06] pb-10">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Legal Document</span>
          <h1 className="mt-3 text-[40px] font-bold tracking-[-0.025em] text-white">Cookie Policy</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-[13px] text-slate-500">
            <span>Version: 1.8</span>
            <span>Effective date: 1 January 2025</span>
          </div>
        </div>

        <div className="space-y-10 text-[14px] leading-8 text-slate-400">

          <section id="what-are-cookies" className="scroll-mt-24">
            <h2 className="mb-4 text-[20px] font-bold text-white">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files placed on your device (computer, tablet, smartphone) when you visit a website
              or use a web application. They allow the site to remember your preferences, maintain your login session,
              and collect analytics data. Cookies are processed by your browser in accordance with browser settings
              and cookie preferences you configure.
            </p>
            <p className="mt-4">
              In addition to cookies, IGFXPRO uses related technologies including:
            </p>
            <ul className="mt-3 space-y-2">
              {[
                "localStorage and sessionStorage — for non-sensitive UI state (e.g., chart preferences, watchlist configuration)",
                "In-memory storage — for access tokens (never written to disk, cleared on page close)",
                "Service Workers — for offline caching of static assets (no personal data stored)",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/60" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section id="types" className="scroll-mt-24">
            <h2 className="mb-4 text-[20px] font-bold text-white">2. Types of Cookies We Use</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { type: "Essential", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", desc: "Required for the platform to function. Cannot be disabled. Include session management, security (CSRF), and authentication cookies." },
                { type: "Analytics", color: "text-blue-400 bg-blue-400/10 border-blue-400/20",    desc: "Help us understand how the platform is used. Data is anonymised. Can be disabled via cookie preferences without affecting functionality." },
                { type: "Marketing", color: "text-violet-400 bg-violet-400/10 border-violet-400/20", desc: "Measure advertising effectiveness. Disabled by default. Enabled only if you provide explicit consent via the cookie banner." },
              ].map(({ type, color, desc }) => (
                <div key={type} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${color}`}>{type}</span>
                  <p className="mt-3 text-[13px] leading-6 text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="table" className="scroll-mt-24">
            <h2 className="mb-4 text-[20px] font-bold text-white">3. Cookie Inventory</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Cookie Name", "Type", "Duration", "Purpose"].map(h => (
                      <th key={h} className="pb-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COOKIE_TABLE.map((c, i) => (
                    <tr key={c.name} className={`border-b border-white/[0.03] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                      <td className="py-3 pr-4 font-mono text-slate-300">{c.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          c.type === "Essential" ? "bg-emerald-400/10 text-emerald-400" :
                          c.type === "Analytics" ? "bg-blue-400/10 text-blue-400" :
                          "bg-violet-400/10 text-violet-400"
                        }`}>{c.type}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{c.duration}</td>
                      <td className="py-3 text-slate-500">{c.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="manage" className="scroll-mt-24">
            <h2 className="mb-4 text-[20px] font-bold text-white">4. Managing Your Cookie Preferences</h2>
            <p>You can manage cookie preferences in the following ways:</p>
            <div className="mt-5 space-y-4">
              {[
                { title: "Cookie Banner", desc: "When you first visit IGFXPRO, a cookie consent banner will appear. You can accept all cookies, reject non-essential cookies, or customise your preferences per category." },
                { title: "Platform Settings", desc: "Navigate to Account Settings → Privacy & Cookies at any time to update your preferences." },
                { title: "Browser Settings", desc: "Most browsers allow you to refuse cookies via their privacy settings. Note: disabling essential cookies will prevent you from logging in to the platform." },
                { title: "Opt-Out Links", desc: "Google Analytics: https://tools.google.com/dlpage/gaoptout · Facebook: https://www.facebook.com/settings?tab=ads · LinkedIn: https://www.linkedin.com/psettings/guest-controls" },
              ].map(({ title, desc }) => (
                <div key={title} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[13px] font-semibold text-white">{title}</p>
                  <p className="mt-1.5 text-[13px] text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="updates" className="scroll-mt-24">
            <h2 className="mb-4 text-[20px] font-bold text-white">5. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy periodically to reflect changes in the technologies we use or regulatory requirements.
              Material changes will be notified via the cookie banner or email. The "Effective date" at the top of this page
              indicates when the current version was last updated.
            </p>
          </section>

        </div>

        <div className="mt-14 border-t border-white/[0.06] pt-10">
          <p className="text-[13px] leading-7 text-slate-500">
            Cookie enquiries: <a href="mailto:privacy@igfxpro.com" className="text-cyan-400 hover:underline">privacy@igfxpro.com</a>
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/legal/privacy" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Privacy Policy</Link>
            <Link to="/legal/terms" className="text-[13px] text-slate-500 hover:text-slate-300 underline">Terms of Use</Link>
          </div>
        </div>

      </div>
    </PublicLayout>
  );
}
