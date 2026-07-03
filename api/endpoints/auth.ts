import { getApiClient } from "../httpClient";
import { parsePrincipalFromSession, parseTokenBundle } from "../../shared/schemas/auth.principal";
import type { Principal } from "../../shared/schemas/auth.principal";
import { tokenVault } from "../../shared/lib/tokenVault";

export type LoginPayload = { email: string; password: string; authKey?: string };

export const AuthAPI = {
  async login(payload: LoginPayload): Promise<{ principal: Principal; accessToken: string }> {
    const res = await getApiClient().post<unknown>("/api/v1/auth/login/db", payload);
    const tokens = parseTokenBundle(res.data);
    tokenVault.setAccessToken(tokens.accessToken);
    if (tokens.tenantId) tokenVault.setTenantId(tokens.tenantId);
    const principal = parsePrincipalFromSession(res.data);
    return { principal, accessToken: tokens.accessToken };
  },

  async logout(): Promise<void> {
    try {
      await getApiClient().post("/api/v1/auth/logout");
    } finally {
      tokenVault.clearSession();
    }
  },

  async getSession(): Promise<Principal | null> {
    try {
      const res = await getApiClient().get<unknown>("/api/v1/auth/session");
      return parsePrincipalFromSession(res.data);
    } catch {
      return null;
    }
  },

  async refresh(): Promise<string | null> {
    try {
      const res = await getApiClient().post<unknown>("/api/v1/auth/refresh/db");
      const tokens = parseTokenBundle(res.data);
      tokenVault.setAccessToken(tokens.accessToken);
      if (tokens.tenantId) tokenVault.setTenantId(tokens.tenantId);
      return tokens.accessToken;
    } catch {
      tokenVault.clearSession();
      return null;
    }
  },
};

export default AuthAPI;
