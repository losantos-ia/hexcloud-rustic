"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { USER_ROLE_LABELS } from "@/types/user";

export function TopBar({ env }: { env: "staging" | "production" }) {
  const { user, signOut } = useAuth();

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 shrink-0">
      <div className="flex flex-1 items-center justify-between">
        <div />
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="hidden sm:block text-xs text-zinc-400">
                {user.displayName}
              </span>
              <span className="hidden sm:block text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded capitalize">
                {USER_ROLE_LABELS[user.role]}
              </span>
            </>
          )}
          {env === "staging" && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
              staging
            </span>
          )}
          <div className="size-8 rounded-full bg-amber-500 flex items-center justify-center">
            <span className="text-zinc-950 font-bold text-xs">{initials}</span>
          </div>
          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="size-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
