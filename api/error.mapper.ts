import axios, { type AxiosError } from "axios";

export type ApiError =
  | {
      kind: "network";
      message: string;
      requestId?: string;
    }
  | {
      kind: "timeout";
      message: string;
      requestId?: string;
    }
  | {
      kind: "http";
      status: number;
      message: string;
      code?: string;
      requestId?: string;
      details?: unknown;
    }
  | {
      kind: "client";
      message: string;
      requestId?: string;
    };

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    typeof (value as ApiError).kind === "string"
  );
}

function readRequestId(error: AxiosError): string | undefined {
  const hdrs = error.response?.headers;
  const fromHeader =
    (hdrs?.["x-request-id"] as string | undefined) ??
    (hdrs?.["x-correlation-id"] as string | undefined);
  const fromCfg = (error.config?.headers?.["x-request-id"] ??
    error.config?.headers?.["X-Request-Id"]) as string | undefined;
  return fromHeader ?? fromCfg;
}

function readServerMessage(error: AxiosError): string {
  const data = error.response?.data as unknown;
  if (data && typeof data === "object") {
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
    const code = (data as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return code;
  }
  if (typeof error.message === "string" && error.message) return error.message;
  return "Request failed";
}

export function mapAxiosError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      kind: "client",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  const requestId = readRequestId(error);

  if (error.code === "ECONNABORTED") {
    return {
      kind: "timeout",
      message: "Upstream request timed out",
      requestId,
    };
  }

  if (error.response) {
    const status = error.response.status;
    return {
      kind: "http",
      status,
      message: readServerMessage(error),
      requestId,
      details: error.response.data,
    };
  }

  return {
    kind: "network",
    message: error.message || "Network error",
    requestId,
  };
}

export function formatApiError(err: ApiError): string {
  switch (err.kind) {
    case "http":
      return `[HTTP ${err.status}] ${err.message}`;
    case "timeout":
      return `[TIMEOUT] ${err.message}`;
    case "network":
      return `[NETWORK] ${err.message}`;
    default:
      return `[CLIENT] ${err.message}`;
  }
}
