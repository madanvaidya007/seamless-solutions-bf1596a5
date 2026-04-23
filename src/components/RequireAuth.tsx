import { ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth";
import { Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export function RequireAuth({
  children,
  allowed,
}: {
  children: ReactNode;
  allowed?: AppRole[];
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/sign-in" />;
  if (allowed && role && !allowed.includes(role)) {
    return (
      <AppShell>
        <div className="container mx-auto max-w-xl py-20 text-center">
          <h2 className="text-xl font-semibold">Access restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your role ({role}) doesn't have permission to view this page.
          </p>
        </div>
      </AppShell>
    );
  }
  return <AppShell>{children}</AppShell>;
}
