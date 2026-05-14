import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { getClientEnv } from "../shared/config/clientEnv";
import { createCorrelationId } from "../shared/lib/correlationId";
import { createLogger } from "../shared/lib/logger";
import { tokenVault } from "../shared/lib/tokenVault";
import { getAuthHttp } from "./authHttp";
import { mapAxiosError } from "./error.mapper";
import { SessionTokensSchema } from "../shared/schemas/auth.principal";

const log = createLogger("http");
const kAuthRetry = Symbol("olos.authRetry");

let client: AxiosInstance | null = null;
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const env = getClientEnv();
    const refresh = tokenVault.getRefreshToken();
    if (!refresh) return null;

    try {
      const res = await getAuthHttp().post(
        env.AUTH_REFRESH_PATH,
        { refreshToken: refresh },
        { headers: { "x-skip-auth-refresh": "1" } }
      );

      const tokens = SessionTokensSchema.parse(res.data);
      tokenVault.setAccessToken(tokens.accessToken);
      if (tokens.refreshToken) {
        tokenVault.setRefreshToken(tokens.refreshToken);
      }
      if (tokens.tenantId) {
        tokenVault.setTenantId(tokens.tenantId);
      }
      return tokens.accessToken;
    } catch (e) {
      log.warn("refresh token exchange failed", {
        error: mapAxiosError(e),
      });
      tokenVault.clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function attachInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const env = getClientEnv();

    const headers = config.headers;
    headers.set("x-request-id", createCorrelationId());
    headers.set("x-client", env.CLIENT_NAME);

    const skipRefresh = headers.get("x-skip-auth-refresh") === "1";
    if (skipRefresh) {
      headers.delete("x-skip-auth-refresh");
      return config;
    }

    const access = tokenVault.getAccessToken();
    if (access) {
      headers.setAuthorization(`Bearer ${access}`, true);
    }

    const tenant = tokenVault.getTenantId();
    if (tenant) {
      headers.set("x-tenant-id", tenant, false);
    }

    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const cfg = error.config as (InternalAxiosRequestConfig & {
        [kAuthRetry]?: boolean;
      }) | undefined;

      const mapped = mapAxiosError(error);
      log.warn("request failed", { error: mapped });

      const status = error.response?.status;

      if (
        status === 401 &&
        cfg &&
        !cfg[kAuthRetry] &&
        !cfg.url?.includes(getClientEnv().AUTH_REFRESH_PATH)
      ) {
        cfg[kAuthRetry] = true;
        const next = await refreshAccessToken();
        if (next) {
          cfg.headers.setAuthorization(`Bearer ${next}`, true);
          return instance(cfg);
        }
      }

      if (status === 401) {
        tokenVault.clearSession();
        const returnTo = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`
        );
        window.location.assign(`/login?returnTo=${returnTo}`);
      }

      return Promise.reject(mapped);
    }
  );
}

export function getApiClient(): AxiosInstance {
  if (client) return client;

  const env = getClientEnv();
  client = axios.create({
    baseURL: env.API_BASE_URL,
    timeout: env.REQUEST_TIMEOUT_MS,
    withCredentials: true,
  });

  attachInterceptors(client);
  return client;
}
