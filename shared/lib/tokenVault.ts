/**
 * Token storage abstraction.
 *
 * Security posture:
 * - Access tokens: stored in memory only (lost on page refresh — refreshed via httpOnly cookie).
 *   Never stored in localStorage or sessionStorage.
 * - Refresh tokens: stored as httpOnly cookies by the server. The browser sends them
 *   automatically; JavaScript cannot read them.
 * - Tenant ID: non-sensitive, stored in sessionStorage for cross-tab resilience.
 *
 * Migration from v1 (localStorage):
 * - On first access, any legacy localStorage token is erased and session is cleared.
 *   This forces a re-login via the refresh-cookie flow.
 */

const TENANT_KEY = "olos.tenantId.v2";

// In-memory access token — cleared on page navigation, refreshed via cookie
let _accessToken: string | null = null;

function eraseLegacyStorage(): void {
  try {
    const legacyKeys = [
      "olos.terminal.v1.accessToken",
      "olos.terminal.v1.refreshToken",
      "access_token",
      "tenant_id",
      "igfxpro_client_token",
      "igfxpro_admin_token",
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage may be unavailable */
  }
}

// Erase legacy on module load — one-time migration
eraseLegacyStorage();

export const tokenVault = {
  // ─── Access token (in-memory only) ──────────────────────────────────────────
  getAccessToken(): string | null {
    return _accessToken;
  },

  setAccessToken(token: string | null): void {
    _accessToken = token;
    // Explicit: never write to localStorage
  },

  // ─── Refresh token (httpOnly cookie — server-managed) ───────────────────────
  // JavaScript cannot read httpOnly cookies.
  // The browser sends them automatically with credentials: "include".
  // These methods are no-ops kept for API compatibility.
  getRefreshToken(): string | null   { return null; /* httpOnly cookie */ },
  setRefreshToken(_token: string | null): void { /* server-managed */ },

  // ─── Tenant ID (sessionStorage — not sensitive) ─────────────────────────────
  getTenantId(): string | null {
    try { return sessionStorage.getItem(TENANT_KEY); } catch { return null; }
  },

  setTenantId(tenantId: string | null): void {
    try {
      if (tenantId === null) sessionStorage.removeItem(TENANT_KEY);
      else sessionStorage.setItem(TENANT_KEY, tenantId);
    } catch { /* ignore */ }
  },

  // ─── Session management ──────────────────────────────────────────────────────
  clearSession(): void {
    _accessToken = null;
    try { sessionStorage.removeItem(TENANT_KEY); } catch { /* ignore */ }
    // The server must clear the httpOnly refresh-token cookie on logout.
    // Frontend cannot delete httpOnly cookies directly.
  },

  isAuthenticated(): boolean {
    return _accessToken !== null;
  },
};
