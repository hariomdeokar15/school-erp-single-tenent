import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { fetchApi, setApiSession } from "../../lib/api-client";

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
  const [user, setUser] = useState<SignedInUser | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await fetchApi<TokenPair>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setApiSession(tokens);
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
