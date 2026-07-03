import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { bootstrapClientAccount, type ClientTier } from "../../shared/lib/clientAccountStore";
import { brokerRequest, storeAuth, type TokenBundle } from "../../shared/lib/brokerApi";

const accountTypes: ClientTier[] = ["STANDARD", "GOLD", "PLATINUM", "VIP", "ENTERPRISE"];

export function RegisterFlow() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<ClientTier>("STANDARD");
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "Cliente IGFX PRO");
    const email = String(form.get("email") ?? "cliente@igfxpro.local");
    const password = String(form.get("password") ?? "");
    const country = String(form.get("country") ?? "IT");
    const authKey = String(form.get("authKey") ?? "");
    const referralCode = new URLSearchParams(window.location.search).get("ref") ?? undefined;

    try {
      const bundle = await brokerRequest<TokenBundle>("/api/v1/auth/register/db", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password, country, tier: accountType, authKey, referralCode }),
      });
      if (!bundle.accessToken) throw new Error("Auth key non valida o registrazione rifiutata.");
      storeAuth("client", bundle);
      localStorage.setItem("igfxpro_client_registered", "true");
      bootstrapClientAccount({ fullName: bundle.principal.fullName, email: bundle.principal.email, tier: bundle.principal.tier });
      navigate("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registrazione non completata.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-10 text-slate-200">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-slate-800 bg-slate-950/82 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            <UserPlus size={14} />
            Registrazione
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">Crea il profilo cliente IGFX PRO.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Il cliente compila dati base, auth key e modulo MiFID/appropriatezza. Dopo l'invio entra nella dashboard cliente.
          </p>
          <div className="mt-6 space-y-3">
            {[
              ["Auth key", "Codice invito o chiave operativa per abilitare il profilo."],
              ["Modulo MiFID", "Esperienza, obiettivi, rischio e conoscenza strumenti CFD."],
              ["Dashboard", "Profilo, capitale assegnato da admin, documenti, terminali e impostazioni."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="font-semibold text-white">{title}</div>
                <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <form className="rounded-lg border border-slate-800 bg-slate-950/82 p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-400">
              Nome completo
              <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" name="fullName" required placeholder="Mario Rossi" />
            </label>
            <label className="text-sm text-slate-400">
              Email
              <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" name="email" required inputMode="email" pattern="[^@\s]+@[^@\s]+\.[^@\s]+" placeholder="cliente@email.com" />
            </label>
            <label className="text-sm text-slate-400">
              Password
              <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" name="password" required minLength={8} type="password" />
            </label>
            <label className="text-sm text-slate-400">
              Auth key
              <div className="mt-2 flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3">
                <KeyRound size={18} className="text-cyan-300" />
              <input className="w-full bg-transparent p-3 text-white outline-none font-mono text-sm" name="authKey" required placeholder="IGFX-AUTH-KEY" defaultValue="IGFX-AUTH-KEY" readOnly />
              </div>
            </label>
            <label className="text-sm text-slate-400">
              Paese
              <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" name="country" defaultValue="IT">
                <option value="IT">Italia</option>
                <option value="DE">Germania</option>
                <option value="ES">Spagna</option>
                <option value="FR">Francia</option>
              </select>
            </label>
            <label className="text-sm text-slate-400">
              Categoria conto
              <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" value={accountType} onChange={(event) => setAccountType(event.target.value as ClientTier)}>
                {accountTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck size={18} className="text-cyan-300" />
              Modulo MiFID / appropriatezza
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-400">
                Esperienza trading
                <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">
                  <option>Principiante</option>
                  <option>Intermedio</option>
                  <option>Avanzato</option>
                  <option>Professionale</option>
                </select>
              </label>
              <label className="text-sm text-slate-400">
                Tolleranza rischio
                <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">
                  <option>Bassa</option>
                  <option>Media</option>
                  <option>Alta</option>
                </select>
              </label>
              <label className="text-sm text-slate-400">
                Obiettivo
                <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">
                  <option>Formazione guidata</option>
                  <option>Test piattaforma</option>
                  <option>Valutazione partnership</option>
                </select>
              </label>
              <label className="text-sm text-slate-400">
                Conoscenza CFD
                <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">
                  <option>Base</option>
                  <option>Buona</option>
                  <option>Elevata</option>
                </select>
              </label>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-slate-300">
              <input className="mt-1" required type="checkbox" checked={acceptedRisk} onChange={(event) => setAcceptedRisk(event.target.checked)} />
              Confermo di aver letto le condizioni operative e la disclosure sullo stato regolamentare della piattaforma.
            </label>
          </div>

          {error ? <div className="mt-5 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div> : null}

          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={!acceptedRisk || submitting} type="submit">
            <BadgeCheck size={18} />
            {submitting ? "Registro il profilo..." : "Completa registrazione e vai alla dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default RegisterFlow;
