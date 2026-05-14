export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  region: string;
}

export async function loadTenantConfig(): Promise<TenantConfig | null> {
  return {
    id: "tenant_001",
    slug: "default",
    name: "OLOS Default Tenant",
    region: "eu-west",
  };
}

export async function loadTenantSettings(): Promise<void> {
  /* pull remote tenant overrides when API is ready */
}
