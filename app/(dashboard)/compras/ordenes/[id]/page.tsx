"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PackageCheck,
  DollarSign,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPurchaseOrder,
  listPurchaseOrderItems,
  listPurchasePayments,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  receivePurchaseOrderItems,
  addPurchasePayment,
} from "@/lib/firestore/purchases";
import type { PurchaseOrder, PurchaseOrderItem, PurchasePayment } from "@/types/purchases";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_PAYMENT_STATUS_LABELS,
  PURCHASE_ASSIGN_TYPE_LABELS,
} from "@/types/purchases";
import { INVENTORY_UNIT_LABELS } from "@/types/inventory";
import { useCurrency } from "@/context/currency-context";

const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-zinc-700/40 text-zinc-400 border-zinc-600/40",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  confirmed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  partially_received: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  received: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-zinc-700/20 text-zinc-500 border-zinc-700/30",
};

export default function OrdenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Receive modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiving, setReceiving] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  async function reload() {
    const [o, its, pays] = await Promise.all([
      getPurchaseOrder(id),
      listPurchaseOrderItems(id),
      listPurchasePayments(id),
    ]);
    setOrder(o);
    setItems(its);
    setPayments(pays);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(status: string) {
    await updatePurchaseOrderStatus(id, status);
    setOrder((prev) => prev ? { ...prev, status: status as PurchaseOrder["status"] } : prev);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta orden de compra?")) return;
    await deletePurchaseOrder(id);
    router.push("/compras/ordenes");
  }

  async function handleReceive() {
    if (!order) return;
    setReceiving(true);
    try {
      const entries = items
        .filter((item) => (receiveQtys[item.id] ?? 0) > 0)
        .map((item) => ({
          orderItemId: item.id,
          inventoryItemId: item.inventoryItemId,
          itemName: item.itemName,
          quantityToReceive: receiveQtys[item.id] ?? 0,
          unitCost: item.unitCost,
          assignToType: item.assignToType,
          productionOrderId: item.productionOrderId,
        }));

      if (entries.length === 0) return;

      await receivePurchaseOrderItems(id, order.destinationLocationId, entries);
      await reload();
      setShowReceiveModal(false);
      setReceiveQtys({});
    } finally {
      setReceiving(false);
    }
  }

  async function handleAddPayment() {
    if (!order || paymentAmount <= 0) return;
    setAddingPayment(true);
    try {
      await addPurchasePayment(id, paymentAmount, paymentDate, paymentMethod, paymentRef);
      await reload();
      setShowPaymentModal(false);
      setPaymentAmount(0);
      setPaymentMethod("");
      setPaymentRef("");
    } finally {
      setAddingPayment(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-zinc-500 text-sm">Cargando...</div>;
  if (!order) return <div className="p-8 text-center text-zinc-500 text-sm">Orden no encontrada.</div>;

  const canReceive =
    order.status === "confirmed" || order.status === "partially_received" || order.status === "sent";
  const canPay = order.status !== "cancelled" && order.paymentStatus !== "paid";
  const canDelete = order.status === "draft";
  const canCancel = order.status !== "cancelled" && order.status !== "received";

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/compras/ordenes"
            className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{order.purchaseOrderNumber}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_VARIANT[order.status] ?? ""}`}>
                {PURCHASE_ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              {order.supplierName ? `Proveedor: ${order.supplierName}` : "Sin proveedor asignado"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {order.status === "draft" && (
            <Button
              onClick={() => handleStatusChange("sent")}
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Send className="size-4 mr-1.5" /> Enviar
            </Button>
          )}
          {order.status === "sent" && (
            <Button
              onClick={() => handleStatusChange("confirmed")}
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              <CheckCircle className="size-4 mr-1.5" /> Confirmar
            </Button>
          )}
          {canReceive && (
            <Button
              onClick={() => setShowReceiveModal(true)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <PackageCheck className="size-4 mr-1.5" /> Recibir
            </Button>
          )}
          {canPay && (
            <Button
              onClick={() => setShowPaymentModal(true)}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-white"
            >
              <DollarSign className="size-4 mr-1.5" /> Registrar pago
            </Button>
          )}
          {canCancel && (
            <Button
              onClick={() => handleStatusChange("cancelled")}
              size="sm"
              variant="outline"
              className="border-red-700 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="size-4 mr-1.5" /> Cancelar
            </Button>
          )}
          {canDelete && (
            <Button
              onClick={handleDelete}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-500 hover:text-red-400"
            >
              <Trash2 className="size-4 mr-1.5" /> Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Destino</p>
          <p className="text-sm text-zinc-200">{order.destinationLocationName || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Entrega esperada</p>
          <p className="text-sm text-zinc-200">
            {order.expectedDeliveryDate ? order.expectedDeliveryDate.toLocaleDateString("es-HN") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Pago</p>
          <p className={`text-sm font-medium ${order.paymentStatus === "paid" ? "text-emerald-400" : order.paymentStatus === "partial" ? "text-amber-400" : "text-red-400"}`}>
            {PURCHASE_PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Total</p>
          <p className="text-sm font-bold text-amber-400">{formatCurrency(order.total)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Pagado</p>
          <p className="text-sm text-zinc-200">{formatCurrency(order.paidAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Saldo</p>
          <p className="text-sm text-zinc-200">{formatCurrency(order.balanceDue)}</p>
        </div>
        {order.notes && (
          <div className="col-span-full">
            <p className="text-xs text-zinc-500 mb-0.5">Notas</p>
            <p className="text-sm text-zinc-300">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300">Artículos ({items.length})</h2>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-zinc-500 text-sm">Sin artículos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Artículo</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Pedido</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Recibido</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Costo unit.</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.map((item) => {
                  const pct = item.quantityOrdered > 0 ? item.quantityReceived / item.quantityOrdered : 0;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 text-zinc-200 font-medium">{item.itemName}</td>
                      <td className="px-4 py-3 text-right text-zinc-300">
                        {item.quantityOrdered} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={pct >= 1 ? "text-emerald-400" : pct > 0 ? "text-amber-400" : "text-zinc-500"}>
                          {item.quantityReceived} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">{formatCurrency(item.unitCost)}</td>
                      <td className="px-4 py-3 text-right text-zinc-200">{formatCurrency(item.totalCost)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {PURCHASE_ASSIGN_TYPE_LABELS[item.assignToType]}
                        {item.productionOrderId && (
                          <span className="ml-1 text-zinc-600">· {item.productionOrderId.slice(0, 8)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Pagos registrados</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Fecha</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Método</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Referencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-zinc-400">{p.paymentDate.toLocaleDateString("es-HN")}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.method || "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-white">Recibir mercancía</h2>
            <p className="text-xs text-zinc-500">
              Ingresa la cantidad que se está recibiendo para cada artículo.
            </p>
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
              {items
                .filter((item) => item.quantityReceived < item.quantityOrdered)
                .map((item) => {
                  const remaining = item.quantityOrdered - item.quantityReceived;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{item.itemName}</p>
                        <p className="text-xs text-zinc-500">Pendiente: {remaining} {item.unit}</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        value={receiveQtys[item.id] ?? 0}
                        onChange={(e) =>
                          setReceiveQtys((prev) => ({
                            ...prev,
                            [item.id]: Math.min(parseFloat(e.target.value) || 0, remaining),
                          }))
                        }
                        className="w-24 bg-zinc-950 border-zinc-800 text-zinc-200 text-sm"
                      />
                    </div>
                  );
                })}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300"
                onClick={() => { setShowReceiveModal(false); setReceiveQtys({}); }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={receiving}
                onClick={handleReceive}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {receiving ? "Guardando..." : "Confirmar recepción"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-base font-bold text-white">Registrar pago</h2>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Monto *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount || ""}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Fecha *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Método</Label>
                <Input
                  placeholder="Transferencia, efectivo..."
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Referencia</Label>
                <Input
                  placeholder="Número de cheque..."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={addingPayment || paymentAmount <= 0}
                onClick={handleAddPayment}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
              >
                {addingPayment ? "Guardando..." : "Registrar pago"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
