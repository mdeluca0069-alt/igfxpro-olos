export type UseAuthState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseAuth(): UseAuthState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseAuth;
