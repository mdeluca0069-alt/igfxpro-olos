import { getClientEnv } from "../../shared/config/clientEnv";
import { createLogger } from "../../shared/lib/logger";
import {
  FALLBACK_TENANT,
  type TenantInfo,
  parseTenantPayload,
  TenantInfoSchema,
} from "../../shared/schemas/tenant";
import { getApiClient } from "../../api/httpClient";

const log = createLogger("tenant");

export async function resolveActiveTenant(): Promise<TenantInfo> {
  const env = getClientEnv();
  try {
    const res = await getApiClient().get(env.TENANT_RESOLVE_PATH);
    const parsed = parseTenantPayload(res.data);
    if (parsed) {
      return TenantInfoSchema.parse(parsed);
    }
  } catch (e) {
    log.warn("tenant resolve failed — using fallback tenant shell", {
      detail: String(e),
    });
  }
  return FALLBACK_TENANT;
}

export async function hydrateTenantFromApi(): Promise<TenantInfo> {
  return resolveActiveTenant();
}
