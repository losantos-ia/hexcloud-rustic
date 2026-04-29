"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  ShoppingCart,
  Factory,
  Package,
  Truck,
  Wrench,
  Store,
  DollarSign,
  BarChart2,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "CRM", href: "/crm", icon: UserCheck },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Cotizaciones", href: "/cotizaciones", icon: FileText },
  { label: "Pedidos", href: "/pedidos", icon: ShoppingCart },
  { label: "Producción", href: "/produccion", icon: Factory },
  { label: "Inventario", href: "/inventario", icon: Package },
  { label: "Compras", href: "/compras", icon: Truck },
  { label: "Mantenimientos", href: "/mantenimientos", icon: Wrench },
  { label: "Tiendas", href: "/tiendas", icon: Store },
  { label: "Finanzas", href: "/finanzas", icon: DollarSign },
  { label: "Reportes", href: "/reportes", icon: BarChart2 },
  { label: "Configuración", href: "/configuracion", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-20 bg-black/60 lg:hidden",
          collapsed ? "hidden" : "block"
        )}
        onClick={() => setCollapsed(true)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col bg-zinc-950 border-r border-zinc-800 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-800 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-7 rounded-md bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-zinc-950 font-black text-xs">RA</span>
              </span>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate leading-tight">
                  Rustic Alexanders
                </p>
                <p className="text-amber-500 text-[10px] font-medium truncate leading-tight">
                  HEXCLOUD ERP
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <span className="size-7 rounded-md bg-amber-500 flex items-center justify-center mx-auto">
              <span className="text-zinc-950 font-black text-xs">RA</span>
            </span>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded ml-auto shrink-0"
              aria-label="Colapsar sidebar"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Toggle when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center h-10 w-full text-zinc-400 hover:text-white border-b border-zinc-800 transition-colors"
            aria-label="Expandir sidebar"
          >
            <Menu className="size-4" />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors group",
                  active
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )}
                />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-zinc-800 px-4 py-3 shrink-0">
            <p className="text-[10px] text-zinc-600 text-center">
              staging · v0.1.0
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
