import { getClientEnv } from "../config/clientEnv";
import { tokenVault } from "./tokenVault";

export type AuthPrincipal = {
  sub:         string;
  email:       string;
  fullName:    string;
  tier:        "STANDARD" | "GOLD" | "PLATINUM" | "VIP" | "ENTERPRISE";
  roles:       string[];
  permissions: string[];
  kycStatus:   string;
};

export type TokenBundle = {
  accessToken:  string;
  refreshToken?: string;  // server sets httpOnly cookie; may also return token for dev
  expiresIn:    number;
  tokenType:    "Bearer";
  principal:    AuthPrincipal;
  tenantId:     string;
};

export type AuthScope = "client" | "admin";

/**
 * Returns auth headers. Access token from memory only — never localStorage.
 * The httpOnly refresh-token cookie is sent automatically by the browser.
 */
function buildHeaders(_scope?: AuthScope): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = tokenVault.getAccessToken();
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

export function getStoredToken(_scope?: AuthScope): string | null {
  return tokenVault.getAccessToken();
}

export function storeAuth(_scope: AuthScope, bundle: TokenBundle): void {
  tokenVault.setAccessToken(bundle.accessToken);
  tokenVault.setTenantId(bundle.tenantId);
  // refreshToken is managed as httpOnly cookie by the server
  // No localStorage writes
}

export function clearAuth(_scope?: AuthScope): void {
  tokenVault.clearSession();
  // Request server to clear the httpOnly cookie
  const env = getClientEnv();
  fetch(`${env.API_BASE_URL}/auth/logout`, {
    method:      "POST",
    credentials: "include",
    headers:     { "content-type": "application/json" },
  }).catch(() => { /* best-effort */ });
}

export async function brokerRequest<T>(
  path:    string,
  options: RequestInit = {},
  _scope?: AuthScope
): Promise<T> {
  const env = getClientEnv();
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    ...options,
    headers:     { ...buildHeaders(), ...Object(options.headers) },
    credentials: "include",  // sends httpOnly refresh-token cookie
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = typeof data?.message === "string" ? data.message : text || `HTTP ${res.status}`;
    throw new Error(message);
  }

  if (data && typeof data === "object" && data.ok === false) {
    const reason = typeof data.reason === "string" ? data.reason : "request_rejected";
    throw new Error(reason);
  }

  return data as T;
}
