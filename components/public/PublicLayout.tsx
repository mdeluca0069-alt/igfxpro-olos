import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart2, Menu, X, Globe } from "lucide-react";

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "OLOS",       href: "/#olos"       },
  { label: "Platform",   href: "/#platform"   },
  { label: "Markets",    href: "/#markets"    },
  { label: "Academy",    href: "/#academy"    },
  { label: "Compliance", href: "/#compliance" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="IGFXPRO home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400">
            <BarChart2 size={18} className="text-slate-950" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">IGFXPRO</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[13px] font-medium text-slate-400 transition-colors hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-[13px] font-medium text-slate-400 transition-colors hover:text-white">
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Open account
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-slate-400 hover:text-white md:hidden"
          onClick={() => setOpen((p) => !p)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/[0.06] bg-[#030712] px-6 pb-6 md:hidden"
        >
          <nav className="mt-4 flex flex-col gap-4">
            {NAV_LINKS.map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setOpen(false)} className="text-sm font-medium text-slate-400 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/login" className="rounded-lg border border-white/10 py-3 text-center text-sm font-medium text-slate-300">
              Sign in
            </Link>
            <Link to="/register" className="rounded-lg bg-white py-3 text-center text-sm font-semibold text-slate-950">
              Open account
            </Link>
          </div>
        </motion.div>
      )}
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOTER_COLS = [
  {
    title: "Platform",
    links: [
      { label: "iTrader Terminal", href: "/trading?platform=itrader"  },
      { label: "OLOS AI",          href: "/platform/olos-ai"  },
      { label: "Risk Management",  href: "/platform/risk"     },
      { label: "Account Funding",  href: "/platform/wallet"   },
      { label: "Academy",          href: "/platform/academy"  },
    ],
  },
  {
    title: "Markets",
    links: [
      { label: "Forex",       href: "/markets/forex"       },
      { label: "Indices",     href: "/markets/indices"     },
      { label: "Commodities", href: "/markets/commodities" },
      { label: "Crypto",      href: "/markets/crypto"      },
      { label: "Equities",    href: "/markets/equities"    },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About",    href: "/about"   },
      { label: "Careers",  href: "/careers" },
      { label: "Contact",  href: "/contact" },
      { label: "Press",    href: "/contact" },
      { label: "Blog",     href: "/about"   },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of use",     href: "/legal/terms"             },
      { label: "Privacy policy",   href: "/legal/privacy"           },
      { label: "Cookie policy",    href: "/legal/cookies"           },
      { label: "Risk disclosure",  href: "/legal/risk-disclosure"   },
      { label: "Client agreement", href: "/legal/client-agreement"  },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="bg-[#030712]">
      <div className="mx-auto max-w-[1200px] px-6 pb-12 pt-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400">
                <BarChart2 size={14} className="text-slate-950" strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-bold text-white">IGFXPRO</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-7 text-slate-500">
              Institutional-grade trading infrastructure with OLOS AI intelligence. Built for professionals.
            </p>
            <div className="mt-6 flex gap-3">
              {["twitter", "linkedin", "github"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-slate-600 transition hover:border-white/[0.12] hover:text-slate-400"
                  aria-label={s}
                >
                  <Globe size={13} />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLS.map(({ title, links }) => (
            <div key={title}>
              <h4 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link to={href} className="text-[13px] text-slate-500 transition hover:text-slate-300">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="my-10 border-t border-white/[0.04]" />

        <div className="rounded-lg border border-amber-400/[0.12] bg-amber-400/[0.04] px-5 py-4">
          <p className="text-[11px] leading-6 text-slate-500">
            <span className="font-semibold text-amber-400/80">Risk warning:</span>{" "}
            CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.
            A significant percentage of retail investor accounts lose money when trading CFDs.
            You should consider whether you understand how CFDs work and whether you can afford to take
            the high risk of losing your money. Prices shown are indicative only.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[12px] text-slate-600">© 2025 IGFX Global Ltd. All rights reserved.</p>
          <div className="flex flex-wrap gap-6">
            {[
              { l: "Privacy",  h: "/legal/privacy" },
              { l: "Terms",    h: "/legal/terms"   },
              { l: "Cookies",  h: "/legal/cookies" },
              { l: "Sitemap",  h: "#"              },
            ].map(({ l, h }) => (
              <Link key={l} to={h} className="text-[12px] text-slate-600 transition hover:text-slate-400">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#030712] antialiased">
      <PublicNav />
      <main className="pt-16">{children}</main>
      <PublicFooter />
    </div>
  );
}
