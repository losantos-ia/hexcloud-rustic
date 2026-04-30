"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/sidebar-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        "flex flex-1 flex-col transition-all duration-300 ease-in-out min-w-0",
        "pl-0",
        collapsed ? "lg:pl-16" : "lg:pl-64"
      )}
    >
      {/* Mobile top bar — only visible below lg */}
      <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="size-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-md bg-amber-500 flex items-center justify-center shrink-0">
            <span className="text-zinc-950 font-black text-[10px]">RA</span>
          </span>
          <span className="text-white font-semibold text-sm">Rustic Alexanders</span>
        </div>
      </div>

      {children}
    </div>
  );
}
