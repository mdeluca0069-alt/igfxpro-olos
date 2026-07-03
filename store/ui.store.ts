export type UiStoreSnapshot = {
  module: string;
  hydrated: boolean;
  updatedAt: string;
};

export const UiStore = {
  module: "Ui Store",
  hydrated: true,
  updatedAt: new Date().toISOString(),
} satisfies UiStoreSnapshot;

export default UiStore;
