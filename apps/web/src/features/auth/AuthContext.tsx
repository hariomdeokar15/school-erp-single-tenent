import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchApi,
  getStoredSessionUser,
  setApiSession,
  updateStoredSessionUser,
} from "../../lib/api-client";

export interface SignedInUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: SignedInUser;
}

interface AuthContextValue {
  user: SignedInUser | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<SignedInUser | null>(() =>
    getStoredSessionUser<SignedInUser>() ?? null,
  );

  useEffect(() => {
    const onSessionExpired = () => setUser(null);
    window.addEventListener("schoolerp:session-expired", onSessionExpired);
    if (getStoredSessionUser<SignedInUser>()) {
      // Revalidate the cached identity after a reload or when a suspended tab resumes.
      // A temporary API outage should not discard the still-valid browser session.
      void fetchApi<SignedInUser>("/api/v1/auth/me")
        .then((currentUser) => {
          updateStoredSessionUser(currentUser);
          setUser(currentUser);
        })
        .catch(() => undefined);
    }
    return () =>
      window.removeEventListener("schoolerp:session-expired", onSessionExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await fetchApi<TokenPair>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setApiSession({ ...tokens, user: tokens.user });
    setUser(tokens.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchApi("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setApiSession();
      setUser(null);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await fetchApi("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setApiSession();
      setUser(null);
    },
    [],
  );

  const value = useMemo(
    () => ({ user, login, logout, changePassword }),
    [user, login, logout, changePassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
