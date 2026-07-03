import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
function isPublicRoute(pathname: string): boolean {
  const exact = new Set(["/", "/register", "/login", "/admin", "/admin/login",
    "/about", "/contact", "/careers",
  ]);
  if (exact.has(pathname)) return true;
  return (
    pathname.startsWith("/markets/") ||
    pathname.startsWith("/legal/") ||
    pathname.startsWith("/platform/")
  );
}

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
  showLogin,
}: {
  title: string;
  subtitle: string;
  showLogin?: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070b] px-6 text-center text-slate-100">
      <div className="max-w-md border border-slate-800 bg-[#0b1020] p-10 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-400">
          OLOS
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{subtitle}</p>
        {showLogin && (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 w-full rounded-xl bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/25 border border-cyan-500/20"
          >
            Accedi →
          </button>
        )}
      </div>
    </div>
  );
};

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const location = useLocation();
  const isPublicPath = isPublicRoute(location.pathname);
  const [state, setState] = useState<AuthGateInternalState>({
    authenticated: false,
    loading: true,
    user: null,
    token: null,
    lastFailure: null,
  });

  useEffect(() => {
    // Already authenticated — no need to hit the server again on every navigation.
    if (state.authenticated) return;

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
    // Re-run when the path changes so a post-login navigate("/dashboard") is
    // picked up — bootstrapAuth reads the in-memory token set by storeAuth()
    // and validates it against /api/v1/auth/session.
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue = useMemo(
    () => ({
      authenticated: state.authenticated,
      loading: state.loading,
      user: state.user,
      token: state.token,
    }),
    [state.authenticated, state.loading, state.user, state.token]
  );

  if (state.loading && !isPublicPath) {
    return (
      <Shell
        title="Autenticazione in corso"
        subtitle="Stabilimento sessione sicura e verifica credenziali presso il gateway istituzionale."
      />
    );
  }

  if (!state.authenticated) {
    if (isPublicPath) {
      return <>{children}</>;
    }

    const lf = state.lastFailure;
    const reason =
      lf && lf.ok === false ? lf.reason : "unauthenticated";
    const detail =
      lf && lf.ok === false && "detail" in lf ? lf.detail : undefined;

    return (
      <Shell
        title="Accesso non consentito"
        showLogin
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

export const useOptionalAuth = () => {
  return useContext(AuthContext);
};

export default AuthGate;
