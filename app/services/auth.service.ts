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
      email: "dev@igfxpro.local",
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
  try {
    // Send empty body — browser automatically includes the igfxpro_rt httpOnly
    // cookie because getAuthHttp() has withCredentials: true. The backend reads
    // the cookie first, then falls back to the request body.
    const res = await getAuthHttp().post(env.AUTH_REFRESH_PATH, {});
    if (!res.data?.ok) return null;
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

    // DEV bypass: explicit opt-in only via AUTH_DEV_BYPASS=true env flag.
    // This must NEVER be set in production builds.
    if (import.meta.env.DEV && env.AUTH_DEV_BYPASS) {
      const principal = readDevPrincipalJson(env.AUTH_DEV_PRINCIPAL_JSON);
      const accessToken = `__olos_dev__${crypto.randomUUID?.() ?? Date.now()}`;
      tokenVault.setAccessToken(accessToken);
      tokenVault.setTenantId(principal.tenantId);
      writeStoredPrincipal(principal);
      return { ok: true, principal, accessToken };
    }

    // 1. Check in-memory access token from a previous call in this session
    let access = tokenVault.getAccessToken();

    // 2. Try silent refresh via httpOnly cookie (works after page reload)
    if (!access) {
      access = await exchangeRefreshToken();
    }

    // 3. No valid session — user must log in explicitly
    if (!access) {
      writeStoredPrincipal(null);
      return { ok: false, reason: "unauthenticated" };
    }

    // 4. Validate the access token against the backend
    let principal = await fetchSessionPrincipal(access);

    // 5. If token expired, try one more refresh via httpOnly cookie
    if (!principal) {
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
