import { z } from "zod";

/**
 * Single source of truth for client-side configuration.
 * Parsed once at first access — invalid configuration fails fast at boot.
 */
const ClientEnvSchema = z.object({
  API_BASE_URL: z
    .string()
    .min(1, "VITE_API_URL (or default) must be a non-empty URL")
    .refine(
      (v) => {
        try {
          // eslint-disable-next-line no-new
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: "API base URL must be absolute (e.g. https://api.broker.com)" }
    ),

  WS_URL: z
    .string()
    .min(1)
    .refine((v) => /^wss?:\/\//i.test(v), {
      message: "VITE_WS_URL must be a ws: or wss: URL",
    }),

  /** Sent on every API call — used for support / tracing correlation. */
  CLIENT_NAME: z.string().min(1).default("olos-terminal"),

  AUTH_SESSION_PATH: z
    .string()
    .startsWith("/")
    .default("/auth/session"),

  AUTH_REFRESH_PATH: z
    .string()
    .startsWith("/")
    .default("/auth/refresh"),

  /**
   * When true (and only in Vite `development`), the auth layer may resolve
   * a synthetic principal. Never enable in production builds.
   */
  AUTH_DEV_BYPASS: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),

  /** Optional JSON string: overrides synthetic principal in dev bypass. */
  AUTH_DEV_PRINCIPAL_JSON: z.string().optional(),

  FEATURE_FLAGS_PATH: z
    .string()
    .startsWith("/")
    .default("/config/feature-flags"),

  TENANT_RESOLVE_PATH: z
    .string()
    .startsWith("/")
    .default("/tenant/active"),

  LICENSE_VALIDATE_PATH: z
    .string()
    .startsWith("/")
    .default("/api/license/validate"),

  MAINTENANCE_PATH: z
    .string()
    .startsWith("/")
    .default("/api/system/maintenance"),

  /** When "true", failed license HTTP calls block the shell (prod posture). */
  STRICT_LICENSE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),

  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),

  WS_RECONNECT_MAX_MS: z.coerce.number().int().min(1000).max(300_000).default(60_000),

  WS_HEARTBEAT_MS: z.coerce.number().int().min(0).max(120_000).default(25_000),
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

let cached: ClientEnv | null = null;

function rawFromImportMeta(): Record<string, unknown> {
  return {
    API_BASE_URL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
    WS_URL: import.meta.env.VITE_WS_URL ?? "ws://localhost:3000/ws",
    CLIENT_NAME: import.meta.env.VITE_CLIENT_NAME ?? "olos-terminal",
    AUTH_SESSION_PATH: import.meta.env.VITE_AUTH_SESSION_PATH ?? "/auth/session",
    AUTH_REFRESH_PATH: import.meta.env.VITE_AUTH_REFRESH_PATH ?? "/auth/refresh",
    AUTH_DEV_BYPASS: import.meta.env.VITE_AUTH_DEV_BYPASS,
    AUTH_DEV_PRINCIPAL_JSON: import.meta.env.VITE_AUTH_DEV_PRINCIPAL_JSON,
    FEATURE_FLAGS_PATH: import.meta.env.VITE_FEATURE_FLAGS_PATH ?? "/config/feature-flags",
    TENANT_RESOLVE_PATH: import.meta.env.VITE_TENANT_RESOLVE_PATH ?? "/tenant/active",
    LICENSE_VALIDATE_PATH:
      import.meta.env.VITE_LICENSE_VALIDATE_PATH ?? "/api/license/validate",
    MAINTENANCE_PATH: import.meta.env.VITE_MAINTENANCE_PATH ?? "/api/system/maintenance",
    STRICT_LICENSE: import.meta.env.VITE_STRICT_LICENSE,
    REQUEST_TIMEOUT_MS: import.meta.env.VITE_REQUEST_TIMEOUT_MS,
    WS_RECONNECT_MAX_MS: import.meta.env.VITE_WS_RECONNECT_MAX_MS,
    WS_HEARTBEAT_MS: import.meta.env.VITE_WS_HEARTBEAT_MS,
  };
}

export function getClientEnv(): ClientEnv {
  if (cached) return cached;

  const parsed = ClientEnvSchema.safeParse(rawFromImportMeta());
  if (!parsed.success) {
    const detail = parsed.error.flatten().fieldErrors;
    throw new Error(
      `[clientEnv] Invalid configuration: ${JSON.stringify(detail, null, 2)}`
    );
  }

  if (parsed.data.AUTH_DEV_BYPASS && import.meta.env.PROD) {
    throw new Error(
      "[clientEnv] AUTH_DEV_BYPASS must never be enabled in production builds."
    );
  }

  cached = parsed.data;
  return cached;
}

export function resetClientEnvForTests(): void {
  cached = null;
}
