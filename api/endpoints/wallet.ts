export const WalletAPI = {
  namespace: "Wallet",
  list: async () => [] as unknown[],
  health: async () => ({ status: "ready" as const, namespace: "Wallet" }),
};

export default WalletAPI;
