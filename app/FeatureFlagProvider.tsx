// frontend/app/FeatureFlagProvider.tsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlags,
  FeatureFlagsSchema,
} from "../shared/schemas/featureFlags";
import { loadFeatureFlagsForShell } from "./services/featureFlags.service";

interface FeatureFlagContextState {
  flags: FeatureFlags;
  loading: boolean;
  isEnabled: (key: string) => boolean;
}

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

const FeatureFlagContext =
  createContext<FeatureFlagContextState | null>(null);

export const FeatureFlagProvider: React.FC<
  FeatureFlagProviderProps
> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);

  const isEnabled = useCallback(
    (key: string) => {
      if (!key) return true;
      if (!flags) return false;
      return Boolean(
        (flags as unknown as Record<string, boolean>)[key]
      );
    },
    [flags]
  );

  const contextValue = useMemo(() => {
    return {
      flags: flags ?? DEFAULT_FEATURE_FLAGS,
      loading,
      isEnabled,
    };
  }, [flags, loading, isEnabled]);

  useEffect(() => {
    const initializeFlags = async () => {
      try {
        const data = await loadFeatureFlagsForShell();
        const checked = FeatureFlagsSchema.safeParse(data);
        setFlags(checked.success ? checked.data : DEFAULT_FEATURE_FLAGS);
      } catch {
        setFlags(DEFAULT_FEATURE_FLAGS);
      } finally {
        setLoading(false);
      }
    };

    void initializeFlags();
  }, []);

  if (loading && !flags) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <div className="text-sm tracking-wide text-slate-400">
          Caricamento capability map…
        </div>
      </div>
    );
  }

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagContext);

  if (!context) {
    throw new Error(
      "useFeatureFlags must be used inside FeatureFlagProvider"
    );
  }

  return context;
};

export default FeatureFlagProvider;
