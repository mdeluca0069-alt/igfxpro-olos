// frontend/app/TierProvider.tsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ACCOUNT_TIER_SCHEMA,
  type AccountTier,
} from "../shared/schemas/auth.principal";
import {
  PRINCIPAL_CHANGED_EVENT,
  readStoredPrincipal,
} from "../shared/lib/principalStorage";

export type { AccountTier };

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

const TierContext = createContext<TierContextState | null>(null);

const capabilitiesMap: Record<AccountTier, TierCapabilities> = {
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

function readTierFromPrincipalStore(): AccountTier {
  const principal = readStoredPrincipal();
  if (!principal) return "STANDARD";
  const parsed = ACCOUNT_TIER_SCHEMA.safeParse(principal.tier);
  return parsed.success ? parsed.data : "STANDARD";
}

export const TierProvider: React.FC<TierProviderProps> = ({
  children,
}) => {
  const [tier, setTier] = useState<AccountTier>(readTierFromPrincipalStore);

  const syncFromStore = useCallback(() => {
    setTier(readTierFromPrincipalStore());
  }, []);

  useEffect(() => {
    syncFromStore();
    window.addEventListener(PRINCIPAL_CHANGED_EVENT, syncFromStore);
    return () => {
      window.removeEventListener(PRINCIPAL_CHANGED_EVENT, syncFromStore);
    };
  }, [syncFromStore]);

  const value = useMemo(() => {
    return {
      tier,
      capabilities: capabilitiesMap[tier],
    };
  }, [tier]);

  return (
    <TierContext.Provider value={value}>
      {children}
    </TierContext.Provider>
  );
};

export const useTier = () => {
  const context = useContext(TierContext);

  if (!context) {
    throw new Error("useTier must be used inside TierProvider");
  }

  return context;
};

export default TierProvider;
