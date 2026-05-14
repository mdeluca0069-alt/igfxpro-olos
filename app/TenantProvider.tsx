import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TenantInfo } from "../shared/schemas/tenant";
import { FALLBACK_TENANT } from "../shared/schemas/tenant";
import { hydrateTenantFromApi } from "./services/tenant.service";

type TenantContextState = {
  tenant: TenantInfo;
  setTenant: (next: TenantInfo) => void;
};

const TenantContext = createContext<TenantContextState | null>(null);

type Props = {
  children: ReactNode;
};

export type { TenantInfo };

export function TenantProvider({ children }: Props) {
  const [tenant, setTenant] = useState<TenantInfo>(FALLBACK_TENANT);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await hydrateTenantFromApi();
        if (!cancelled) setTenant(next);
      } catch {
        if (!cancelled) setTenant(FALLBACK_TENANT);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      tenant,
      setTenant,
    }),
    [tenant]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used inside TenantProvider");
  }
  return ctx;
}

export default TenantProvider;
