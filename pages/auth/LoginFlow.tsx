import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck, Info } from "lucide-react";
import { brokerRequest, storeAuth, type TokenBundle } from "../../shared/lib/brokerApi";

const DEMO_ACCOUNTS = [
  { label: "Admin / Risk / Compliance", email: "admin@igfxpro.local", password: "OlosAdmin!2026" },
  { label: "Trader Demo", email: "trader@igfxpro.local", password: "OlosDemo!2026" },
];

const LOGIN_ENDPOINTS = [
  "/api/v1/auth/login/db",
  "/api/v1/auth/login",
  "/auth/session",
];

function friendlyError(raw: string): string {
  if (raw.includes("not implemented") || raw.includes("404"))
    return "Server non raggiungibile. Verifica che il backend sia avviato.";
  if (raw.includes("HTTP 5") || raw.includes("ECONNREFUSED") || raw.includes("Proxy error"))
    return "Server non raggiungibile. Avvia il backend (npm run dev in igfxpro-apiv2/) e riprova.";
  if (raw.includes("DB_UNAVAILABLE"))
    return "Database non disponibile. In modalità sandbox usa le credenziali demo sotto.";
  if (raw.includes("INVALID_CREDENTIALS") || raw.includes("invalid_credentials"))
    return "Email o password errate. In modalità sandbox usa le credenziali demo.";
  if (raw.includes("invalid_auth_key"))
    return "Auth key non valida.";
  if (raw.includes("GEO_BLOCKED"))
    return "Accesso bloccato per la tua area geografica.";
  if (raw.includes("network") || raw.includes("fetch"))
    return "Impossibile contattare il server. Controlla la connessione.";
  return raw;
}

export function LoginFlow() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");

  function fillDemo(email: string, password: string) {
    setFormEmail(email);
    setFormPassword(password);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      email:    String(form.get("email")   ?? ""),
      password: String(form.get("password") ?? ""),
      authKey:  String(form.get("authKey")  ?? ""),
    };

    let lastError = "";

    // Try each endpoint in order — first that works wins
    for (const endpoint of LOGIN_ENDPOINTS) {
      try {
        const bundle = await brokerRequest<TokenBundle>(endpoint, {
          method: "POST",
          body:   JSON.stringify(payload),
        });
        if (!bundle.accessToken) {
          lastError = "Credenziali o auth key non validi.";
          continue;
        }
        storeAuth("client", bundle);
        localStorage.setItem("igfxpro_client_registered", "true");
        navigate("/dashboard");
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Route not found → try next endpoint
        if (msg.includes("not implemented") || msg.includes("404")) continue;
        // Real auth error → stop and show
        lastError = friendlyError(msg);
        break;
      }
    }

    if (lastError) setError(lastError);
    else setError("Login non completato. Riprova.");
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-10 text-slate-200">
      <form className="mx-auto max-w-xl rounded-lg border border-slate-800 bg-slate-950/82 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]" onSubmit={submit}>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          <LogIn size={14} />
          Login cliente
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-white">Accedi alla dashboard IGFX PRO.</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          L'accesso abilita dashboard cliente, wallet, documenti e terminali iTrader/MT5.
        </p>
        <label className="mt-6 block text-sm text-slate-400">
          Email
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
            name="email" required inputMode="email" pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
            placeholder="cliente@email.com"
            value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
          />
        </label>
        <label className="mt-4 block text-sm text-slate-400">
          Password
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
            name="password" required type="password"
            value={formPassword} onChange={(e) => setFormPassword(e.target.value)}
          />
        </label>
        <label className="mt-4 block text-sm text-slate-400">
          Auth key
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white font-mono text-sm" name="authKey" required placeholder="IGFX-AUTH-KEY" defaultValue="IGFX-AUTH-KEY" readOnly />
        </label>
        {error ? <div className="mt-5 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div> : null}
        <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={submitting} type="submit">
          <ShieldCheck size={18} />
          {submitting ? "Verifica credenziali..." : "Accedi"}
        </button>
        <p className="mt-5 text-center text-sm text-slate-400">
          Non hai ancora un profilo? <Link className="font-semibold text-cyan-300" to="/register">Registrazione</Link>
        </p>
      </form>

      {/* Sandbox / Demo credentials hint */}
      <div className="mx-auto mt-6 max-w-xl rounded-lg border border-cyan-300/10 bg-cyan-300/5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-3">
          <Info size={14} />
          Credenziali demo (modalità sandbox)
        </div>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => fillDemo(a.email, a.password)}
              className="w-full rounded border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-left text-xs hover:border-cyan-300/40 hover:bg-slate-800/60 transition-colors"
            >
              <span className="text-slate-300 font-medium">{a.label}</span>
              <span className="ml-2 font-mono text-cyan-300/80">{a.email}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Clicca un account per compilare automaticamente i campi. Valido solo in modalità sandbox (no DATABASE_URL).
        </p>
      </div>
    </main>
  );
}

export default LoginFlow;
