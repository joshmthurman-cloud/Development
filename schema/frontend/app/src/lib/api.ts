import { logger } from "./logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8901/api/v1";

interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  headers?: Record<string, string>;
}

let accessToken: string | null = null;
let storedRefreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setRefreshToken(token: string | null): void {
  storedRefreshToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshToken(): Promise<string | null> {
  if (!storedRefreshToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!res.ok) {
      logger.tokenRefreshFailure({ status: res.status });
      storedRefreshToken = null;
      return null;
    }

    const data = await res.json();
    accessToken = data.accessToken;
    storedRefreshToken = data.refreshToken;
    return accessToken;
  } catch {
    logger.tokenRefreshFailure({ error: "network_error" });
    return null;
  }
}

async function getValidToken(): Promise<string | null> {
  if (accessToken) return accessToken;

  if (!refreshPromise) {
    refreshPromise = refreshToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
  uiComponent = "API"
): Promise<T> {
  const token = await getValidToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const { body: rawBody, headers: _h, ...restOptions } = options;

  const config: RequestInit = {
    ...restOptions,
    headers,
    credentials: "include",
    ...(rawBody ? { body: JSON.stringify(rawBody) } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, config);

  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      const retry = await fetch(`${API_URL}${path}`, { ...config, headers });
      if (!retry.ok) {
        logger.apiError(retry.status, await retry.text(), uiComponent);
        throw new ApiClientError(retry.status, "Request failed after token refresh");
      }
      return retry.json();
    }

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiClientError(401, "Authentication required");
  }

  if (!res.ok) {
    const message = await res.text().catch(() => "Unknown error");
    logger.apiError(res.status, message, uiComponent);
    throw new ApiClientError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}
