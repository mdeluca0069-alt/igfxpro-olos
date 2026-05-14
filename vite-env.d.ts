/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_CLIENT_NAME?: string;
  readonly VITE_AUTH_SESSION_PATH?: string;
  readonly VITE_AUTH_REFRESH_PATH?: string;
  readonly VITE_AUTH_DEV_BYPASS?: string;
  readonly VITE_AUTH_DEV_PRINCIPAL_JSON?: string;
  readonly VITE_FEATURE_FLAGS_PATH?: string;
  readonly VITE_TENANT_RESOLVE_PATH?: string;
  readonly VITE_LICENSE_VALIDATE_PATH?: string;
  readonly VITE_MAINTENANCE_PATH?: string;
  readonly VITE_STRICT_LICENSE?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_WS_RECONNECT_MAX_MS?: string;
  readonly VITE_WS_HEARTBEAT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
