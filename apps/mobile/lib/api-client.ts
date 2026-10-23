import * as SecureStore from "expo-secure-store";
import { env } from "./env";

const REFRESH_TOKEN_KEY = "schoolerp.auth.refresh-token";
let accessToken: string | undefined;
let refreshInFlight: Promise<MobileTokenPair | null> | undefined;

export interface MobileUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

export interface MobileTokenPair {
  accessToken: string;
  refreshToken: string;
  user: MobileUser;
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
    const body = (await res.json().catch(() => undefined)) as
      { message?: unknown } | undefined;
    const message =
      typeof body?.message === "string"
        ? body.message
        : `HTTP Error ${res.status}`;
    throw Object.assign(new Error(message), { statusCode: res.status });
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function storeSession(tokens: MobileTokenPair): Promise<void> {
  accessToken = tokens.accessToken;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function loginMobile(
  email: string,
  password: string,
): Promise<MobileUser> {
  const tokens = await rawFetch<MobileTokenPair>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await storeSession(tokens);
  return tokens.user;
}

export async function restoreMobileSession(): Promise<MobileUser | null> {
  const tokens = await rotateRefreshToken();
  return tokens?.user ?? null;
}

export async function logoutMobile(): Promise<void> {
  try {
    if (accessToken)
      await fetchMobileApi("/api/v1/auth/logout", { method: "POST" });
  } finally {
    accessToken = undefined;
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export async function changeMobilePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await fetchMobileApi("/api/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  accessToken = undefined;
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function fetchMobileApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await rawFetch<T>(path, options, accessToken);
  } catch (error) {
    if (
      (error as { statusCode?: number })?.statusCode !== 401 ||
      path.endsWith("/auth/login") ||
      path.endsWith("/auth/refresh")
    ) {
      throw error;
    }
    const tokens = await rotateRefreshToken();
    if (!tokens) throw error;
    return rawFetch<T>(path, options, accessToken);
  }
}

async function rotateRefreshToken(): Promise<MobileTokenPair | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    try {
      const tokens = await rawFetch<MobileTokenPair>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      await storeSession(tokens);
      return tokens;
    } catch {
      accessToken = undefined;
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      return null;
    }
  })().finally(() => {
    refreshInFlight = undefined;
  });
  return refreshInFlight;
}
