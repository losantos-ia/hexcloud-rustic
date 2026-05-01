"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  ShoppingBag,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPurchaseRequest,
  listPurchaseRequestItems,
  updatePurchaseRequestStatus,
  deletePurchaseRequest,
} from "@/lib/firestore/purchases";
import type { PurchaseRequest, PurchaseRequestItem } from "@/types/purchases";
import {
  PURCHASE_REQUEST_STATUS_LABELS,
  PURCHASE_PRIORITY_LABELS,
  PURCHASE_REQUEST_SOURCE_LABELS,
} from "@/types/purchases";
import { INVENTORY_UNIT_LABELS } from "@/types/inventory";
import { useCurrency } from "@/context/currency-context";

const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-zinc-700/40 text-zinc-400 border-zinc-600/40",
  pending_approval: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  converted_to_purchase_order: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-zinc-700/20 text-zinc-500 border-zinc-700/30",
};

export default function SolicitudDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [items, setItems] = useState<PurchaseRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPurchaseRequest(id), listPurchaseRequestItems(id)]).then(
      ([req, its]) => {
        setRequest(req);
        setItems(its);
      }
    ).finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(status: string) {
    await updatePurchaseRequestStatus(id, status);
    setRequest((prev) => prev ? { ...prev, status: status as PurchaseRequest["status"] } : prev);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta solicitud? Esta acción no se puede deshacer.")) return;
    await deletePurchaseRequest(id);
    router.push("/compras/solicitudes");
  }

  if (loading) {
    return <div className="p-8 text-center text-zinc-500 text-sm">Cargando...</div>;
  }
  if (!request) {
    return <div className="p-8 text-center text-zinc-500 text-sm">Solicitud no encontrada.</div>;
  }

  const totalEstimated = items.reduce((s, i) => s + (i.estimatedTotalCost ?? 0), 0);
  const canApprove = request.status === "pending_approval" || request.status === "draft";
  const canReject = request.status === "pending_approval" || request.status === "approved";
  const canDelete = request.status === "draft" || request.status === "rejected" || request.status === "cancelled";

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/compras/solicitudes"
            className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{request.requestNumber}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_VARIANT[request.status] ?? ""}`}>
                {PURCHASE_REQUEST_STATUS_LABELS[request.status]}
              </span>
            </div>
            <p className="text-sm text-zinc-400">Solicitud de compra</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canApprove && (
            <Button
              onClick={() => handleStatusChange("approved")}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <CheckCircle className="size-4 mr-1.5" /> Aprobar
            </Button>
          )}
          {request.status === "approved" && (
            <Button
              onClick={() => handleStatusChange("converted_to_purchase_order")}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              <ShoppingBag className="size-4 mr-1.5" /> Convertir a OC
            </Button>
          )}
          {canReject && (
            <Button
              onClick={() => handleStatusChange("rejected")}
              size="sm"
              variant="outline"
              className="border-red-700 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="size-4 mr-1.5" /> Rechazar
            </Button>
          )}
          {canDelete && (
            <Button
              onClick={handleDelete}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-400 hover:text-red-400"
            >
              <Trash2 className="size-4 mr-1.5" /> Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Origen</p>
          <p className="text-sm text-zinc-200">{PURCHASE_REQUEST_SOURCE_LABELS[request.sourceType]}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Prioridad</p>
          <p className="text-sm text-zinc-200">{PURCHASE_PRIORITY_LABELS[request.priority]}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Destino</p>
          <p className="text-sm text-zinc-200">{request.destinationLocationName || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Fecha requerida</p>
          <p className="text-sm text-zinc-200">
            {request.neededByDate ? request.neededByDate.toLocaleDateString("es-HN") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Creada</p>
          <p className="text-sm text-zinc-200">{request.createdAt.toLocaleDateString("es-HN")}</p>
        </div>
        {totalEstimated > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Costo estimado</p>
            <p className="text-sm text-amber-400 font-medium">{formatCurrency(totalEstimated)}</p>
          </div>
        )}
        {request.notes && (
          <div className="col-span-full">
            <p className="text-xs text-zinc-500 mb-0.5">Notas</p>
            <p className="text-sm text-zinc-300">{request.notes}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300">Artículos solicitados ({items.length})</h2>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-zinc-500 text-sm">Sin artículos</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Artículo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Cantidad</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Costo est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-200 font-medium">{item.itemName}</td>
                  <td className="px-4 py-3 text-zinc-400 capitalize">{item.itemType}</td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {item.estimatedTotalCost != null ? formatCurrency(item.estimatedTotalCost) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
