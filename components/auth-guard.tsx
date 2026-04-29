"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";

/**
 * Wraps dashboard routes. While Firebase resolves auth state, shows a
 * full-page loader. If no user is authenticated, redirects to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-500">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
