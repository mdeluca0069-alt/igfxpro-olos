import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider }       from "./app/ThemeProvider";
import { LocaleProvider }      from "./app/LocaleProvider";
import { TenantProvider }      from "./app/TenantProvider";
import { TierProvider }        from "./app/TierProvider";
import { FeatureFlagProvider } from "./app/FeatureFlagProvider";
import { AuthGate }            from "./app/AuthGate";
import { NetworkGuard }        from "./app/NetworkGuard";

import { AppShell }       from "./app/AppShell";
import { AppRoutes }      from "./routes/AppRoutes";
import { ToastProvider }  from "./components/ui/Toast";
import { ConnectionStatus } from "./components/ui/ConnectionStatus";
import { MobileNav }      from "./components/layout/MobileNav";
import { CommandPalette } from "./components/layout/CommandPalette";
import { connectRealtime } from "./app/runtime/realtime.runtime";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5_000 },
  },
});

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/admin/login"]);

function AppInner() {
  const location = useLocation();
  const isPublic = PUBLIC_PATHS.has(location.pathname);

  useEffect(() => {
    void connectRealtime();
  }, []);

  return (
    <ThemeProvider>
      <LocaleProvider>
      <NetworkGuard>
        <TenantProvider>
          <TierProvider>
            <FeatureFlagProvider>
              <AuthGate>
                <ToastProvider>
                  <AppShell>
                    <AppRoutes />
                    <MobileNav />
                    <CommandPalette />
                  </AppShell>
                  {!isPublic && <ConnectionStatus />}
                </ToastProvider>
              </AuthGate>
            </FeatureFlagProvider>
          </TierProvider>
        </TenantProvider>
      </NetworkGuard>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
