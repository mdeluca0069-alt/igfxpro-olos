import { z } from "zod";

export const ACCOUNT_TIER_SCHEMA = z.enum([
  "STANDARD",
  "VIP",
  "GOLD",
  "PLATINUM",
  "ENTERPRISE",
]);

export type AccountTier = z.infer<typeof ACCOUNT_TIER_SCHEMA>;

/**
 * Canonical broker principal returned by `/auth/session` style endpoints.
 * Adjust fields to match your IdP / BFF contract — keep versioning explicit.
 */
export const PrincipalSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email().optional(),
  tenantId: z.string().min(1),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  tier: ACCOUNT_TIER_SCHEMA.default("STANDARD"),
  displayName: z.string().optional(),
});

export type Principal = z.infer<typeof PrincipalSchema>;

export const SessionTokensSchema = z
  .object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
  })
  .strict();

export type SessionTokens = z.infer<typeof SessionTokensSchema>;

/**
 * Normalizes common BFF shapes (camelCase / snake_case / nested `tokens`).
 */
export function parseTokenBundle(raw: unknown): SessionTokens {
  const root =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const nested =
    root.tokens && typeof root.tokens === "object"
      ? (root.tokens as Record<string, unknown>)
      : root;

  const accessToken =
    nested.accessToken ?? nested.access_token;
  const refreshToken =
    nested.refreshToken ?? nested.refresh_token;
  const tenantId = nested.tenantId ?? nested.tenant_id;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("Token bundle: missing accessToken");
  }

  return SessionTokensSchema.parse({
    accessToken,
    refreshToken:
      typeof refreshToken === "string" && refreshToken
        ? refreshToken
        : undefined,
    tenantId:
      typeof tenantId === "string" && tenantId ? tenantId : undefined,
  });
}

function normalizePrincipalShape(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const r = input as Record<string, unknown>;
  const rolesRaw = r.roles ?? r.role;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.filter((x): x is string => typeof x === "string")
    : typeof rolesRaw === "string"
      ? [rolesRaw]
      : [];

  const permsRaw = r.permissions ?? r.permission;
  const permissions = Array.isArray(permsRaw)
    ? permsRaw.filter((x): x is string => typeof x === "string")
    : typeof permsRaw === "string"
      ? [permsRaw]
      : [];

  return {
    sub: r.sub ?? r.id ?? r.userId ?? r.user_id,
    email: r.email,
    tenantId: r.tenantId ?? r.tenant_id,
    roles,
    permissions,
    tier: r.tier,
    displayName: r.displayName ?? r.name ?? r.display_name,
  };
}

/**
 * Accepts `{ principal }`, `{ user }`, `{ data }`, or a bare principal object.
 */
export function parsePrincipalFromSession(raw: unknown): Principal {
  const root =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let body: unknown = root;
  if ("data" in root && root.data !== undefined) body = root.data;
  if ("principal" in root && root.principal !== undefined) {
    body = root.principal;
  }
  if ("user" in root && root.user !== undefined) body = root.user;

  return PrincipalSchema.parse(normalizePrincipalShape(body));
}
