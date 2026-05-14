import type { TenantInfo } from "../../shared/schemas/tenant";
import { resolveActiveTenant } from "../services/tenant.service";

export type TenantConfig = TenantInfo;

export async function loadTenantConfig(): Promise<TenantConfig> {
  return resolveActiveTenant();
}

export async function loadTenantSettings(): Promise<void> {
  /* Wire to `/tenant/settings` when your BFF exposes it. */
}
