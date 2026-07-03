export type UseWorkspaceState = {
  status: "ready";
  source: "igfxpro-scaffold";
  updatedAt: string;
};

export function UseWorkspace(): UseWorkspaceState {
  return {
    status: "ready",
    source: "igfxpro-scaffold",
    updatedAt: new Date().toISOString(),
  };
}

export default UseWorkspace;
