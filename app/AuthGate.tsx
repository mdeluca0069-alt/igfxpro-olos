import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AccountTier, Principal } from "../shared/schemas/auth.principal";
import {
  bootstrapAuth,
  type AuthBootstrapResult,
} from "./services/auth.service";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  tenantId: string;
  tier: AccountTier;
}

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthViewContext = {
  authenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  token: string | null;
};

type AuthGateInternalState = AuthViewContext & {
  lastFailure: AuthBootstrapResult | null;
};

const AuthContext = createContext<AuthViewContext | null>(null);

function principalToAuthUser(p: Principal): AuthUser {
  return {
    id: p.sub,
    email: p.email ?? "",
    role: p.roles[0] ?? "trader",
    permissions: p.permissions,
    tenantId: p.tenantId,
    tier: p.tier,
  };
}

const Shell = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070b] px-6 text-center text-slate-100">
    <div className="max-w-md border border-slate-800 bg-[#0b1020] p-10 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">
        OLOS
      </p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{subtitle}</p>
    </div>
  </div>
);

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [state, setState] = useState<AuthGateInternalState>({
    authenticated: false,
    loading: true,
    user: null,
    token: null,
    lastFailure: null,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await bootstrapAuth();
      if (cancelled) return;

      if (result.ok) {
        setState({
          authenticated: true,
          loading: false,
          user: principalToAuthUser(result.principal),
          token: result.accessToken,
          lastFailure: null,
        });
        return;
      }

      setState({
        authenticated: false,
        loading: false,
        user: null,
        token: null,
        lastFailure: result,
      });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <Shell
        title="Autenticazione in corso"
        subtitle="Stabilimento sessione sicura e verifica credenziali presso il gateway istituzionale."
      />
    );
  }

  if (!state.authenticated) {
    const lf = state.lastFailure;
    const reason =
      lf && lf.ok === false ? lf.reason : "unauthenticated";
    const detail =
      lf && lf.ok === false && "detail" in lf ? lf.detail : undefined;

    return (
      <Shell
        title="Accesso non consentito"
        subtitle={
          reason === "unauthenticated"
            ? "Sessione assente o scaduta. Effettua l'accesso tramite il portale broker per continuare."
            : reason === "invalid_session"
              ? "La sessione non è più valida. Ripeti l'accesso per ottenere nuove credenziali."
              : `Autenticazione non completata (${reason}).${
                  detail ? ` Dettaglio: ${detail}` : ""
                }`
        }
      />
    );
  }

  const contextValue = useMemo(
    () => ({
      authenticated: state.authenticated,
      loading: state.loading,
      user: state.user,
      token: state.token,
    }),
    [state.authenticated, state.loading, state.user, state.token]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthGate");
  }

  return context;
};

export default AuthGate;
