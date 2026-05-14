// frontend/app/FeatureFlagProvider.tsx

import React, {
  createContext,
  useCallback,
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

interface FeatureFlags {
  aiTrading: boolean;
  smartSignals: boolean;
  brokerControlCenter: boolean;
  hedgeAutomation: boolean;
  institutionalCharts: boolean;
}

interface FeatureFlagContextState {
  flags: FeatureFlags;
  loading: boolean;
  isEnabled: (key: string) => boolean;
}

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

/**
 * =========================================================
 * CONTEXT
 * =========================================================
 */

const FeatureFlagContext =
  createContext<FeatureFlagContextState | null>(
    null
  );

/**
 * =========================================================
 * MOCK FLAGS
 * =========================================================
 */

const fetchFlags =
  async (): Promise<FeatureFlags> => {
    return {
      aiTrading: true,
      smartSignals: true,
      brokerControlCenter: true,
      hedgeAutomation: true,
      institutionalCharts: true,
    };
  };

const EMPTY_FLAGS: FeatureFlags = {
  aiTrading: false,
  smartSignals: false,
  brokerControlCenter: false,
  hedgeAutomation: false,
  institutionalCharts: false,
};

/**
 * =========================================================
 * COMPONENT
 * =========================================================
 */

export const FeatureFlagProvider: React.FC<
  FeatureFlagProviderProps
> = ({ children }) => {
  const [flags, setFlags] =
    useState<FeatureFlags | null>(null);

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
      flags: flags ?? EMPTY_FLAGS,
      loading,
      isEnabled,
    };
  }, [flags, loading, isEnabled]);

  /**
   * =========================================================
   * LOAD FLAGS
   * =========================================================
   */

  useEffect(() => {
    const initializeFlags = async () => {
      try {
        const data = await fetchFlags();

        setFlags(data);
      } catch (error) {
        console.error(
          "Feature flag initialization failed:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    initializeFlags();
  }, []);

  if (loading && !flags) {
    return (
      <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
        Loading Features...
      </div>
    );
  }

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

/**
 * =========================================================
 * HOOK
 * =========================================================
 */

export const useFeatureFlags = () => {
  const context = useContext(
    FeatureFlagContext
  );

  if (!context) {
    throw new Error(
      "useFeatureFlags must be used inside FeatureFlagProvider"
    );
  }

  return context;
};

export default FeatureFlagProvider;