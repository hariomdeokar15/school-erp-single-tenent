import { env } from "./env";

let accessToken: string | undefined;
let refreshToken: string | undefined;
let refreshInFlight:
  Promise<{ accessToken: string; refreshToken: string } | null> | undefined;

function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("schoolerp:session-expired"));
  }
}

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

export function isApiUnavailableError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof ApiRequestError && error.statusCode >= 500)
  );
}

export function setApiSession(tokens?: {
  accessToken: string;
  refreshToken: string;
}) {
  accessToken = tokens?.accessToken;
  refreshToken = tokens?.refreshToken;
}

async function rawFetch<T>(
  path: string,
  options?: RequestInit,
  token?: string,
): Promise<T> {
  const url = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const responseBody = (await res.json().catch(() => undefined)) as
      { message?: unknown } | undefined;
    const message =
      typeof responseBody?.message === "string"
        ? responseBody.message
        : `HTTP Error ${res.status}: ${res.statusText}`;
    throw new ApiRequestError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await rawFetch<T>(path, options, accessToken);
  } catch (error) {
    if (
      !(error instanceof ApiRequestError) ||
      error.statusCode !== 401 ||
      !refreshToken ||
      path.endsWith("/auth/login") ||
      path.endsWith("/auth/refresh")
    ) {
      throw error;
    }
    const refreshed = await refreshApiSession();
    if (!refreshed) throw error;
    try {
      return await rawFetch<T>(path, options, accessToken);
    } catch (retryError) {
      if (
        retryError instanceof ApiRequestError &&
        retryError.statusCode === 401
      ) {
        setApiSession();
        notifySessionExpired();
      }
      throw retryError;
    }
  }
}

function refreshApiSession(): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  if (refreshInFlight) return refreshInFlight;
  const currentRefreshToken = refreshToken;
  if (!currentRefreshToken) return Promise.resolve(null);
  refreshInFlight = rawFetch<{ accessToken: string; refreshToken: string }>(
    "/api/v1/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    },
  )
    .then((tokens) => {
      setApiSession(tokens);
      return tokens;
    })
    .catch((error: unknown) => {
      // A network outage or API 5xx is not evidence that the user signed out.
      // Keep the refresh token so the next request can retry. Clear the session
      // only when the server explicitly rejects the refresh credentials.
      if (
        error instanceof ApiRequestError &&
        (error.statusCode === 401 || error.statusCode === 403)
      ) {
        setApiSession();
        notifySessionExpired();
      }
      return null;
    })
    .finally(() => {
      refreshInFlight = undefined;
    });
  return refreshInFlight;
}
