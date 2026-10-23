import { env } from "./env";

let accessToken: string | undefined;
let refreshToken: string | undefined;
let refreshInFlight:
  Promise<{ accessToken: string; refreshToken: string } | null> | undefined;

class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
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
    return rawFetch<T>(path, options, accessToken);
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
    .catch(() => {
      setApiSession();
      return null;
    })
    .finally(() => {
      refreshInFlight = undefined;
    });
  return refreshInFlight;
}
