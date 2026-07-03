export type PermissionsResult = {
  module: string;
  status: "ready";
  generatedAt: string;
};

export function createPermissions(): PermissionsResult {
  return {
    module: "Permissions",
    status: "ready",
    generatedAt: new Date().toISOString(),
  };
}

export const Permissions = createPermissions();

export default Permissions;
