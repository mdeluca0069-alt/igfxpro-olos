export type ClientTier = "STANDARD" | "GOLD" | "PLATINUM" | "VIP" | "ENTERPRISE";

export type LedgerType =
  | "ADMIN_CAPITAL_ALLOCATION"
  | "DEPOSIT_REQUEST"
  | "WITHDRAW_REQUEST"
  | "MARGIN_RESERVED"
  | "DOCUMENT_EVENT";

export type LedgerStatus = "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "COMPLETED";

export type ClientDocumentStatus = "MISSING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type LedgerEntry = {
  id: string;
  createdAt: string;
  type: LedgerType;
  amount: number;
  status: LedgerStatus;
  reference: string;
  note: string;
};

export type ClientDocument = {
  id: "identity" | "address" | "appropriateness" | "source_of_funds";
  label: string;
  status: ClientDocumentStatus;
  updatedAt: string;
  fileName?: string;
  rejectionReason?: string;
};

export type ClientAccountState = {
  profile: {
    fullName: string;
    email: string;
    tier: ClientTier;
    authKeyStatus: "VERIFIED" | "PENDING";
    kycStatus: "NOT_STARTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    mifidStatus: "COMPLETED" | "PENDING";
  };
  capital: {
    allocated: number;
    equity: number;
    marginUsed: number;
    freeMargin: number;
    unrealizedPnl: number;
    riskScore: number;
  };
  ledger: LedgerEntry[];
  documents: ClientDocument[];
  settings: {
    olosNotifications: boolean;
    macroAlerts: boolean;
    orderConfirmations: boolean;
    autopilotSupervision: boolean;
  };
};

const STORAGE_KEY = "igfxpro_client_account_state";

const nowIso = () => new Date().toISOString();

const formatDateToken = () =>
  new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);

function createId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${formatDateToken()}-${random}`;
}

function normalizeTier(value: string | null): ClientTier {
  if (value === "GOLD" || value === "PLATINUM" || value === "VIP" || value === "ENTERPRISE") return value;
  return "STANDARD";
}

function initialState(): ClientAccountState {
  const tier = normalizeTier(localStorage.getItem("igfxpro_client_tier"));
  // NO AUTO-ALLOCATION: Cliente deve fare deposito, admin approva e assegna capitale
  const allocated = 0;
  const createdAt = nowIso();

  return {
    profile: {
      fullName: localStorage.getItem("igfxpro_client_name") ?? "Cliente IGFX PRO",
      email: localStorage.getItem("igfxpro_client_email") ?? "cliente@igfxpro.local",
      tier,
      authKeyStatus: "VERIFIED",
      kycStatus: "PENDING_REVIEW",
      mifidStatus: "COMPLETED",
    },
    capital: {
      allocated,
      equity: allocated,
      marginUsed: 0,
      freeMargin: allocated,
      unrealizedPnl: 0,
      riskScore: 12,
    },
    ledger: [],
    documents: [
      { id: "identity", label: "Documento identita", status: "MISSING", updatedAt: createdAt },
      { id: "address", label: "Prova indirizzo", status: "MISSING", updatedAt: createdAt },
      { id: "appropriateness", label: "Modulo appropriatezza MiFID", status: "APPROVED", updatedAt: createdAt },
      { id: "source_of_funds", label: "Fonte fondi", status: "MISSING", updatedAt: createdAt },
    ],
    settings: {
      olosNotifications: true,
      macroAlerts: true,
      orderConfirmations: true,
      autopilotSupervision: true,
    },
  };
}

function recalculateCapital(state: ClientAccountState): ClientAccountState {
  // Match backend logic: include approved allocations, approved deposits and approved withdrawals
  const allocated = state.ledger
    .filter(
      (entry) =>
        (entry.type === "ADMIN_CAPITAL_ALLOCATION" || entry.type === "DEPOSIT_REQUEST" || entry.type === "WITHDRAW_REQUEST") &&
        entry.status === "APPROVED"
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  const marginUsed = state.ledger
    .filter((entry) => entry.type === "MARGIN_RESERVED" && entry.status === "COMPLETED")
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const unrealizedPnl = state.capital.unrealizedPnl;
  const equity = allocated + unrealizedPnl;
  const freeMargin = Math.max(0, equity - marginUsed);
  const riskScore = Math.min(100, Math.round((marginUsed / Math.max(equity, 1)) * 100 + (freeMargin < equity * 0.25 ? 25 : 8)));

  return {
    ...state,
    capital: {
      ...state.capital,
      allocated,
      equity,
      marginUsed,
      freeMargin,
      unrealizedPnl,
      riskScore,
    },
  };
}

export function saveClientAccount(state: ClientAccountState) {
  const recalculated = recalculateCapital(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recalculated));
  localStorage.setItem("igfxpro_client_tier", recalculated.profile.tier);
  localStorage.setItem("igfxpro_client_name", recalculated.profile.fullName);
  localStorage.setItem("igfxpro_client_email", recalculated.profile.email);
  return recalculated;
}

export function getClientAccount(): ClientAccountState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return saveClientAccount(initialState());

  try {
    const parsed = JSON.parse(raw) as ClientAccountState;
    const nextState = {
      ...initialState(),
      ...parsed,
      profile: {
        ...initialState().profile,
        ...parsed.profile,
        tier: normalizeTier(localStorage.getItem("igfxpro_client_tier") ?? parsed.profile?.tier),
      },
    };
    return saveClientAccount(nextState);
  } catch {
    return saveClientAccount(initialState());
  }
}

export function bootstrapClientAccount(input: { fullName: string; email: string; tier: ClientTier }) {
  localStorage.setItem("igfxpro_client_tier", input.tier);
  localStorage.setItem("igfxpro_client_name", input.fullName);
  localStorage.setItem("igfxpro_client_email", input.email);
  localStorage.removeItem(STORAGE_KEY);
  return saveClientAccount({
    ...initialState(),
    profile: {
      ...initialState().profile,
      fullName: input.fullName,
      email: input.email,
      tier: input.tier,
    },
  });
}

export function createDepositRequest(amount: number, method: string, details?: string) {
  const state = getClientAccount();
  const entry: LedgerEntry = {
    id: createId("DEP"),
    createdAt: nowIso(),
    type: "DEPOSIT_REQUEST",
    amount,
    status: "PENDING_ADMIN",
    reference: details?.trim() || method,
    note: `Richiesta deposito ${method}${details ? `: ${details}` : ""} creata localmente: il capitale cambia solo dopo approvazione admin.`,
  };
  return saveClientAccount({ ...state, ledger: [entry, ...state.ledger] });
}

export function createWithdrawRequest(amount: number, destination: string, method: string) {
  const state = getClientAccount();
  const status: LedgerStatus = amount <= state.capital.freeMargin ? "PENDING_ADMIN" : "REJECTED";
  const entry: LedgerEntry = {
    id: createId("WDR"),
    createdAt: nowIso(),
    type: "WITHDRAW_REQUEST",
    amount: -Math.abs(amount),
    status,
    reference: destination || "DESTINATION_REQUIRED",
    note:
      status === "PENDING_ADMIN"
        ? `Richiesta prelievo ${method} verso ${destination} in coda admin/KYC/AML.`
        : "Prelievo rifiutato: free margin insufficiente.",
  };
  return saveClientAccount({ ...state, ledger: [entry, ...state.ledger] });
}

export function uploadClientDocument(documentId: ClientDocument["id"], fileName: string) {
  const state = getClientAccount();
  const updatedDocuments = state.documents.map((document) =>
    document.id === documentId
      ? { ...document, status: "PENDING_REVIEW" as const, fileName, rejectionReason: undefined, updatedAt: nowIso() }
      : document,
  );
  const entry: LedgerEntry = {
    id: createId("DOC"),
    createdAt: nowIso(),
    type: "DOCUMENT_EVENT",
    amount: 0,
    status: "PENDING_ADMIN",
    reference: documentId,
    note: `${fileName} caricato e in revisione.`,
  };
  return saveClientAccount({ ...state, documents: updatedDocuments, ledger: [entry, ...state.ledger] });
}

export function updateClientSetting(key: keyof ClientAccountState["settings"], value: boolean) {
  const state = getClientAccount();
  return saveClientAccount({
    ...state,
    settings: {
      ...state.settings,
      [key]: value,
    },
  });
}

export function adminAllocateCapital(amount: number, note: string) {
  const state = getClientAccount();
  const entry: LedgerEntry = {
    id: createId("ALLOC"),
    createdAt: nowIso(),
    type: "ADMIN_CAPITAL_ALLOCATION",
    amount,
    status: "APPROVED",
    reference: "BROKER_CONTROL_CENTER",
    note: note || "Allocazione capitale approvata da admin.",
  };
  return saveClientAccount({ ...state, ledger: [entry, ...state.ledger] });
}

export function adminReviewDocument(documentId: ClientDocument["id"], status: "APPROVED" | "REJECTED", rejectionReason?: string) {
  const state = getClientAccount();
  const updatedDocuments = state.documents.map((document) =>
    document.id === documentId
      ? {
          ...document,
          status,
          rejectionReason: status === "REJECTED" ? rejectionReason || "Documento non conforme. Caricare una versione aggiornata." : undefined,
          updatedAt: nowIso(),
        }
      : document,
  );
  const entry: LedgerEntry = {
    id: createId("DOC"),
    createdAt: nowIso(),
    type: "DOCUMENT_EVENT",
    amount: 0,
    status: status === "APPROVED" ? "APPROVED" : "REJECTED",
    reference: documentId,
    note: status === "APPROVED" ? "Documento approvato da admin." : rejectionReason || "Documento rifiutato da admin.",
  };
  return saveClientAccount({ ...state, documents: updatedDocuments, ledger: [entry, ...state.ledger] });
}

export function clearClientSession() {
  localStorage.removeItem("igfxpro_client_session");
}
