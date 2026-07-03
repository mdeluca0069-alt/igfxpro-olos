/**
 * API Keys Management — IGFX OLOS Developer API
 * Generate, manage and revoke programmatic API keys.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, Plus, Trash2, Copy, CheckCircle2, Shield, Zap,
  Terminal, Globe, BookOpen,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../../shared/lib/apiHelpers";
// apiDelete is the standard helper — see shared/lib/apiHelpers.ts line 98
import { useToast } from "../../components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiKey = {
  id: string; name: string; keyPrefix: string;
  scopes: string[]; rateLimit: number; environment: "live" | "paper";
  enabled: boolean; lastUsedAt: string | null; requestCount: number;
  createdAt: string; expiresAt: string | null;
};

const SCOPE_INFO: Record<string, { label: string; desc: string; color: string }> = {
  read:  { label: "Read",  desc: "Market data, account info, signals", color: "#00d4ff" },
  trade: { label: "Trade", desc: "Place, modify and cancel orders",     color: "#00ff9f" },
  admin: { label: "Admin", desc: "Full access including admin ops",     color: "#ff9f00" },
};

const CODE_EXAMPLES = {
  python: `import requests

API_KEY = "igfx_live_your_key_here"

headers = {"X-Api-Key": API_KEY, "Content-Type": "application/json"}

# Get account info
r = requests.get("https://api.igfxpro.com/api/v1/account", headers=headers)
print(r.json())

# Place an order
r = requests.post("https://api.igfxpro.com/api/v1/trading/orders",
    headers=headers,
    json={"symbol": "EURUSD", "direction": "BUY",
          "quantity": 0.1, "orderType": "MARKET"})
print(r.json())`,

  javascript: `const API_KEY = "igfx_live_your_key_here";
const BASE = "https://api.igfxpro.com/api/v1";

const headers = { "X-Api-Key": API_KEY, "Content-Type": "application/json" };

// Get market quote
const quote = await fetch(\`\${BASE}/quotes/EURUSD\`, { headers }).then(r => r.json());
console.log(quote);

// Stream via WebSocket
const ws = new WebSocket("wss://api.igfxpro.com/ws");
ws.onopen = () => ws.send(JSON.stringify({ type: "auth", key: API_KEY }));
ws.onmessage = (e) => console.log(JSON.parse(e.data));`,

  curl: `# Get active signals
curl -H "X-Api-Key: igfx_live_your_key_here" \\
     https://api.igfxpro.com/api/v1/signals/active

# Place order
curl -X POST https://api.igfxpro.com/api/v1/trading/orders \\
     -H "X-Api-Key: igfx_live_your_key_here" \\
     -H "Content-Type: application/json" \\
     -d '{"symbol":"XAUUSD","direction":"BUY","quantity":0.01}'`,
};

// ─── Components ───────────────────────────────────────────────────────────────

function ScopeTag({ scope }: { scope: string }) {
  const info = SCOPE_INFO[scope] ?? { label: scope, color: "#00d4ff" };
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-data font-semibold border"
      style={{ borderColor: `${info.color}30`, color: info.color, background: `${info.color}10` }}>
      {info.label.toUpperCase()}
    </span>
  );
}

function ApiKeyRow({ k, onRevoke }: { k: ApiKey; onRevoke: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copyPrefix = () => {
    navigator.clipboard.writeText(k.keyPrefix + "***");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-white/[0.03]">
        <Key size={14} style={{ color: k.environment === "live" ? "#00ff9f" : "#ff9f00" }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-display font-semibold text-white/90">{k.name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-data font-bold ${
            k.environment === "live" ? "bg-[#00ff9f]/10 text-[#00ff9f]" : "bg-[#ff9f00]/10 text-[#ff9f00]"
          }`}>{k.environment.toUpperCase()}</span>
          {!k.enabled && <span className="px-1.5 py-0.5 rounded text-[9px] font-data bg-red-500/10 text-red-400">REVOKED</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="font-data">{k.keyPrefix}···</span>
          <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
          {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
          <span>{k.requestCount.toLocaleString()} calls</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {k.scopes.map(s => <ScopeTag key={s} scope={s} />)}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={copyPrefix} title="Copy prefix" className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-colors">
          {copied ? <CheckCircle2 size={12} style={{ color: "#00ff9f" }} /> : <Copy size={12} />}
        </button>
        {k.enabled && (
          <button onClick={() => onRevoke(k.id)} title="Revoke key" className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-red-400 hover:border-red-400/30 transition-colors">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const qc        = useQueryClient();
  const { success: toastSuccess } = useToast();

  const [showCreate, setShowCreate]       = useState(false);
  const [newKey,     setNewKey]           = useState<string | null>(null);
  const [form, setForm]                   = useState({ name: "", scopes: ["read"] as string[], environment: "live" as "live" | "paper", rateLimit: 600 });
  const [activeCodeTab, setActiveCodeTab] = useState<"python" | "javascript" | "curl">("python");
  const [showDocs, setShowDocs]           = useState(false);

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn:  () => apiGet("/api/v1/api-keys").then((r: any) => r.keys ?? []),
  });

  const createMut = useMutation({
    mutationFn: (f: typeof form) => apiPost("/api/v1/api-keys", f),
    onSuccess: (data: any) => {
      if (data.ok) {
        setNewKey(data.plaintext);
        qc.invalidateQueries({ queryKey: ["api-keys"] });
        setShowCreate(false);
      }
    },
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/api-keys/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["api-keys"] }); toastSuccess("API key revoked"); },
  });

  const toggleScope = (scope: string) => {
    setForm(f => ({
      ...f,
      scopes: f.scopes.includes(scope)
        ? f.scopes.filter(s => s !== scope)
        : [...f.scopes, scope],
    }));
  };

  return (
    <div className="min-h-screen bg-[#000] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
            <Terminal size={20} style={{ color: "#00d4ff" }} />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Developer API</h1>
            <p className="text-xs text-white/40">Programmatic access to IGFX OLOS — REST + WebSocket</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-display rounded-xl border border-white/10 text-white/50 hover:border-white/20 transition-all"
          >
            <BookOpen size={14} /> Docs
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-display font-semibold rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all"
          >
            <Plus size={14} /> New API Key
          </button>
        </div>
      </div>

      {/* New key reveal */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-panel-glow rounded-2xl p-5 border border-[#00ff9f]/20"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} style={{ color: "#00ff9f" }} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-display font-bold text-[#00ff9f] mb-2">API Key Created — Save it now</div>
                <div className="font-data text-xs text-white/80 bg-black/50 rounded-lg px-4 py-3 border border-white/10 break-all mb-3">
                  {newKey}
                </div>
                <p className="text-xs text-[#ff9f00]">⚠ This key will not be shown again. Copy and store it securely.</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(newKey); toastSuccess("Copied to clipboard"); setNewKey(null); }}
                className="btn-scan px-4 py-2 text-sm font-display font-semibold rounded-xl bg-[#00ff9f]/10 border border-[#00ff9f]/30 text-[#00ff9f]"
              >
                <Copy size={13} className="inline mr-1.5" /> Copy & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code examples */}
      <AnimatePresence>
        {showDocs && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex gap-1">
              {(["python", "javascript", "curl"] as const).map(lang => (
                <button key={lang} onClick={() => setActiveCodeTab(lang)}
                  className={`px-4 py-1.5 text-xs font-data rounded-lg transition-colors ${
                    activeCodeTab === lang ? "bg-[#00d4ff]/10 text-[#00d4ff]" : "text-white/30 hover:text-white/60"
                  }`}
                >{lang}</button>
              ))}
            </div>
            <pre className="p-5 text-xs font-data text-[#00ff9f]/80 overflow-x-auto leading-relaxed">
              {CODE_EXAMPLES[activeCodeTab]}
            </pre>
            <div className="p-4 border-t border-white/5 grid grid-cols-3 gap-3 text-xs">
              {[
                { icon: Zap, label: "Rate limit", value: "600 req/min (default)" },
                { icon: Shield, label: "Auth header", value: "X-Api-Key: igfx_..." },
                { icon: Globe, label: "Base URL", value: "api.igfxpro.com/api/v1" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 text-white/40">
                  <Icon size={12} style={{ color: "#00d4ff" }} />
                  <span>{label}: <span className="font-data text-white/60">{value}</span></span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys list */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={14} style={{ color: "#00d4ff" }} />
            <span className="text-xs font-data text-white/40 uppercase tracking-widest">Your API Keys</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[10px] font-data">{keys.length}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-white/30 text-sm">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center">
            <Key size={32} className="mx-auto mb-3 text-white/10" />
            <p className="text-white/30 text-sm">No API keys yet</p>
            <p className="text-white/20 text-xs mt-1">Create a key to access IGFX programmatically</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {keys.map(k => <ApiKeyRow key={k.id} k={k} onRevoke={id => revokeMut.mutate(id)} />)}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="glass-panel-glow rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-display font-bold text-white">Create API Key</h3>

              <div>
                <label className="text-xs font-data text-white/40 block mb-1.5">KEY NAME</label>
                <input
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-display text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]/40"
                  placeholder="My trading bot"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-data text-white/40 block mb-2">PERMISSIONS</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(SCOPE_INFO).map(([scope, info]) => (
                    <button
                      key={scope}
                      onClick={() => toggleScope(scope)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display border transition-all ${
                        form.scopes.includes(scope)
                          ? "border-current/30 text-current"
                          : "border-white/10 text-white/30"
                      }`}
                      style={form.scopes.includes(scope) ? { color: info.color, borderColor: `${info.color}40`, background: `${info.color}10` } : {}}
                    >
                      {form.scopes.includes(scope) ? <CheckCircle2 size={11} /> : <div className="w-2.5 h-2.5 rounded-full border border-current" />}
                      {info.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/20 mt-1.5">
                  {form.scopes.map(s => SCOPE_INFO[s]?.desc).filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-data text-white/40 block mb-1.5">ENVIRONMENT</label>
                  <div className="flex rounded-xl overflow-hidden border border-white/10">
                    {(["live", "paper"] as const).map(env => (
                      <button key={env} onClick={() => setForm(f => ({ ...f, environment: env }))}
                        className={`flex-1 py-2 text-xs font-display transition-colors ${
                          form.environment === env
                            ? env === "live" ? "bg-[#00ff9f]/20 text-[#00ff9f]" : "bg-[#ff9f00]/20 text-[#ff9f00]"
                            : "text-white/30"
                        }`}>{env}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-data text-white/40 block mb-1.5">RATE LIMIT (req/min)</label>
                  <input
                    type="number"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm font-data text-white focus:outline-none focus:border-[#00d4ff]/40"
                    value={form.rateLimit}
                    onChange={e => setForm(f => ({ ...f, rateLimit: parseInt(e.target.value) || 600 }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm font-display hover:border-white/20 transition-colors">Cancel</button>
                <button
                  onClick={() => createMut.mutate(form)}
                  disabled={!form.name || form.scopes.length === 0 || createMut.isPending}
                  className="flex-1 py-3 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-display font-semibold hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-40"
                >
                  {createMut.isPending ? "Creating..." : "Generate Key"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
