import { z } from "zod";

/**
 * Single source of truth for client-side configuration.
 * Parsed once at first access — invalid configuration fails fast at boot.
 */
const ClientEnvSchema = z.object({
  // Empty string = relative URL → Vite proxy forwards to backend (dev)
  // Absolute URL = direct connection (staging/prod)
  API_BASE_URL: z
    .string()
    .refine(
      (v) => {
        if (v === "") return true;          // relative — proxy handles it
        try { new URL(v); return true; }    // absolute — must be valid
        catch { return false; }
      },
      { message: "API_BASE_URL must be empty (relative) or an absolute URL" }
    )
    .default(""),

  WS_URL: z
    .string()
    .refine(
      (v) => v === "" || /^wss?:\/\//i.test(v),
      { message: "WS_URL must be empty or a ws:/wss: URL" }
    )
    .default(""),

  /** Sent on every API call — used for support / tracing correlation. */
  CLIENT_NAME: z.string().min(1).default("olos-terminal"),

  AUTH_SESSION_PATH: z
    .string()
    .startsWith("/")
    .default("/api/v1/auth/session"),

  AUTH_REFRESH_PATH: z
    .string()
    .startsWith("/")
    .default("/api/v1/auth/refresh/db"),

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

  /** Dev-only bypass: set VITE_AUTH_DEV_BYPASS=true in .env.local to skip real auth. */
  AUTH_DEV_BYPASS: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),

  /** JSON string of a fake principal to use when AUTH_DEV_BYPASS is active. */
  AUTH_DEV_PRINCIPAL_JSON: z.string().optional(),
});

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

let cached: ClientEnv | null = null;

function rawFromImportMeta(): Record<string, unknown> {
  return {
    // "" = relative → Vite proxy forwards /api/* and /ws to localhost:3000
    API_BASE_URL: import.meta.env.VITE_API_URL ?? "",
    WS_URL: import.meta.env.VITE_WS_URL ?? "",
    CLIENT_NAME: import.meta.env.VITE_CLIENT_NAME ?? "olos-terminal",
    AUTH_SESSION_PATH: import.meta.env.VITE_AUTH_SESSION_PATH ?? "/api/v1/auth/session",
    AUTH_REFRESH_PATH: import.meta.env.VITE_AUTH_REFRESH_PATH ?? "/api/v1/auth/refresh/db",
    FEATURE_FLAGS_PATH: import.meta.env.VITE_FEATURE_FLAGS_PATH ?? "/config/feature-flags",
    TENANT_RESOLVE_PATH: import.meta.env.VITE_TENANT_RESOLVE_PATH ?? "/tenant/active",
    LICENSE_VALIDATE_PATH:
      import.meta.env.VITE_LICENSE_VALIDATE_PATH ?? "/api/license/validate",
    MAINTENANCE_PATH: import.meta.env.VITE_MAINTENANCE_PATH ?? "/api/system/maintenance",
    STRICT_LICENSE: import.meta.env.VITE_STRICT_LICENSE,
    REQUEST_TIMEOUT_MS: import.meta.env.VITE_REQUEST_TIMEOUT_MS,
    WS_RECONNECT_MAX_MS: import.meta.env.VITE_WS_RECONNECT_MAX_MS,
    WS_HEARTBEAT_MS: import.meta.env.VITE_WS_HEARTBEAT_MS,
    AUTH_DEV_BYPASS: import.meta.env.VITE_AUTH_DEV_BYPASS,
    AUTH_DEV_PRINCIPAL_JSON: import.meta.env.VITE_AUTH_DEV_PRINCIPAL_JSON,
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

  cached = parsed.data;
  return cached;
}

export function resetClientEnvForTests(): void {
  cached = null;
}
