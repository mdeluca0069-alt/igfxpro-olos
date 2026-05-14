import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TenantBranding = {
  accent: string;
  logoUrl?: string;
};

export type TenantInfo = {
  id: string;
  slug: string;
  name: string;
  region: string;
  branding: TenantBranding;
};

type TenantContextState = {
  tenant: TenantInfo;
  setTenant: (next: TenantInfo) => void;
};

const TenantContext = createContext<TenantContextState | null>(null);

const defaultTenant: TenantInfo = {
  id: "tenant_001",
  slug: "default",
  name: "OLOS Workspace",
  region: "eu-west",
  branding: { accent: "#22d3ee" },
};

type Props = {
  children: ReactNode;
};

export function TenantProvider({ children }: Props) {
  const [tenant, setTenant] = useState<TenantInfo>(defaultTenant);

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
