export type AdminStoreSnapshot = {
  module: string;
  hydrated: boolean;
  updatedAt: string;
};

export const AdminStore = {
  module: "Admin Store",
  hydrated: true,
  updatedAt: new Date().toISOString(),
} satisfies AdminStoreSnapshot;

export default AdminStore;
