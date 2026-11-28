import React from "react";
import { SignInPage } from "./SignInPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  if (!user) return <SignInPage />;
  if (user.mustChangePassword) return <ChangePasswordPage />;
  return <>{children}</>;
}
