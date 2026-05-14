// frontend/app/BootLoader.tsx

import React, { useEffect, useRef, useState } from "react";

/**
 * ============================================
 * IMPORTS — CORE RUNTIME
 * ============================================
 */

import { initializeEnvironment } from "./bootstrap/environment.bootstrap";
import { initializeStores } from "./bootstrap/store.bootstrap";
import { restoreSession } from "./bootstrap/session.bootstrap";
import { connectRealtime } from "./runtime/realtime.runtime";
import { initializeAI } from "./runtime/ai.runtime";
import { loadTenantConfig } from "./runtime/tenant.runtime";
import { syncFeatureFlags } from "./runtime/feature.runtime";
import { initializeTelemetry } from "./telemetry/telemetry.bootstrap";
import { startHealthMonitoring } from "./runtime/health.runtime";
import { preloadCriticalData } from "./runtime/preload.runtime";

/**
 * ============================================
 * IMPORTS — PROVIDERS
 * ============================================
 */

import { ThemeProvider } from "./ThemeProvider";
import { TenantProvider } from "./TenantProvider";
import { TierProvider } from "./TierProvider";
import { FeatureFlagProvider } from "./FeatureFlagProvider";
import { LocaleProvider } from "./LocaleProvider";

/**
 * ============================================
 * IMPORTS — GUARDS
 * ============================================
 */

import { AuthGate } from "./AuthGate";
import { NetworkGuard } from "./NetworkGuard";
import { MaintenanceGuard } from "./MaintenanceGuard";
import { LicenseValidator } from "./LicenseValidator";

/**
 * ============================================
 * IMPORTS — APP
 * ============================================
 */

import { AppInitializer } from "./AppInitializer";
import { SessionRecovery } from "./SessionRecovery";
import { ServiceHealthChecker } from "./ServiceHealthChecker";
import { AppTelemetry } from "./AppTelemetry";
import { RoutePreloader } from "./RoutePreloader";
import { AppShell } from "./AppShell";

/**
 * ============================================
 * TYPES
 * ============================================
 */

type BootStage =
  | "idle"
  | "environment"
  | "stores"
  | "session"
  | "tenant"
  | "features"
  | "realtime"
  | "ai"
  | "preload"
  | "telemetry"
  | "ready"
  | "error";

interface BootError {
  code: string;
  message: string;
  fatal: boolean;
}

interface BootLoaderProps {
  children?: React.ReactNode;
}

/**
 * ============================================
 * LOADING SCREEN
 * ============================================
 */

const BootScreen = ({
  stage,
  progress,
}: {
  stage: BootStage;
  progress: number;
}) => {
  return (
    <div className="w-screen h-screen bg-[#050816] text-white flex items-center justify-center">
      <div className="w-[500px]">
        <div className="mb-6">
          <h1 className="text-4xl font-bold tracking-wide">
            OLOS TERMINAL
          </h1>

          <p className="text-gray-400 mt-2">
            Institutional Trading Infrastructure
          </p>
        </div>

        <div className="h-[6px] bg-[#1A2035] rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="mt-5 flex items-center justify-between text-sm text-gray-400">
          <span>Boot Stage</span>
          <span>{stage.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================
 * ERROR SCREEN
 * ============================================
 */

const FatalErrorScreen = ({ error }: { error: BootError }) => {
  return (
    <div className="w-screen h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-[600px]">
        <h1 className="text-4xl font-bold text-red-500">
          SYSTEM FAILURE
        </h1>

        <div className="mt-6 p-6 bg-[#111827] rounded-xl border border-red-500">
          <div className="mb-4">
            <span className="text-red-400 font-semibold">
              ERROR CODE:
            </span>{" "}
            {error.code}
          </div>

          <div className="text-gray-300">{error.message}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================
 * BOOTLOADER
 * ============================================
 */

export const BootLoader: React.FC<BootLoaderProps> = ({
  children,
}) => {
  /**
   * ============================================
   * STATE
   * ============================================
   */

  const [bootStage, setBootStage] =
    useState<BootStage>("idle");

  const [bootProgress, setBootProgress] = useState(0);

  const [isReady, setIsReady] = useState(false);

  const [bootError, setBootError] =
    useState<BootError | null>(null);

  const mountedRef = useRef(false);

  /**
   * ============================================
   * PROGRESS HELPER
   * ============================================
   */

  const updateProgress = (
    stage: BootStage,
    progress: number
  ) => {
    setBootStage(stage);
    setBootProgress(progress);
  };

  /**
   * ============================================
   * FAIL HANDLER
   * ============================================
   */

  const handleFatalError = (
    code: string,
    message: string
  ) => {
    setBootStage("error");

    setBootError({
      code,
      message,
      fatal: true,
    });
  };

  /**
   * ============================================
   * SYSTEM BOOTSTRAP
   * ============================================
   */

  const bootstrapApplication = async () => {
    try {
      /**
       * ============================================
       * ENVIRONMENT VALIDATION
       * ============================================
       */

      updateProgress("environment", 5);

      await initializeEnvironment();

      /**
       * ============================================
       * STORE HYDRATION
       * ============================================
       */

      updateProgress("stores", 12);

      await initializeStores();

      /**
       * ============================================
       * SESSION RESTORE
       * ============================================
       */

      updateProgress("session", 20);

      await restoreSession();

      /**
       * ============================================
       * TENANT CONFIG
       * ============================================
       */

      updateProgress("tenant", 30);

      const tenant = await loadTenantConfig();

      void tenant;

      /**
       * ============================================
       * FEATURE FLAGS
       * ============================================
       */

      updateProgress("features", 42);

      await syncFeatureFlags();

      /**
       * ============================================
       * REALTIME SYSTEMS
       * ============================================
       */

      updateProgress("realtime", 55);

      await connectRealtime();

      /**
       * ============================================
       * AI INITIALIZATION
       * ============================================
       */

      updateProgress("ai", 72);

      await initializeAI();

      /**
       * ============================================
       * CRITICAL DATA PRELOAD
       * ============================================
       */

      updateProgress("preload", 82);

      await preloadCriticalData();

      /**
       * ============================================
       * TELEMETRY
       * ============================================
       */

      updateProgress("telemetry", 91);

      await initializeTelemetry();

      /**
       * ============================================
       * HEALTH MONITORING
       * ============================================
       */

      startHealthMonitoring();

      /**
       * ============================================
       * READY STATE
       * ============================================
       */

      updateProgress("ready", 100);

      setTimeout(() => {
        setIsReady(true);
      }, 600);
    } catch (error: any) {
      console.error(error);

      handleFatalError(
        "BOOT_FAILURE",
        error?.message ||
          "Unexpected application bootstrap failure."
      );
    }
  };

  /**
   * ============================================
   * INITIALIZE ONCE
   * ============================================
   */

  useEffect(() => {
    if (mountedRef.current) return;

    mountedRef.current = true;

    bootstrapApplication();
  }, []);

  /**
   * ============================================
   * ERROR STATE
   * ============================================
   */

  if (bootError) {
    return <FatalErrorScreen error={bootError} />;
  }

  /**
   * ============================================
   * LOADING STATE
   * ============================================
   */

  if (!isReady) {
    return (
      <BootScreen
        stage={bootStage}
        progress={bootProgress}
      />
    );
  }

  /**
   * ============================================
   * APPLICATION RUNTIME
   * ============================================
   */

  return (
    <ThemeProvider>
      <LocaleProvider>
        <TenantProvider>
          <TierProvider>
            <FeatureFlagProvider>
              <LicenseValidator>
                <MaintenanceGuard>
                  <NetworkGuard>
                    <AuthGate>
                      <SessionRecovery>

                        {/* ========================================= */}
                        {/* APP RUNTIME SERVICES */}
                        {/* ========================================= */}

                        <AppTelemetry />

                        <ServiceHealthChecker />

                        <AppInitializer />

                        <RoutePreloader routes={[]} />

                        {/* ========================================= */}
                        {/* ROOT APPLICATION SHELL */}
                        {/* ========================================= */}

                        <AppShell>{children}</AppShell>

                      </SessionRecovery>
                    </AuthGate>
                  </NetworkGuard>
                </MaintenanceGuard>
              </LicenseValidator>
            </FeatureFlagProvider>
          </TierProvider>
        </TenantProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
};

export default BootLoader;