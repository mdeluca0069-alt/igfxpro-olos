export type TierStoreSnapshot = {
  module: string;
  hydrated: boolean;
  updatedAt: string;
};

export const TierStore = {
  module: "Tier Store",
  hydrated: true,
  updatedAt: new Date().toISOString(),
} satisfies TierStoreSnapshot;

export default TierStore;
