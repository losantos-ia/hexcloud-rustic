"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
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
import {
  listPurchaseRequests,
  updatePurchaseRequestStatus,
  deletePurchaseRequest,
} from "@/lib/firestore/purchases";
import type { PurchaseRequest } from "@/types/purchases";
import {
  PURCHASE_REQUEST_STATUS_LABELS,
  PURCHASE_PRIORITY_LABELS,
  PURCHASE_REQUEST_SOURCE_LABELS,
} from "@/types/purchases";

const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-zinc-700/40 text-zinc-400 border-zinc-600/40",
  pending_approval: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  converted_to_purchase_order: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-zinc-700/20 text-zinc-500 border-zinc-700/30",
};

const PRIORITY_VARIANT: Record<string, string> = {
  low: "text-zinc-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

export default function SolicitudesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    listPurchaseRequests()
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter((r) => {
    const matchSearch =
      !search ||
      r.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.destinationLocationName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta solicitud?")) return;
    await deletePurchaseRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setOpenMenuId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/compras" className="text-zinc-400 hover:text-white transition-colors">
            <ClipboardList className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Solicitudes de compra</h1>
            <p className="text-sm text-zinc-400">Gestiona las necesidades internas</p>
          </div>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
          <Link href="/compras/solicitudes/nueva">
            <Plus className="size-4 mr-1.5" />
            Nueva solicitud
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Buscar solicitud..."
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
            {Object.entries(PURCHASE_REQUEST_STATUS_LABELS).map(([k, v]) => (
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
            No hay solicitudes{search || statusFilter !== "all" ? " con los filtros aplicados" : ""}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">N°</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Origen</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Destino</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Prioridad</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    onClick={() => router.push(`/compras/solicitudes/${r.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-amber-400 font-medium">{r.requestNumber}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {PURCHASE_REQUEST_SOURCE_LABELS[r.sourceType]}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{r.destinationLocationName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${PRIORITY_VARIANT[r.priority] ?? "text-zinc-400"}`}>
                        {PURCHASE_PRIORITY_LABELS[r.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_VARIANT[r.status] ?? ""}`}>
                        {PURCHASE_REQUEST_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {r.createdAt.toLocaleDateString("es-HN")}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                        {openMenuId === r.id && (
                          <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                            <button
                              onClick={() => { router.push(`/compras/solicitudes/${r.id}`); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                              <Eye className="size-4" /> Ver detalle
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Trash2 className="size-4" /> Eliminar
                            </button>
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
