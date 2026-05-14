// frontend/app/AppInitializer.tsx

import React, { useEffect, useRef, useState } from "react";

/**
 * =========================================================
 * RUNTIME IMPORTS
 * =========================================================
 */

import { loadFeatureFlags } from "./runtime/feature.runtime";
import { loadTenantSettings } from "./runtime/tenant.runtime";
import { loadTheme } from "./runtime/theme.runtime";
import { loadLocalization } from "./runtime/locale.runtime";
import { loadTradingPreferences } from "./runtime/preferences.runtime";
import { loadWorkspace } from "./runtime/workspace.runtime";
import { loadIndicators } from "./runtime/indicator.runtime";
import { loadWatchlists } from "./runtime/watchlist.runtime";
import { loadAIProfiles } from "./runtime/ai.runtime";

/**
 * =========================================================
 * TYPES
 * =========================================================
 */

type InitializationStage =
  | "idle"
  | "tenant"
  | "features"
  | "theme"
  | "locale"
  | "preferences"
  | "workspace"
  | "indicators"
  | "watchlists"
  | "ai"
  | "completed"
  | "failed";

interface AppInitializerState {
  initialized: boolean;
  stage: InitializationStage;
  error: string | null;
}

/**
 * =========================================================
 * APP INITIALIZER
 * =========================================================
 */

export const AppInitializer: React.FC = () => {
  const initializedRef = useRef(false);

  const [, setState] = useState<AppInitializerState>({
    initialized: false,
    stage: "idle",
    error: null,
  });

  /**
   * =========================================================
   * UPDATE STAGE
   * =========================================================
   */

  const updateStage = (stage: InitializationStage) => {
    setState((prev) => ({
      ...prev,
      stage,
    }));
  };

  /**
   * =========================================================
   * INITIALIZATION PIPELINE
   * =========================================================
   */

  const initializeApplicationContent = async () => {
    try {
      /**
       * TENANT SETTINGS
       */

      updateStage("tenant");

      await loadTenantSettings();

      /**
       * FEATURE FLAGS
       */

      updateStage("features");

      await loadFeatureFlags();

      /**
       * THEME
       */

      updateStage("theme");

      await loadTheme();

      /**
       * LOCALIZATION
       */

      updateStage("locale");

      await loadLocalization();

      /**
       * USER TRADING PREFERENCES
       */

      updateStage("preferences");

      await loadTradingPreferences();

      /**
       * WORKSPACE
       */

      updateStage("workspace");

      await loadWorkspace();

      /**
       * INDICATORS
       */

      updateStage("indicators");

      await loadIndicators();

      /**
       * WATCHLISTS
       */

      updateStage("watchlists");

      await loadWatchlists();

      /**
       * AI PROFILES
       */

      updateStage("ai");

      await loadAIProfiles();

      /**
       * COMPLETED
       */

      updateStage("completed");

      setState({
        initialized: true,
        stage: "completed",
        error: null,
      });
    } catch (error: any) {
      console.error("AppInitializer Failed:", error);

      setState({
        initialized: false,
        stage: "failed",
        error:
          error?.message ||
          "Application initialization failed.",
      });
    }
  };

  /**
   * =========================================================
   * INITIALIZE ONCE
   * =========================================================
   */

  useEffect(() => {
    if (initializedRef.current) return;

    initializedRef.current = true;

    initializeApplicationContent();
  }, []);

  return null;
};

export default AppInitializer;