// frontend/app/SessionRecovery.tsx

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

interface WorkspaceLayout {
  id: string;
  name: string;
  panels: any[];
}

interface SessionSnapshot {
  workspace: WorkspaceLayout | null;
  watchlists: string[];
  openCharts: string[];
  draftOrders: any[];
  aiState: Record<string, any>;
  marketSubscriptions: string[];
}

interface SessionRecoveryContextState {
  recovered: boolean;
  snapshot: SessionSnapshot | null;
  saveSession: (snapshot: SessionSnapshot) => void;
  clearSession: () => void;
}

interface SessionRecoveryProps {
  children: React.ReactNode;
}

/**
 * =========================================================
 * CONTEXT
 * =========================================================
 */

const SessionRecoveryContext =
  createContext<SessionRecoveryContextState | null>(
    null
  );

/**
 * =========================================================
 * STORAGE KEY
 * =========================================================
 */

const STORAGE_KEY = "olos_terminal_session";

/**
 * =========================================================
 * COMPONENT
 * =========================================================
 */

export const SessionRecovery: React.FC<
  SessionRecoveryProps
> = ({ children }) => {
  const [recovered, setRecovered] = useState(false);

  const [snapshot, setSnapshot] =
    useState<SessionSnapshot | null>(null);

  /**
   * =========================================================
   * RECOVER SESSION
   * =========================================================
   */

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);

        setSnapshot(parsed);
      }

      setRecovered(true);
    } catch (error) {
      console.error(
        "Session recovery failed:",
        error
      );

      setRecovered(true);
    }
  }, []);

  /**
   * =========================================================
   * SAVE SESSION
   * =========================================================
   */

  const saveSession = (
    nextSnapshot: SessionSnapshot
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextSnapshot)
      );

      setSnapshot(nextSnapshot);
    } catch (error) {
      console.error("Session save failed:", error);
    }
  };

  /**
   * =========================================================
   * CLEAR SESSION
   * =========================================================
   */

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);

    setSnapshot(null);
  };

  /**
   * =========================================================
   * CONTEXT VALUE
   * =========================================================
   */

  const contextValue = useMemo(() => {
    return {
      recovered,
      snapshot,
      saveSession,
      clearSession,
    };
  }, [recovered, snapshot]);

  /**
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (!recovered) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
        Recovering Session...
      </div>
    );
  }

  return (
    <SessionRecoveryContext.Provider
      value={contextValue}
    >
      {children}
    </SessionRecoveryContext.Provider>
  );
};

/**
 * =========================================================
 * HOOK
 * =========================================================
 */

export const useSessionRecovery = () => {
  const context = useContext(
    SessionRecoveryContext
  );

  if (!context) {
    throw new Error(
      "useSessionRecovery must be used inside SessionRecovery"
    );
  }

  return context;
};

export default SessionRecovery;