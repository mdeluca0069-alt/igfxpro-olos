/**
 * Production-safe API helpers.
 *
 * Key design principle: NEVER return fallback/mock data in production.
 * Failures must surface as thrown errors so React Query can display error states.
 * In development, MSW intercepts the requests — no hardcoded fallbacks needed.
 */
import { getClientEnv } from "../config/clientEnv";
import { tokenVault } from "./tokenVault";

function authHeaders(_scope: "client" | "admin" = "client"): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = tokenVault.getAccessToken();
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(
  path: string,
  scope: "client" | "admin" = "client"
): Promise<T> {
  const env = getClientEnv();
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    headers: authHeaders(scope),
    credentials: "include",
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    const message = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  const text = await res.text();
  return text ? JSON.parse(text) as T : undefined as unknown as T;
}

export async function apiPost<T>(
  path: string,
  data: unknown,
  scope: "client" | "admin" = "client"
): Promise<T> {
  const env = getClientEnv();
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    method:  "POST",
    headers: authHeaders(scope),
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    const message = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  const text = await res.text();
  return text ? JSON.parse(text) as T : undefined as unknown as T;
}

export async function apiPut<T>(
  path: string,
  data: unknown,
  scope: "client" | "admin" = "client"
): Promise<T> {
  const env = getClientEnv();
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    method:  "PUT",
    headers: authHeaders(scope),
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    const message = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  const text = await res.text();
  return text ? JSON.parse(text) as T : undefined as unknown as T;
}

export async function apiDelete<T = void>(
  path: string,
  scope: "client" | "admin" = "client"
): Promise<T> {
  const env = getClientEnv();
  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    method:  "DELETE",
    headers: authHeaders(scope),
    credentials: "include",
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* ignore */ }
    const message = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  const text = await res.text();
  return text ? JSON.parse(text) as T : undefined as unknown as T;
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
