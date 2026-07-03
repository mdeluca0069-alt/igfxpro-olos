import { useState } from "react";
import { Bell, Globe, Key, LogOut, Moon, Shield, Smartphone } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { useOptionalAuth } from "../../app/AuthGate";
import { useTier } from "../../app/TierProvider";
import { clearAuth } from "../../shared/lib/brokerApi";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";
import clsx from "clsx";

type ToggleProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
};

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        {description && <div className="text-xs text-slate-500">{description}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-6 w-11 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400",
          checked ? "bg-cyan-400" : "bg-slate-700"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  usePageTitle("Settings");

  const auth     = useOptionalAuth();
  const { tier } = useTier();
  const navigate = useNavigate();

  const [notifs, setNotifs] = useState({
    olosSignals:       true,
    macroAlerts:       true,
    orderConfirmations: true,
    autopilotSupervision: true,
    marginWarnings:    true,
    priceAlerts:       false,
    emailDigest:       false,
    smsAlerts:         false,
  });

  const [appearance, setAppearance] = useState({
    theme: "dark" as "dark" | "light" | "system",
    language: "en",
    compactMode: false,
  });

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <main className="space-y-4 p-5 max-w-2xl">
      {/* Profile */}
      <Panel title="Account" eyebrow="profile">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-400/20 text-lg font-bold text-cyan-300">
              {auth?.user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div>
              <div className="font-semibold text-white">{auth?.user?.email ?? "user@igfxpro.local"}</div>
              <div className="text-xs text-slate-500">Tier: {tier}</div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Notifications */}
      <Panel title="Notifications" eyebrow={<span className="flex items-center gap-1"><Bell size={12} />alerts</span> as unknown as string}>
        <div className="space-y-2">
          <Toggle checked={notifs.olosSignals}        onChange={(v) => setNotifs((s) => ({ ...s, olosSignals: v }))}        label="OLOS AI signals"           description="Receive push notifications when a new signal is generated" />
          <Toggle checked={notifs.macroAlerts}        onChange={(v) => setNotifs((s) => ({ ...s, macroAlerts: v }))}        label="Macro event alerts"        description="NFP, FOMC, CPI countdown reminders" />
          <Toggle checked={notifs.marginWarnings}     onChange={(v) => setNotifs((s) => ({ ...s, marginWarnings: v }))}     label="Margin warnings"           description="Alert when margin level drops below 150%" />
          <Toggle checked={notifs.orderConfirmations} onChange={(v) => setNotifs((s) => ({ ...s, orderConfirmations: v }))} label="Order confirmations"       description="Show confirmation dialog before each order" />
          <Toggle checked={notifs.autopilotSupervision} onChange={(v) => setNotifs((s) => ({ ...s, autopilotSupervision: v }))} label="Autopilot supervision" description="Review each autopilot decision before execution" />
          <Toggle checked={notifs.priceAlerts}        onChange={(v) => setNotifs((s) => ({ ...s, priceAlerts: v }))}        label="Price alerts"              description="Notify when an instrument reaches your target price" />
          <Toggle checked={notifs.emailDigest}        onChange={(v) => setNotifs((s) => ({ ...s, emailDigest: v }))}        label="Daily email digest"        description="Summary of signals, P&L and events every morning" />
          <Toggle checked={notifs.smsAlerts}          onChange={(v) => setNotifs((s) => ({ ...s, smsAlerts: v }))}          label="SMS alerts (critical only)" description="Margin calls and kill switch events via SMS" />
        </div>
      </Panel>

      {/* Appearance */}
      <Panel title="Appearance" eyebrow={<span className="flex items-center gap-1"><Moon size={12} />display</span> as unknown as string}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Theme</label>
            <div className="mt-1 flex gap-2">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAppearance((s) => ({ ...s, theme: t }))}
                  className={clsx(
                    "flex-1 rounded-lg border py-2 text-sm font-semibold capitalize transition",
                    appearance.theme === t
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Language</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              value={appearance.language}
              onChange={(e) => setAppearance((s) => ({ ...s, language: e.target.value }))}
            >
              <option value="en">English</option>
              <option value="it">Italiano</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <Toggle checked={appearance.compactMode} onChange={(v) => setAppearance((s) => ({ ...s, compactMode: v }))} label="Compact mode" description="Reduce padding and font sizes for more data density" />
        </div>
      </Panel>

      {/* Security */}
      <Panel title="Security" eyebrow={<span className="flex items-center gap-1"><Shield size={12} />account protection</span> as unknown as string}>
        <div className="space-y-2">
          <button className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:bg-slate-800 transition">
            <div className="flex items-center gap-3"><Key size={16} className="text-slate-400" /><span>Change password</span></div>
            <span className="text-xs text-slate-500">→</span>
          </button>
          <button className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:bg-slate-800 transition">
            <div className="flex items-center gap-3"><Smartphone size={16} className="text-slate-400" /><span>Two-factor authentication</span></div>
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Not set</span>
          </button>
          <button className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:bg-slate-800 transition">
            <div className="flex items-center gap-3"><Globe size={16} className="text-slate-400" /><span>Active sessions</span></div>
            <span className="text-xs text-slate-500">→</span>
          </button>
        </div>
      </Panel>

      {/* Danger zone */}
      <Panel title="Session" eyebrow="danger zone">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/15 transition"
        >
          <LogOut size={16} />
          Sign out of all devices
        </button>
      </Panel>
    </main>
  );
}
