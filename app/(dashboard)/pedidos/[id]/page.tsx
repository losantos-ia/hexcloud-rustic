"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Loader2, Plus, Edit, MapPin, Phone,
  CheckCircle2, Factory, Truck, Package, DollarSign,
} from "lucide-react";
import Link from "next/link";
import {
  getOrderById, listOrderItems, listOrderPayments,
  updateOrder, addOrderPayment,
} from "@/lib/firestore/orders";
import type { Order, OrderItem, OrderPayment, OrderStatus } from "@/types/order";
import {
  ORDER_STATUS_LABELS,
  ORDER_PROJECT_TYPE_LABELS,
  ORDER_PRIORITY_LABELS,
  ORDER_SOURCE_LABELS,
  ORDER_PAYMENT_TYPE_LABELS,
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_ITEM_CATEGORY_LABELS,
} from "@/types/order";
import { orderPaymentSchema, type OrderPaymentFormValues } from "@/lib/schemas/order";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/context/currency-context";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  deposit_pending: "amber",
  confirmed: "blue",
  sent_to_workshop: "purple",
  in_production: "purple",
  ready_for_delivery: "green",
  delivered: "green",
  installed: "green",
  paid: "green",
  closed: "default",
  cancelled: "red",
};

const STATUS_FLOW: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: "confirmed", label: "Confirmar pedido", icon: <CheckCircle2 size={13} /> },
  { status: "sent_to_workshop", label: "Enviar al taller", icon: <Factory size={13} /> },
  { status: "in_production", label: "Marcar en producción", icon: <Factory size={13} /> },
  { status: "ready_for_delivery", label: "Listo para entrega", icon: <Package size={13} /> },
  { status: "delivered", label: "Marcar entregado", icon: <Truck size={13} /> },
  { status: "installed", label: "Marcar instalado", icon: <CheckCircle2 size={13} /> },
  { status: "paid", label: "Marcar pagado", icon: <DollarSign size={13} /> },
  { status: "closed", label: "Cerrar pedido", icon: <CheckCircle2 size={13} /> },
];

function isOverdue(date?: Date, status?: OrderStatus): boolean {
  if (!date || !status) return false;
  const terminal: OrderStatus[] = ["delivered", "installed", "paid", "closed", "cancelled"];
  if (terminal.includes(status)) return false;
  return date < new Date();
}

function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return formatDateShort(date);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;
  const { formatCurrency } = useCurrency();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [closeWarning, setCloseWarning] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrderPaymentFormValues>({
    resolver: zodResolver(orderPaymentSchema),
    defaultValues: {
      type: "deposit",
      method: "cash",
      paymentDate: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    Promise.all([
      getOrderById(orderId),
      listOrderItems(orderId),
      listOrderPayments(orderId),
    ]).then(([o, i, p]) => {
      setOrder(o);
      setItems(i);
      setPayments(p);
    }).finally(() => setLoading(false));
  }, [orderId]);

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!order) return;

    if (newStatus === "closed" && order.balanceDue > 0) {
      setCloseWarning(true);
      return;
    }

    setSavingStatus(true);
    try {
      await updateOrder(orderId, { status: newStatus });
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleConfirmClose() {
    setSavingStatus(true);
    setCloseWarning(false);
    try {
      await updateOrder(orderId, { status: "closed" });
      setOrder((prev) => prev ? { ...prev, status: "closed" } : prev);
    } finally {
      setSavingStatus(false);
    }
  }

  async function onAddPayment(values: OrderPaymentFormValues) {
    setPaymentError(null);
    try {
      const id = await addOrderPayment(orderId, values);
      const newPayment: OrderPayment = {
        id,
        orderId,
        type: values.type,
        amount: values.amount,
        method: values.method,
        paymentDate: new Date(values.paymentDate),
        notes: values.notes?.trim() || undefined,
        createdAt: new Date(),
      };
      setPayments((prev) => [newPayment, ...prev]);
      setOrder((prev) => {
        if (!prev) return prev;
        const newDepositPaid = prev.depositPaid + values.amount;
        const newBalanceDue = prev.finalSalePrice - newDepositPaid;
        return { ...prev, depositPaid: newDepositPaid, balanceDue: newBalanceDue };
      });
      reset({ type: "deposit", method: "cash", paymentDate: new Date().toISOString().split("T")[0] });
      setShowPaymentForm(false);
    } catch {
      setPaymentError("Error al registrar el pago.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-zinc-400">Pedido no encontrado</p>
        <Link href="/pedidos" className="text-xs text-amber-400 hover:underline">Volver a pedidos</Link>
      </div>
    );
  }

  const overdue = isOverdue(order.promisedDeliveryDate, order.status);
  const nextStatusAction = STATUS_FLOW.find((s) => s.status !== order.status &&
    STATUS_FLOW.findIndex((x) => x.status === order.status) < STATUS_FLOW.findIndex((x) => x.status === s.status) &&
    STATUS_FLOW.indexOf(s) === STATUS_FLOW.findIndex((x) => x.status === order.status) + 1
  );

  const allStatusActions = STATUS_FLOW.filter((s) => s.status !== order.status);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/pedidos"
            className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-amber-400">{order.orderNumber}</span>
              <Badge variant={STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
              {order.priority === "urgent" && <Badge variant="red">Urgente</Badge>}
              {overdue && <Badge variant="red">⚠ Vencido</Badge>}
            </div>
            <h1 className="text-xl font-bold text-zinc-100 mt-0.5" style={{ fontFamily: "var(--font-heading)" }}>
              {order.title}
            </h1>
            <p className="text-xs text-zinc-500">{order.clientName} · {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0 flex-wrap">
          <Link
            href={`/pedidos/${orderId}/editar`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <Edit size={12} /> Editar
          </Link>
          <button
            disabled
            title="Próximamente"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 cursor-not-allowed opacity-50"
          >
            <Factory size={12} /> Crear orden de producción
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Client + project info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-300">Información del pedido</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<Phone size={13} />} label="Cliente" value={order.clientName} />
              <InfoRow icon={<Phone size={13} />} label="Teléfono" value={order.clientPhone} />
              <InfoRow icon={<Package size={13} />} label="Tipo de proyecto" value={ORDER_PROJECT_TYPE_LABELS[order.projectType]} />
              <InfoRow icon={<CheckCircle2 size={13} />} label="Canal" value={ORDER_SOURCE_LABELS[order.source]} />
              <InfoRow icon={<CheckCircle2 size={13} />} label="Prioridad" value={ORDER_PRIORITY_LABELS[order.priority]} />
              {order.promisedDeliveryDate && (
                <InfoRow
                  icon={<Truck size={13} />}
                  label="Entrega prometida"
                  value={formatDate(order.promisedDeliveryDate)}
                  highlight={overdue ? "red" : undefined}
                />
              )}
              {order.installationRequired && (
                <InfoRow icon={<CheckCircle2 size={13} />} label="Instalación" value="Requerida" />
              )}
              {order.deliveryAddress && (
                <div className="sm:col-span-2">
                  <InfoRow icon={<MapPin size={13} />} label="Dirección de entrega" value={order.deliveryAddress} />
                  {order.googleMapsUrl && (
                    <a href={order.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline ml-5">
                      Ver en Google Maps
                    </a>
                  )}
                </div>
              )}
            </div>
            {order.description && (
              <div className="rounded-lg bg-zinc-800/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500 mb-1">Descripción</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{order.description}</p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Ítems del pedido</h2>
            {items.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">Sin ítems registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="pb-2 text-xs font-medium text-zinc-500">Descripción</th>
                      <th className="pb-2 text-xs font-medium text-zinc-500 text-right">Cant.</th>
                      <th className="pb-2 text-xs font-medium text-zinc-500 text-right">PVP</th>
                      <th className="pb-2 text-xs font-medium text-zinc-500 text-right">Total</th>
                      <th className="pb-2 text-xs font-medium text-zinc-500">Categoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 pr-4">
                          <p className="text-zinc-200">{item.description}</p>
                          {item.notes && <p className="text-xs text-zinc-500 mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="py-2.5 text-right text-zinc-400">{item.quantity} {item.unit}</td>
                        <td className="py-2.5 text-right text-zinc-400">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2.5 text-right font-medium text-zinc-200">{formatCurrency(item.total)}</td>
                        <td className="py-2.5 text-xs text-zinc-500">{ORDER_ITEM_CATEGORY_LABELS[item.category]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Historial de pagos</h2>
              <button
                onClick={() => setShowPaymentForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
              >
                <Plus size={12} /> Registrar pago
              </button>
            </div>

            {showPaymentForm && (
              <form onSubmit={handleSubmit(onAddPayment)} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Tipo de pago</Label>
                    <select {...register("type")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                      {(Object.keys(ORDER_PAYMENT_TYPE_LABELS) as (keyof typeof ORDER_PAYMENT_TYPE_LABELS)[]).map((t) => (
                        <option key={t} value={t}>{ORDER_PAYMENT_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Método de pago</Label>
                    <select {...register("method")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                      {(Object.keys(ORDER_PAYMENT_METHOD_LABELS) as (keyof typeof ORDER_PAYMENT_METHOD_LABELS)[]).map((m) => (
                        <option key={m} value={m}>{ORDER_PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Monto *</Label>
                    <Input type="number" min={0} step="0.01" {...register("amount", { valueAsNumber: true })} placeholder="0" />
                    {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Fecha del pago *</Label>
                    <Input type="date" {...register("paymentDate")} />
                    {errors.paymentDate && <p className="text-xs text-red-400">{errors.paymentDate.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>Notas</Label>
                    <Textarea {...register("notes")} rows={2} placeholder="Referencia de transferencia, observación..." />
                  </div>
                </div>
                {paymentError && <p className="text-xs text-red-400">{paymentError}</p>}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowPaymentForm(false); reset({ type: "deposit", method: "cash", paymentDate: new Date().toISOString().split("T")[0] }); }}
                    className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 transition-colors"
                  >
                    {isSubmitting && <Loader2 size={11} className="animate-spin" />}
                    Guardar pago
                  </button>
                </div>
              </form>
            )}

            {payments.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No hay pagos registrados</p>
            ) : (
              <div className="flex flex-col gap-0">
                {payments.map((payment, idx) => (
                  <div key={payment.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="size-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <DollarSign size={11} />
                      </div>
                      {idx < payments.length - 1 && <div className="w-px flex-1 bg-zinc-800 my-1" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200">
                          {ORDER_PAYMENT_TYPE_LABELS[payment.type]} — {formatCurrency(payment.amount)}
                        </span>
                        <span className="text-xs text-zinc-600 shrink-0">{formatRelative(payment.createdAt)}</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {ORDER_PAYMENT_METHOD_LABELS[payment.method]} · {formatDateShort(payment.paymentDate)}
                      </p>
                      {payment.notes && <p className="text-xs text-zinc-500 mt-0.5">{payment.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {(order.notes || order.internalNotes) && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-zinc-300">Notas</h2>
              {order.notes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Para el cliente</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
              {order.internalNotes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Internas</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{order.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Payment summary */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Resumen financiero</h2>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Precio de venta</span>
                <span className="font-medium text-zinc-200">{formatCurrency(order.finalSalePrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Anticipo requerido</span>
                <span className="text-zinc-400">{formatCurrency(order.depositRequired)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total cobrado</span>
                <span className="text-emerald-400 font-medium">{formatCurrency(order.depositPaid)}</span>
              </div>
              <div className="border-t border-zinc-700 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-300">Saldo pendiente</span>
                  <span className={`font-bold ${order.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {order.balanceDue > 0 ? formatCurrency(order.balanceDue) : "Pagado"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Cambiar estado</h2>
              {savingStatus && <Loader2 size={12} className="animate-spin text-zinc-500" />}
            </div>
            <div className="flex flex-col gap-1.5">
              {allStatusActions.map(({ status, label, icon }) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={savingStatus}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:border-amber-500/50 hover:text-amber-400 transition-colors disabled:opacity-50 text-left"
                >
                  {icon} {label}
                </button>
              ))}
              {order.status !== "cancelled" && (
                <button
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={savingStatus}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-red-500/20 text-xs text-red-400 hover:border-red-500/50 hover:bg-red-500/5 transition-colors disabled:opacity-50 text-left mt-1"
                >
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>

          {/* Quick info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-zinc-300 mb-1">Resumen</h2>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Ítems</span>
              <span className="text-zinc-300">{items.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Pagos</span>
              <span className="text-zinc-300">{payments.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Origen</span>
              <span className="text-zinc-300">{ORDER_SOURCE_LABELS[order.source]}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Creado</span>
              <span className="text-zinc-300">{formatDateShort(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Actualizado</span>
              <span className="text-zinc-300">{formatDateShort(order.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Close warning modal */}
      {closeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-zinc-100">¿Cerrar pedido con saldo pendiente?</h3>
            <p className="text-xs text-zinc-400">
              Este pedido tiene un saldo pendiente de <span className="text-amber-400 font-medium">{formatCurrency(order.balanceDue)}</span>.
              ¿Confirmas que deseas cerrarlo de todas formas?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCloseWarning(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
              >
                Cerrar igualmente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: "red" | "amber";
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-zinc-500 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-sm ${highlight === "red" ? "text-red-400 font-medium" : highlight === "amber" ? "text-amber-400" : "text-zinc-200"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
