import { getClientEnv } from "../../shared/config/clientEnv";
import { createLogger } from "../../shared/lib/logger";
import {
  writeStoredPrincipal,
} from "../../shared/lib/principalStorage";
import { tokenVault } from "../../shared/lib/tokenVault";
import {
  type Principal,
  parsePrincipalFromSession,
  parseTokenBundle,
  PrincipalSchema,
} from "../../shared/schemas/auth.principal";
import { getAuthHttp } from "../../api/authHttp";

const log = createLogger("auth");

export type AuthBootstrapResult =
  | { ok: true; principal: Principal; accessToken: string }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "invalid_session"
        | "configuration"
        | "network";
      detail?: string;
    };

function readDevPrincipalJson(raw: string | undefined): Principal {
  if (!raw?.trim()) {
    return PrincipalSchema.parse({
      sub: "dev-user",
      tenantId: "tenant_dev",
      roles: ["admin"],
      permissions: ["trade.execute", "admin.access", "signals.view"],
      tier: "ENTERPRISE",
      email: "dev@localhost",
      displayName: "Development operator",
    });
  }
  return PrincipalSchema.parse(JSON.parse(raw));
}

async function fetchSessionPrincipal(
  accessToken: string
): Promise<Principal | null> {
  const env = getClientEnv();
  try {
    const res = await getAuthHttp().get(env.AUTH_SESSION_PATH, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return parsePrincipalFromSession(res.data);
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    if (err.response?.status === 401) return null;
    log.warn("session fetch failed", { detail: String(e) });
    return null;
  }
}

async function exchangeRefreshToken(): Promise<string | null> {
  const env = getClientEnv();
  const refresh = tokenVault.getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await getAuthHttp().post(env.AUTH_REFRESH_PATH, {
      refreshToken: refresh,
    });
    const tokens = parseTokenBundle(res.data);
    tokenVault.setAccessToken(tokens.accessToken);
    if (tokens.refreshToken) {
      tokenVault.setRefreshToken(tokens.refreshToken);
    }
    if (tokens.tenantId) {
      tokenVault.setTenantId(tokens.tenantId);
    }
    return tokens.accessToken;
  } catch {
    tokenVault.clearSession();
    return null;
  }
}

/**
 * Establishes an authenticated principal for the terminal shell.
 * Dev bypass is gated strictly to Vite development + explicit env flag.
 */
export async function bootstrapAuth(): Promise<AuthBootstrapResult> {
  try {
    const env = getClientEnv();

    if (import.meta.env.DEV && env.AUTH_DEV_BYPASS) {
      const principal = readDevPrincipalJson(env.AUTH_DEV_PRINCIPAL_JSON);
      const accessToken = `__olos_dev__${crypto.randomUUID?.() ?? Date.now()}`;
      tokenVault.setAccessToken(accessToken);
      tokenVault.setTenantId(principal.tenantId);
      writeStoredPrincipal(principal);
      return { ok: true, principal, accessToken };
    }

    let access = tokenVault.getAccessToken();

    if (!access) {
      access = await exchangeRefreshToken();
    }

    if (!access) {
      writeStoredPrincipal(null);
      return { ok: false, reason: "unauthenticated" };
    }

    let principal = await fetchSessionPrincipal(access);

    if (!principal && tokenVault.getRefreshToken()) {
      const next = await exchangeRefreshToken();
      if (next) {
        access = next;
        principal = await fetchSessionPrincipal(access);
      }
    }

    if (!principal) {
      tokenVault.clearSession();
      writeStoredPrincipal(null);
      return { ok: false, reason: "invalid_session" };
    }

    tokenVault.setAccessToken(access);
    tokenVault.setTenantId(principal.tenantId);
    writeStoredPrincipal(principal);

    return { ok: true, principal, accessToken: access };
  } catch (e) {
    log.error("bootstrapAuth failed", { detail: String(e) });
    return {
      ok: false,
      reason: "configuration",
      detail: String(e),
    };
  }
}

export function clearAuthSession(): void {
  tokenVault.clearSession();
  writeStoredPrincipal(null);
}
