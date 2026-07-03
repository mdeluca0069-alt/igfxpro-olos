import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { brokerRequest, storeAuth, type TokenBundle } from "../../shared/lib/brokerApi";

export function AdminLoginFlow() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const bundle = await brokerRequest<TokenBundle>("/api/v1/auth/login/db", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      if (!bundle.accessToken) throw new Error("Credenziali admin non valide.");

      if (!bundle.principal.roles.some((role) => ["admin", "super_admin", "risk", "compliance"].includes(role))) {
        throw new Error("Questo account non ha permessi admin.");
      }

      storeAuth("admin", bundle);
      navigate("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login admin non completato.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#05070d] px-4 text-slate-200">
      <form className="w-full max-w-xl rounded-lg border border-slate-800 bg-slate-950/90 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.35)]" onSubmit={submit}>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
          <LockKeyhole size={14} />
          Admin secure access
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-white">Broker Control Center Login</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Area riservata ad admin, risk e compliance. Le API admin richiedono Bearer token e ruolo autorizzato.
        </p>
        <label className="mt-6 block text-sm text-slate-400">
          Email admin
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" name="email" required inputMode="email" placeholder="admin@igfxpro.local" />
        </label>
        <label className="mt-4 block text-sm text-slate-400">
          Password
          <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" name="password" required type="password" />
        </label>
        {error ? <div className="mt-5 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div> : null}
        <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={submitting} type="submit">
          <ShieldCheck size={18} />
          {submitting ? "Verifica ruolo admin..." : "Accedi al pannello admin"}
        </button>
        <p className="mt-4 rounded-lg bg-slate-900 p-3 text-xs text-slate-500">
          Credenziale locale seed: admin@igfxpro.local / OlosAdmin!2026
        </p>
      </form>
    </main>
  );
}

export default AdminLoginFlow;
