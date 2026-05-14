const NS = "olos.terminal.v1.";

const LEGACY_ACCESS = "access_token";
const LEGACY_TENANT = "tenant_id";

let migrated = false;

function migrateLegacyOnce(): void {
  if (migrated) return;
  migrated = true;

  try {
    const legacyAccess = localStorage.getItem(LEGACY_ACCESS);
    if (legacyAccess && !localStorage.getItem(`${NS}accessToken`)) {
      localStorage.setItem(`${NS}accessToken`, legacyAccess);
    }
    const legacyTenant = localStorage.getItem(LEGACY_TENANT);
    if (legacyTenant && !localStorage.getItem(`${NS}tenantId`)) {
      localStorage.setItem(`${NS}tenantId`, legacyTenant);
    }
  } catch {
    /* storage may be unavailable in private mode */
  }
}

function read(key: string): string | null {
  migrateLegacyOnce();
  try {
    return localStorage.getItem(`${NS}${key}`);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  migrateLegacyOnce();
  try {
    if (value === null) localStorage.removeItem(`${NS}${key}`);
    else localStorage.setItem(`${NS}${key}`, value);
  } catch {
    /* ignore quota / privacy errors */
  }
}

/**
 * Namespaced credential + tenant storage. Keeps keys consistent across modules.
 */
export const tokenVault = {
  getAccessToken(): string | null {
    return read("accessToken");
  },

  setAccessToken(token: string | null): void {
    write("accessToken", token);
    try {
      if (token === null) localStorage.removeItem(LEGACY_ACCESS);
      else localStorage.setItem(LEGACY_ACCESS, token);
    } catch {
      /* best-effort legacy mirror */
    }
  },

  getRefreshToken(): string | null {
    return read("refreshToken");
  },

  setRefreshToken(token: string | null): void {
    write("refreshToken", token);
  },

  getTenantId(): string | null {
    return read("tenantId");
  },

  setTenantId(tenantId: string | null): void {
    write("tenantId", tenantId);
    try {
      if (tenantId === null) localStorage.removeItem(LEGACY_TENANT);
      else localStorage.setItem(LEGACY_TENANT, tenantId);
    } catch {
      /* ignore */
    }
  },

  clearSession(): void {
    this.setAccessToken(null);
    this.setRefreshToken(null);
  },
};
