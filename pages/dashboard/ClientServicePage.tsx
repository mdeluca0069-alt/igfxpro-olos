import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AlertTriangle, FileCheck2, History, Landmark, UploadCloud, Wallet } from "lucide-react";
import {
  createDepositRequest,
  createWithdrawRequest,
  getClientAccount,
  updateClientSetting,
  uploadClientDocument,
  type ClientAccountState,
  type ClientDocumentStatus,
  type LedgerEntry,
  type LedgerStatus,
} from "../../shared/lib/clientAccountStore";
import { brokerRequest } from "../../shared/lib/brokerApi";

function money(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: LedgerStatus | ClientDocumentStatus) {
  if (status === "APPROVED" || status === "COMPLETED") return "text-emerald-300";
  if (status === "PENDING_ADMIN" || status === "PENDING_REVIEW") return "text-amber-300";
  if (status === "REJECTED") return "text-rose-300";
  return "text-slate-400";
}

function ledgerLabel(type: LedgerEntry["type"]) {
  const labels: Record<LedgerEntry["type"], string> = {
    ADMIN_CAPITAL_ALLOCATION: "Allocazione admin",
    DEPOSIT_REQUEST: "Richiesta deposito",
    WITHDRAW_REQUEST: "Richiesta prelievo",
    MARGIN_RESERVED: "Margine riservato",
    DOCUMENT_EVENT: "Evento documento",
  };
  return labels[type];
}

function settingLabel(key: keyof ClientAccountState["settings"]) {
  const labels: Record<keyof ClientAccountState["settings"], string> = {
    olosNotifications: "Notifiche segnali OLOS",
    macroAlerts: "Avvisi evento macro",
    orderConfirmations: "Conferma ordine prima dell'invio",
    autopilotSupervision: "Autopilot solo con supervisione",
  };
  return labels[key];
}

function resolveService(param: string | undefined, pathname: string) {
  if (param) return param;
  if (pathname.includes("deposit")) return "deposit";
  if (pathname.includes("withdraw")) return "withdraw";
  if (pathname.includes("transactions")) return "transactions";
  return "capital";
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/82 p-5">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ClientServicePage() {
  const { service: serviceParam } = useParams();
  const location = useLocation();
  const service = resolveService(serviceParam, location.pathname);
  const [account, setAccount] = useState(() => getClientAccount());
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState("Bonifico bancario");
  const [withdrawMethod, setWithdrawMethod] = useState("Bonifico bancario");
  const [depositIban, setDepositIban] = useState("");
  const [depositCardNumber, setDepositCardNumber] = useState("");
  const [depositCardExpiry, setDepositCardExpiry] = useState("");
  const [depositCardCvc, setDepositCardCvc] = useState("");
  const [depositWalletAddress, setDepositWalletAddress] = useState("");
  const [depositWalletChain, setDepositWalletChain] = useState("");
  const [depositPaypalEmail, setDepositPaypalEmail] = useState("");
  const [withdrawIban, setWithdrawIban] = useState("");
  const [withdrawCardNumber, setWithdrawCardNumber] = useState("");
  const [withdrawCardExpiry, setWithdrawCardExpiry] = useState("");
  const [withdrawCardCvc, setWithdrawCardCvc] = useState("");
  const [withdrawWalletAddress, setWithdrawWalletAddress] = useState("");
  const [withdrawWalletChain, setWithdrawWalletChain] = useState("");
  const [withdrawPaypalEmail, setWithdrawPaypalEmail] = useState("");
  const [notice, setNotice] = useState("");
  const title = useMemo(() => {
    const labels: Record<string, string> = {
      deposit: "Deposito",
      withdraw: "Prelievo",
      transactions: "Storico transazioni",
      documents: "Documenti e verifica",
      settings: "Impostazioni",
      capital: "Capitale e risk management",
    };
    return labels[service] ?? "Servizio cliente";
  }, [service]);

  function refresh(nextState: ClientAccountState, message: string) {
    setAccount(nextState);
    setNotice(message);
  }

  function buildDepositDetails() {
    if (method === "Bonifico bancario") return depositIban.trim();
    if (method === "Carta di credito/debito") {
      const cardNumber = depositCardNumber.trim();
      const expiry = depositCardExpiry.trim();
      const cvc = depositCardCvc.trim();
      return [cardNumber, expiry, cvc].filter(Boolean).join(" / ");
    }
    if (method === "Wallet crypto controllato") {
      return [depositWalletAddress.trim(), depositWalletChain.trim()].filter(Boolean).join(" / ");
    }
    if (method === "PayPal") {
      return depositPaypalEmail.trim();
    }
    return "";
  }

  function buildWithdrawDestination() {
    if (withdrawMethod === "Bonifico bancario") return withdrawIban.trim();
    if (withdrawMethod === "Carta di credito/debito") {
      const cardNumber = withdrawCardNumber.trim();
      const expiry = withdrawCardExpiry.trim();
      const cvc = withdrawCardCvc.trim();
      return [cardNumber, expiry, cvc].filter(Boolean).join(" / ");
    }
    if (withdrawMethod === "Wallet crypto controllato") {
      return [withdrawWalletAddress.trim(), withdrawWalletChain.trim()].filter(Boolean).join(" / ");
    }
    if (withdrawMethod === "PayPal") {
      return withdrawPaypalEmail.trim();
    }
    return "";
  }

  useEffect(() => {
    let cancelled = false;
    brokerRequest<ClientAccountState>("/api/v1/client/account", { method: "GET" }, "client")
      .then((remoteAccount) => {
        if (!cancelled) setAccount(remoteAccount);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = buildDepositDetails();

    if (method === "Bonifico bancario" && !details) {
      setNotice("Inserisci un IBAN valido per il deposito.");
      return;
    }

    if (method === "Carta di credito/debito" && (!depositCardNumber.trim() || !depositCardExpiry.trim() || !depositCardCvc.trim())) {
      setNotice("Inserisci numero carta, scadenza e CVC per il deposito con carta.");
      return;
    }

    if (method === "Wallet crypto controllato" && !depositWalletAddress.trim()) {
      setNotice("Inserisci un indirizzo wallet valido per il deposito crypto.");
      return;
    }

    if (method === "PayPal" && !depositPaypalEmail.trim()) {
      setNotice("Inserisci un indirizzo PayPal valido per il deposito.");
      return;
    }

    try {
      const remoteAccount = await brokerRequest<ClientAccountState>("/api/v1/client/deposit", {
        method: "POST",
        body: JSON.stringify({ amount: Math.max(1, amount), method, details: details || undefined }),
      }, "client");
      refresh(remoteAccount, "Richiesta deposito registrata nel backend e inviata al controllo admin.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      if (caught instanceof TypeError || message.includes("Failed to fetch")) {
        refresh(createDepositRequest(Math.max(1, amount), method, details || undefined), "Richiesta deposito registrata localmente: backend non raggiungibile.");
      } else {
        setNotice(`Errore deposito: ${message}`);
      }
    }
  }

  async function submitWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const destination = buildWithdrawDestination();

    if (withdrawMethod === "Bonifico bancario" && !destination) {
      setNotice("Inserisci un IBAN valido per il prelievo.");
      return;
    }

    if (withdrawMethod === "Carta di credito/debito" && (!withdrawCardNumber.trim() || !withdrawCardExpiry.trim() || !withdrawCardCvc.trim())) {
      setNotice("Inserisci numero carta, scadenza e CVC per il prelievo con carta.");
      return;
    }

    if (withdrawMethod === "Wallet crypto controllato" && !withdrawWalletAddress.trim()) {
      setNotice("Inserisci un indirizzo wallet valido per il prelievo crypto.");
      return;
    }

    if (withdrawMethod === "PayPal" && !withdrawPaypalEmail.trim()) {
      setNotice("Inserisci un indirizzo PayPal valido per il prelievo.");
      return;
    }

    try {
      const remoteAccount = await brokerRequest<ClientAccountState>("/api/v1/client/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: Math.max(1, amount), destination, method: withdrawMethod }),
      }, "client");
      refresh(remoteAccount, "Richiesta prelievo registrata nel backend: KYC, AML e free margin vengono verificati.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      if (caught instanceof TypeError || message.includes("Failed to fetch")) {
        refresh(createWithdrawRequest(Math.max(1, amount), destination, withdrawMethod), "Richiesta prelievo registrata localmente: backend non raggiungibile.");
      } else {
        setNotice(`Errore prelievo: ${message}`);
      }
    }
  }

  async function uploadDocument(documentId: Parameters<typeof uploadClientDocument>[0], fileName: string, label: string) {
    try {
      const remoteAccount = await brokerRequest<ClientAccountState>("/api/v1/client/documents/upload", {
        method: "POST",
        body: JSON.stringify({ documentId, fileName }),
      }, "client");
      refresh(remoteAccount, `${label} caricato nel backend e mandato in revisione admin.`);
    } catch {
      refresh(uploadClientDocument(documentId, fileName), `${label} caricato localmente: backend non raggiungibile.`);
    }
  }

  function changeSetting(key: keyof ClientAccountState["settings"], value: boolean) {
    refresh(updateClientSetting(key, value), "Impostazione salvata sul profilo cliente.");
  }

  return (
    <main className="min-h-screen bg-[#05070d] p-5 text-slate-200">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">Dashboard cliente</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">Account {account.profile.tier} - capitale modificabile solo da workflow admin.</p>
        </div>
        <Link className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200" to="/dashboard">Torna alla dashboard</Link>
      </div>

      {notice ? (
        <div className="mb-5 rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm text-cyan-100">
          {notice}
        </div>
      ) : null}

      {service === "deposit" ? (
        <Panel title="Deposito capitale">
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <form className="space-y-4" onSubmit={submitDeposit}>
              <label className="block text-sm text-slate-400">
                Importo EUR
                <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" min={1} type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
              </label>
              <label className="block text-sm text-slate-400">
                Metodo
                <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" value={method} onChange={(event) => setMethod(event.target.value)}>
                  <option>Bonifico bancario</option>
                  <option>Carta di credito/debito</option>
                  <option>Wallet crypto controllato</option>
                  <option>PayPal</option>
                </select>
              </label>

              {method === "Bonifico bancario" ? (
                <label className="block text-sm text-slate-400">
                  IBAN
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                    placeholder="IT00X0000000000000000000000"
                    value={depositIban}
                    onChange={(event) => setDepositIban(event.target.value)}
                  />
                </label>
              ) : null}

              {method === "Carta di credito/debito" ? (
                <>
                  <label className="block text-sm text-slate-400">
                    Numero carta
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="0000 0000 0000 0000"
                      value={depositCardNumber}
                      onChange={(event) => setDepositCardNumber(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-400">
                    Scadenza
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="MM/AA"
                      value={depositCardExpiry}
                      onChange={(event) => setDepositCardExpiry(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-400">
                    CVC
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="123"
                      value={depositCardCvc}
                      onChange={(event) => setDepositCardCvc(event.target.value)}
                    />
                  </label>
                </>
              ) : null}

              {method === "Wallet crypto controllato" ? (
                <>
                  <label className="block text-sm text-slate-400">
                    Indirizzo wallet
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="0x..."
                      value={depositWalletAddress}
                      onChange={(event) => setDepositWalletAddress(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-400">
                    Chain
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="ETH, BSC, SOL"
                      value={depositWalletChain}
                      onChange={(event) => setDepositWalletChain(event.target.value)}
                    />
                  </label>
                </>
              ) : null}

              {method === "PayPal" ? (
                <label className="block text-sm text-slate-400">
                  PayPal email
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                    placeholder="nome@paypal.com"
                    value={depositPaypalEmail}
                    onChange={(event) => setDepositPaypalEmail(event.target.value)}
                  />
                </label>
              ) : null}

              <button className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950" type="submit">Crea richiesta deposito</button>
            </form>
            <div className="rounded-lg bg-slate-900 p-4">
              <Landmark className="text-cyan-300" />
              <p className="mt-3 text-sm leading-6 text-slate-400">
                La richiesta non aumenta il saldo da sola: entra in stato PENDING_ADMIN, poi il pannello admin approva, rifiuta o richiede documenti.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      {service === "withdraw" ? (
        <Panel title="Prelievo capitale">
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <form className="space-y-4" onSubmit={submitWithdraw}>
              <label className="block text-sm text-slate-400">
                Importo EUR
                <input className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" min={1} type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
              </label>
              <label className="block text-sm text-slate-400">
                Metodo prelievo
                <select className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" value={withdrawMethod} onChange={(event) => setWithdrawMethod(event.target.value)}>
                  <option>Bonifico bancario</option>
                  <option>Carta di credito/debito</option>
                  <option>Wallet crypto controllato</option>
                  <option>PayPal</option>
                </select>
              </label>

              {withdrawMethod === "Bonifico bancario" ? (
                <label className="block text-sm text-slate-400">
                  IBAN
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                    placeholder="IT00X0000000000000000000000"
                    value={withdrawIban}
                    onChange={(event) => setWithdrawIban(event.target.value)}
                  />
                </label>
              ) : null}

              {withdrawMethod === "Carta di credito/debito" ? (
                <>
                  <label className="block text-sm text-slate-400">
                    Numero carta
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="0000 0000 0000 0000"
                      value={withdrawCardNumber}
                      onChange={(event) => setWithdrawCardNumber(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-400">
                    Scadenza
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="MM/AA"
                      value={withdrawCardExpiry}
                      onChange={(event) => setWithdrawCardExpiry(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-400">
                    CVC
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="123"
                      value={withdrawCardCvc}
                      onChange={(event) => setWithdrawCardCvc(event.target.value)}
                    />
                  </label>
                </>
              ) : null}

              {withdrawMethod === "Wallet crypto controllato" ? (
                <>
                  <label className="block text-sm text-slate-400">
                    Indirizzo wallet
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="0x..."
                      value={withdrawWalletAddress}
                      onChange={(event) => setWithdrawWalletAddress(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-slate-400">
                    Chain
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                      placeholder="ETH, BSC, SOL"
                      value={withdrawWalletChain}
                      onChange={(event) => setWithdrawWalletChain(event.target.value)}
                    />
                  </label>
                </>
              ) : null}

              {withdrawMethod === "PayPal" ? (
                <label className="block text-sm text-slate-400">
                  PayPal email
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
                    placeholder="nome@paypal.com"
                    value={withdrawPaypalEmail}
                    onChange={(event) => setWithdrawPaypalEmail(event.target.value)}
                  />
                </label>
              ) : null}

              <button className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950" type="submit">Invia richiesta prelievo</button>
            </form>
            <div className="rounded-lg bg-slate-900 p-4">
              <UploadCloud className="text-cyan-300" />
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Se free margin, KYC o controlli AML non sono validi, la richiesta viene bloccata e resta auditabile nello storico.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      {service === "transactions" ? (
        <Panel title="Storico transazioni e audit">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr><th className="py-2">Data</th><th>Tipo</th><th>Importo</th><th>Stato</th><th>Riferimento</th><th>Nota</th></tr>
              </thead>
              <tbody>
                {account.ledger.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-800">
                    <td className="py-3">{dateTime(entry.createdAt)}</td>
                    <td>{ledgerLabel(entry.type)}</td>
                    <td className={entry.amount >= 0 ? "text-emerald-300" : "text-rose-300"}>{money(entry.amount)}</td>
                    <td className={statusClass(entry.status)}>{entry.status}</td>
                    <td>{entry.reference}</td>
                    <td className="max-w-sm text-slate-400">{entry.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      {service === "documents" ? (
        <Panel title="Carica documenti e verifica">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {account.documents.map((document) => (
              <div key={document.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <FileCheck2 className="text-cyan-300" />
                <div className="mt-3 font-semibold text-white">{document.label}</div>
                <div className={`mt-1 text-sm ${statusClass(document.status)}`}>{document.status}</div>
                {document.fileName ? <div className="mt-2 text-xs text-slate-500">{document.fileName}</div> : null}
                {document.rejectionReason ? <div className="mt-2 rounded bg-rose-400/10 p-2 text-xs text-rose-200">{document.rejectionReason}</div> : null}
                <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
                  {document.status === "REJECTED" ? "Ricarica" : "Carica"}
                  <input
                    className="sr-only"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadDocument(document.id, file.name, document.label);
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {service === "settings" ? (
        <Panel title="Impostazioni profilo">
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(account.settings) as Array<keyof ClientAccountState["settings"]>).map((key) => (
              <label key={key} className="flex items-center justify-between rounded-lg bg-slate-900 p-4 text-sm text-slate-300">
                <span>{settingLabel(key)}</span>
                <input type="checkbox" checked={account.settings[key]} onChange={(event) => changeSetting(key, event.target.checked)} />
              </label>
            ))}
          </div>
        </Panel>
      ) : null}

      {service === "capital" ? (
        <Panel title="Capitale, margine e profilo rischio">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Capitale assegnato", money(account.capital.allocated), "solo admin"],
              ["Equity", money(account.capital.equity), "capitale + PnL"],
              ["Free margin", money(account.capital.freeMargin), "disponibile"],
              ["Risk score", `${account.capital.riskScore}/100`, "profilo corrente"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-lg bg-slate-900 p-4">
                <Wallet className="text-cyan-300" />
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
                <div className="mt-1 text-xl font-semibold text-white">{value}</div>
                <div className="mt-1 text-xs text-slate-500">{detail}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              ["Leva massima retail", "FX 30:1, indici 20:1, commodity 10:1, crypto 2:1."],
              ["Stop-out", "Chiusura forzata se margin level scende sotto la soglia definita dal risk engine."],
              ["Drawdown guard", "Riduzione size, blocco Autopilot e avviso OLOS in volatilita estrema."],
            ].map(([label, body]) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <AlertTriangle className="text-amber-300" size={18} />
                <div className="mt-3 font-semibold text-white">{label}</div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/82 p-4 text-sm text-slate-400">
        <History className="mb-2 text-cyan-300" />
        Ogni azione cliente produce una voce ledger persistente. Le modifiche di capitale approvate restano responsabilita del Broker Control Center.
      </div>
    </main>
  );
}

export default ClientServicePage;
