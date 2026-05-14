// frontend/app/TierProvider.tsx

import React, {
  createContext,
  useContext,
  useMemo,
} from "react";

/**
 * =========================================================
 * TYPES
 * =========================================================
 */

export type AccountTier =
  | "STANDARD"
  | "VIP"
  | "GOLD"
  | "PLATINUM"
  | "ENTERPRISE";

interface TierCapabilities {
  aiSignals: boolean;
  marketDepth: boolean;
  multiAccount: boolean;
  executionPriority: boolean;
  hedgeTools: boolean;
}

interface TierContextState {
  tier: AccountTier;
  capabilities: TierCapabilities;
}

interface TierProviderProps {
  children: React.ReactNode;
}

/**
 * =========================================================
 * CONTEXT
 * =========================================================
 */

const TierContext =
  createContext<TierContextState | null>(null);

/**
 * =========================================================
 * CURRENT USER TIER
 * =========================================================
 */

const CURRENT_TIER: AccountTier = "ENTERPRISE";

/**
 * =========================================================
 * CAPABILITIES
 * =========================================================
 */

const capabilitiesMap: Record<
  AccountTier,
  TierCapabilities
> = {
  STANDARD: {
    aiSignals: false,
    marketDepth: false,
    multiAccount: false,
    executionPriority: false,
    hedgeTools: false,
  },

  VIP: {
    aiSignals: true,
    marketDepth: false,
    multiAccount: false,
    executionPriority: false,
    hedgeTools: false,
  },

  GOLD: {
    aiSignals: true,
    marketDepth: true,
    multiAccount: false,
    executionPriority: true,
    hedgeTools: false,
  },

  PLATINUM: {
    aiSignals: true,
    marketDepth: true,
    multiAccount: true,
    executionPriority: true,
    hedgeTools: true,
  },

  ENTERPRISE: {
    aiSignals: true,
    marketDepth: true,
    multiAccount: true,
    executionPriority: true,
    hedgeTools: true,
  },
};

/**
 * =========================================================
 * COMPONENT
 * =========================================================
 */

export const TierProvider: React.FC<
  TierProviderProps
> = ({ children }) => {
  const value = useMemo(() => {
    return {
      tier: CURRENT_TIER,
      capabilities:
        capabilitiesMap[CURRENT_TIER],
    };
  }, []);

  return (
    <TierContext.Provider value={value}>
      {children}
    </TierContext.Provider>
  );
};

/**
 * =========================================================
 * HOOK
 * =========================================================
 */

export const useTier = () => {
  const context = useContext(TierContext);

  if (!context) {
    throw new Error(
      "useTier must be used inside TierProvider"
    );
  }

  return context;
};

export default TierProvider;