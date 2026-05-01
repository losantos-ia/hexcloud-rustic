"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listPurchaseOrders, deletePurchaseOrder } from "@/lib/firestore/purchases";
import type { PurchaseOrder } from "@/types/purchases";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_PAYMENT_STATUS_LABELS,
} from "@/types/purchases";
import { useCurrency } from "@/context/currency-context";

const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-zinc-700/40 text-zinc-400 border-zinc-600/40",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  confirmed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  partially_received: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  received: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-zinc-700/20 text-zinc-500 border-zinc-700/30",
};

const PAYMENT_VARIANT: Record<string, string> = {
  unpaid: "text-red-400",
  partial: "text-amber-400",
  paid: "text-emerald-400",
};

export default function OrdenesPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    listPurchaseOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.purchaseOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.supplierName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta orden de compra?")) return;
    await deletePurchaseOrder(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setOpenMenuId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/compras" className="text-zinc-400 hover:text-white transition-colors">
            <ShoppingBag className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Órdenes de compra</h1>
            <p className="text-sm text-zinc-400">Compras a proveedores y recepción</p>
          </div>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
          <Link href="/compras/ordenes/nueva">
            <Plus className="size-4 mr-1.5" />
            Nueva orden
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Buscar orden o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-zinc-300">
            <Filter className="size-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No hay órdenes{search || statusFilter !== "all" ? " con los filtros aplicados" : ""}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">N°</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Proveedor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Destino</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Pago</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    onClick={() => router.push(`/compras/ordenes/${o.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-amber-400 font-medium">{o.purchaseOrderNumber}</td>
                    <td className="px-4 py-3 text-zinc-300">{o.supplierName || <span className="text-zinc-600">Sin proveedor</span>}</td>
                    <td className="px-4 py-3 text-zinc-400">{o.destinationLocationName || "—"}</td>
                    <td className="px-4 py-3 text-right text-zinc-200 font-medium">{formatCurrency(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_VARIANT[o.status] ?? ""}`}>
                        {PURCHASE_ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${PAYMENT_VARIANT[o.paymentStatus] ?? "text-zinc-400"}`}>
                        {PURCHASE_PAYMENT_STATUS_LABELS[o.paymentStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {o.createdAt.toLocaleDateString("es-HN")}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                        {openMenuId === o.id && (
                          <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                            <button
                              onClick={() => { router.push(`/compras/ordenes/${o.id}`); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                              <Eye className="size-4" /> Ver detalle
                            </button>
                            {o.status === "draft" && (
                              <button
                                onClick={() => handleDelete(o.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                              >
                                <Trash2 className="size-4" /> Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
