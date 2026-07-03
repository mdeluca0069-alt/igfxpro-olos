export type UseTenantState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseTenant(): UseTenantState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseTenant;
