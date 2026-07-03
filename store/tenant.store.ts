export type TenantStoreSnapshot = {
  module: string;
  hydrated: boolean;
  updatedAt: string;
};

export const TenantStore = {
  module: "Tenant Store",
  hydrated: true,
  updatedAt: new Date().toISOString(),
} satisfies TenantStoreSnapshot;

export default TenantStore;
