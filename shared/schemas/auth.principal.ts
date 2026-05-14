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
