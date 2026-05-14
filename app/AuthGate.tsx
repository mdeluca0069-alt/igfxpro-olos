// frontend/app/AuthGate.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * =========================================================
 * TYPES
 * =========================================================
 */

interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  tenantId: string;
}

interface AuthContextState {
  authenticated: boolean;
  loading: boolean;
  user: AuthUser | null;
  token: string | null;
}

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * =========================================================
 * CONTEXT
 * =========================================================
 */

const AuthContext =
  createContext<AuthContextState | null>(null);

/**
 * =========================================================
 * MOCK API CALLS
 * Replace with real APIs
 * =========================================================
 */

const validateToken = async (
  token: string
): Promise<boolean> => {
  await new Promise((r) => setTimeout(r, 400));

  return !!token;
};

const refreshToken = async () => {
  return "new-access-token";
};

const fetchUser = async (): Promise<AuthUser> => {
  return {
    id: "usr_001",
    email: "user@olos.ai",
    role: "enterprise",
    permissions: [
      "trade.execute",
      "admin.access",
      "signals.view",
    ],
    tenantId: "tenant_001",
  };
};

/**
 * =========================================================
 * AUTH GATE
 * =========================================================
 */

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
}) => {
  const [state, setState] =
    useState<AuthContextState>({
      authenticated: false,
      loading: true,
      user: null,
      token: null,
    });

  /**
   * =========================================================
   * AUTH FLOW
   * =========================================================
   */

  const initializeAuth = async () => {
    try {
      let token =
        localStorage.getItem("access_token");

      /**
       * TOKEN VALIDATION
       */

      let valid = false;

      if (token) {
        valid = await validateToken(token);
      }

      /**
       * REFRESH TOKEN
       */

      if (!valid) {
        token = await refreshToken();
      }

      if (token) {
        localStorage.setItem("access_token", token);
      }

      /**
       * FAILED AUTH
       */

      if (!token) {
        return setState({
          authenticated: false,
          loading: false,
          user: null,
          token: null,
        });
      }

      /**
       * LOAD USER
       */

      const user = await fetchUser();

      /**
       * SUCCESS
       */

      setState({
        authenticated: true,
        loading: false,
        user,
        token,
      });
    } catch (error) {
      console.error("AuthGate Failed:", error);

      setState({
        authenticated: false,
        loading: false,
        user: null,
        token: null,
      });
    }
  };

  /**
   * =========================================================
   * INIT
   * =========================================================
   */

  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (state.loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        Authenticating...
      </div>
    );
  }

  /**
   * =========================================================
   * BLOCK ACCESS
   * =========================================================
   */

  if (!state.authenticated) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        Access Denied
      </div>
    );
  }

  /**
   * =========================================================
   * CONTEXT
   * =========================================================
   */

  const contextValue = useMemo(() => {
    return state;
  }, [state]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * =========================================================
 * HOOK
 * =========================================================
 */

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthGate"
    );
  }

  return context;
};

export default AuthGate;