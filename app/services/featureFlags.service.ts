import { getClientEnv } from "../../shared/config/clientEnv";
import { createLogger } from "../../shared/lib/logger";
import {
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlags,
  FeatureFlagsSchema,
  parseFeatureFlagsPayload,
} from "../../shared/schemas/featureFlags";
import { getApiClient } from "../../api/httpClient";

const log = createLogger("featureFlags");
const CACHE_KEY = "olos.terminal.featureFlags.cache.v1";
const CACHE_TTL_MS = 30_000;

type CacheEntry = { at: number; flags: FeatureFlags };

function readCache(): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(flags: FeatureFlags): void {
  try {
    const entry: CacheEntry = { at: Date.now(), flags };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

export async function primeFeatureFlagCache(): Promise<FeatureFlags> {
  const flags = await fetchRemoteFeatureFlags();
  writeCache(flags);
  return flags;
}

export async function fetchRemoteFeatureFlags(): Promise<FeatureFlags> {
  const env = getClientEnv();
  try {
    const res = await getApiClient().get(env.FEATURE_FLAGS_PATH);
    const parsed = parseFeatureFlagsPayload(res.data);
    const checked = FeatureFlagsSchema.safeParse(parsed);
    if (!checked.success) {
      log.warn("feature flags schema mismatch — using defaults", {
        issues: checked.error.flatten(),
      });
      return DEFAULT_FEATURE_FLAGS;
    }
    return checked.data;
  } catch (e) {
    log.warn("feature flags remote fetch failed — using defaults", {
      detail: String(e),
    });
    return DEFAULT_FEATURE_FLAGS;
  }
}

export async function loadFeatureFlagsForShell(): Promise<FeatureFlags> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    const chk = FeatureFlagsSchema.safeParse(cached.flags);
    if (chk.success) return chk.data;
  }
  const flags = await fetchRemoteFeatureFlags();
  writeCache(flags);
  return flags;
}
