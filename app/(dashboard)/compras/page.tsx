"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Truck,
  ClipboardList,
  ShoppingBag,
  Users,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  PackageCheck,
} from "lucide-react";
import { useCurrency } from "@/context/currency-context";
import { getPurchaseStats, type PurchaseStats } from "@/lib/firestore/purchases";

export default function ComprasPage() {
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPurchaseStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Solicitudes pendientes",
      value: stats?.pendingRequests ?? 0,
      icon: ClipboardList,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      href: "/compras/solicitudes",
    },
    {
      label: "Órdenes activas",
      value: stats?.pendingOrders ?? 0,
      icon: ShoppingBag,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      href: "/compras/ordenes",
    },
    {
      label: "Por recibir",
      value: stats?.ordersToReceive ?? 0,
      icon: PackageCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      href: "/compras/ordenes",
    },
    {
      label: "Saldo a proveedores",
      value: formatCurrency(stats?.pendingBalance ?? 0),
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      href: "/compras/ordenes",
      isCurrency: true,
    },
    {
      label: "Comprado este mes",
      value: formatCurrency(stats?.totalThisMonth ?? 0),
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      href: "/compras/ordenes",
      isCurrency: true,
    },
  ];

  const quickLinks = [
    {
      href: "/compras/solicitudes",
      icon: ClipboardList,
      label: "Solicitudes de compra",
      description: "Gestiona las necesidades internas de materiales",
    },
    {
      href: "/compras/ordenes",
      icon: ShoppingBag,
      label: "Órdenes de compra",
      description: "Crea y gestiona órdenes a proveedores",
    },
    {
      href: "/compras/proveedores",
      icon: Users,
      label: "Proveedores",
      description: "Directorio de proveedores y contactos",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Truck className="size-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Compras</h1>
          <p className="text-sm text-zinc-400">
            Proveedores, solicitudes y órdenes de compra
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors"
          >
            <div className={`size-8 rounded-lg ${card.bg} flex items-center justify-center`}>
              <card.icon className={`size-4 ${card.color}`} />
            </div>
            {loading ? (
              <div className="h-7 w-16 rounded bg-zinc-800 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-white">{card.value}</p>
            )}
            <p className="text-xs text-zinc-500 leading-tight">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick access */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Acceso rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex items-center gap-3 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors"
            >
              <div className="size-9 rounded-lg bg-zinc-800 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors shrink-0">
                <link.icon className="size-4 text-zinc-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                  {link.label}
                </p>
                <p className="text-xs text-zinc-500 truncate">{link.description}</p>
              </div>
              <ArrowRight className="size-4 text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
