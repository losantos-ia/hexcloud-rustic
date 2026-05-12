"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Loader2, Plus, Edit, MapPin, Phone,
  CheckCircle2, Factory, Truck, Package, DollarSign, Download, X,
} from "lucide-react";
import Link from "next/link";
import {
  getOrderById, listOrderItems, listOrderPayments,
  updateOrder, addOrderPayment, updateOrderPayment, deleteOrderPayment,
} from "@/lib/firestore/orders";
import { listTreasuryAccounts, createTreasuryMovement } from "@/lib/firestore/treasury";
import type { TreasuryAccount } from "@/types/treasury";
import { listExpensesByOrder } from "@/lib/firestore/expenses";
import type { Order, OrderItem, OrderPayment, OrderStatus, OrderPaymentType, OrderPaymentMethod } from "@/types/order";
import type { Expense } from "@/types/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/types/expenses";
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
import { DatePicker } from "@/components/ui/date-picker";
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

const MAINTENANCE_STATUS_FLOW: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: "confirmed", label: "Confirmar pedido", icon: <CheckCircle2 size={13} /> },
  { status: "delivered", label: "Marcar realizado", icon: <CheckCircle2 size={13} /> },
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

function formatAbsolute(date: Date): string {
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;
  const { formatCurrency } = useCurrency();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"detalle" | "gastos">("detalle");
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [closeWarning, setCloseWarning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit/delete payment state
  const [editingPayment, setEditingPayment] = useState<OrderPayment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<OrderPayment | null>(null);
  const [editForm, setEditForm] = useState({ type: "partial" as OrderPaymentType, method: "cash" as OrderPaymentMethod, amount: "", paymentDate: "", notes: "", accountId: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
      listExpensesByOrder(orderId).catch(() => [] as Expense[]),
      listTreasuryAccounts().catch(() => [] as TreasuryAccount[]),
    ])
      .then(([o, i, p, e, accs]) => {
        setOrder(o);
        setItems(i);
        setPayments(p);
        setExpenses(e);
        setTreasuryAccounts(accs);
        if (accs.length > 0) setSelectedAccountId(accs[0].id);
      })
      .catch((err) => {
        console.error("Error loading order:", err);
        setLoadError("Error al cargar el pedido. Verifica tu conexión e intenta de nuevo.");
      })
      .finally(() => setLoading(false));
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
      const id = await addOrderPayment(orderId, values, selectedAccountId || undefined);
      const newPayment: OrderPayment = {
        id,
        orderId,
        type: values.type,
        amount: values.amount,
        method: values.method,
        paymentDate: new Date(values.paymentDate),
        notes: values.notes?.trim() || undefined,
        treasuryAccountId: selectedAccountId || undefined,
        createdAt: new Date(),
      };
      setPayments((prev) => [newPayment, ...prev]);
      setOrder((prev) => {
        if (!prev) return prev;
        const newDepositPaid = prev.depositPaid + values.amount;
        const newBalanceDue = prev.finalSalePrice - newDepositPaid;
        return { ...prev, depositPaid: newDepositPaid, balanceDue: newBalanceDue };
      });
      // Create treasury movement if an account is selected
      if (selectedAccountId) {
        const acc = treasuryAccounts.find((a) => a.id === selectedAccountId);
        await createTreasuryMovement({
          treasuryAccountId: selectedAccountId,
          type: "income",
          amount: values.amount,
          date: new Date(values.paymentDate),
          referenceType: "sale",
          referenceId: orderId,
          description: `Pago pedido${order ? ` ${order.orderNumber}` : ""} – ${ORDER_PAYMENT_TYPE_LABELS[values.type]}${
            acc ? ` → ${acc.name}` : ""
          }`,
        });
      }
      reset({ type: "deposit", method: "cash", paymentDate: new Date().toISOString().split("T")[0] });
      setShowPaymentForm(false);
    } catch {
      setPaymentError("Error al registrar el pago.");
    }
  }

  function openEditPayment(payment: OrderPayment) {
    setEditForm({
      type: payment.type,
      method: payment.method,
      amount: String(payment.amount),
      paymentDate: payment.paymentDate.toISOString().split("T")[0],
      notes: payment.notes ?? "",
      accountId: payment.treasuryAccountId ?? selectedAccountId ?? "",
    });
    setEditError(null);
    setEditingPayment(payment);
  }

  async function handleUpdatePayment() {
    if (!editingPayment) return;
    const newAmount = parseFloat(editForm.amount);
    if (isNaN(newAmount) || newAmount <= 0) { setEditError("Ingresa un monto válido."); return; }
    if (!editForm.paymentDate) { setEditError("Selecciona una fecha."); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const oldAmount = editingPayment.amount;
      const oldAccountId = editingPayment.treasuryAccountId;
      const newAccountId = editForm.accountId || undefined;
      await updateOrderPayment(editingPayment.id, orderId, oldAmount, {
        type: editForm.type,
        amount: newAmount,
        method: editForm.method,
        paymentDate: editForm.paymentDate,
        notes: editForm.notes,
        treasuryAccountId: newAccountId ?? null,
      });

      // Handle treasury adjustments
      const accountChanged = oldAccountId !== newAccountId;
      if (accountChanged) {
        // Reverse on old account
        if (oldAccountId) {
          await createTreasuryMovement({
            treasuryAccountId: oldAccountId,
            type: "adjustment",
            amount: -oldAmount,
            date: new Date(),
            referenceId: orderId,
            description: `Reversión pago pedido${order ? ` ${order.orderNumber}` : ""} (cuenta cambiada)`,
          });
        }
        // Create income on new account
        if (newAccountId) {
          const acc = treasuryAccounts.find((a) => a.id === newAccountId);
          await createTreasuryMovement({
            treasuryAccountId: newAccountId,
            type: "income",
            amount: newAmount,
            date: new Date(editForm.paymentDate),
            referenceType: "sale",
            referenceId: orderId,
            description: `Pago pedido${order ? ` ${order.orderNumber}` : ""} (editado)${acc ? ` → ${acc.name}` : ""}`,
          });
        }
      } else if (newAccountId && newAmount !== oldAmount) {
        // Same account, amount changed — adjust the difference
        await createTreasuryMovement({
          treasuryAccountId: newAccountId,
          type: "adjustment",
          amount: newAmount - oldAmount,
          date: new Date(),
          referenceId: orderId,
          description: `Ajuste pago pedido${order ? ` ${order.orderNumber}` : ""}`,
        });
      }

      setPayments((prev) => prev.map((p) =>
        p.id === editingPayment.id
          ? { ...p, type: editForm.type, amount: newAmount, method: editForm.method, paymentDate: new Date(editForm.paymentDate), notes: editForm.notes || undefined, treasuryAccountId: newAccountId }
          : p
      ));
      setOrder((prev) => {
        if (!prev) return prev;
        const diff = newAmount - oldAmount;
        const newDepositPaid = prev.depositPaid + diff;
        return { ...prev, depositPaid: newDepositPaid, balanceDue: prev.finalSalePrice - newDepositPaid };
      });
      setEditingPayment(null);
    } catch {
      setEditError("Error al guardar los cambios.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeletePayment() {
    if (!deletingPayment) return;
    setDeleteConfirming(true);
    try {
      await deleteOrderPayment(deletingPayment.id, orderId, deletingPayment.amount);
      if (deletingPayment.treasuryAccountId) {
        await createTreasuryMovement({
          treasuryAccountId: deletingPayment.treasuryAccountId,
          type: "adjustment",
          amount: -deletingPayment.amount,
          date: new Date(),
          referenceId: orderId,
          description: `Reversión pago eliminado pedido${order ? ` ${order.orderNumber}` : ""}`,
        });
      }
      setPayments((prev) => prev.filter((p) => p.id !== deletingPayment.id));
      setOrder((prev) => {
        if (!prev) return prev;
        const newDepositPaid = Math.max(0, prev.depositPaid - deletingPayment.amount);
        return { ...prev, depositPaid: newDepositPaid, balanceDue: prev.finalSalePrice - newDepositPaid };
      });
      setDeletingPayment(null);
    } catch {
      // keep modal open on error
    } finally {
      setDeleteConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-red-400">{loadError}</p>
        <Link href="/pedidos" className="text-xs text-amber-400 hover:underline">Volver a pedidos</Link>
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
  const activeFlow = order.projectType === "maintenance" ? MAINTENANCE_STATUS_FLOW : STATUS_FLOW;
  const nextStatusAction = activeFlow.find((s) => s.status !== order.status &&
    activeFlow.findIndex((x) => x.status === order.status) < activeFlow.findIndex((x) => x.status === s.status) &&
    activeFlow.indexOf(s) === activeFlow.findIndex((x) => x.status === order.status) + 1
  );

  const allStatusActions = activeFlow.filter((s) => s.status !== order.status);

  return (
    <div className="w-full flex flex-col gap-6">
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
          <Link
            href={`/pedidos/${orderId}/pdf`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <Download size={12} /> Ver PDF
          </Link>
          {["closed", "cancelled", "delivered", "installed", "paid"].includes(order.status) || order.projectType === "maintenance" ? (
            <button
              disabled
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 cursor-not-allowed opacity-40"
            >
              <Factory size={12} /> Crear orden de producción
            </button>
          ) : (
            <Link
              href={`/produccion/nueva?fromOrder=${orderId}`}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:border-amber-500 hover:bg-amber-500/10 transition-colors"
            >
              <Factory size={12} /> Crear orden de producción
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Tab bar */}
          <div className="flex border-b border-zinc-800">
            {(["detalle", "gastos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold tracking-wide transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                  activeTab === tab
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "detalle" ? "DETALLE" : "GASTOS"}
                {tab === "gastos" && expenses.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === "gastos" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {expenses.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "detalle" && <>
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
                  <colgroup>
                    <col className="w-full" />
                    <col className="w-20 shrink-0" />
                    <col className="w-32 shrink-0" />
                    <col className="w-32 shrink-0" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="pb-2 text-xs font-medium text-zinc-500">Descripción</th>
                      <th className="pb-2 pl-4 text-xs font-medium text-zinc-500 text-right whitespace-nowrap">Cant.</th>
                      <th className="pb-2 pl-4 text-xs font-medium text-zinc-500 text-right whitespace-nowrap">PVP</th>
                      <th className="pb-2 pl-4 text-xs font-medium text-zinc-500 text-right whitespace-nowrap">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 pr-4">
                          <p className="text-zinc-200 whitespace-pre-wrap">{item.description}</p>
                          {item.notes && <p className="text-xs text-zinc-500 mt-0.5 whitespace-pre-wrap">{item.notes}</p>}
                        </td>
                        <td className="py-2.5 pl-4 text-right text-zinc-400 whitespace-nowrap">{item.quantity}</td>
                        <td className="py-2.5 pl-4 text-right text-zinc-400 whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2.5 pl-4 text-right font-medium text-zinc-200 whitespace-nowrap">{formatCurrency(item.total)}</td>
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
                    <DatePicker value={watch("paymentDate")} onChange={(v) => setValue("paymentDate", v ?? "")} />
                    {errors.paymentDate && <p className="text-xs text-red-400">{errors.paymentDate.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Cuenta de destino</Label>
                    {treasuryAccounts.length === 0 ? (
                      <p className="text-xs text-zinc-500">No hay cuentas en Tesorería</p>
                    ) : (
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                      >
                        {treasuryAccounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}
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
                  <div key={payment.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className="size-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <DollarSign size={11} />
                      </div>
                      {idx < payments.length - 1 && <div className="w-px flex-1 bg-zinc-800 my-1" />}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-sm font-medium text-zinc-200">
                            {ORDER_PAYMENT_TYPE_LABELS[payment.type]} — {formatCurrency(payment.amount)}
                          </span>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {ORDER_PAYMENT_METHOD_LABELS[payment.method]} · {formatDateShort(payment.paymentDate)}
                          </p>
                          {payment.notes && <p className="text-xs text-zinc-500 mt-0.5">{payment.notes}</p>}
                          {payment.treasuryAccountId && (() => {
                            const acc = treasuryAccounts.find((a) => a.id === payment.treasuryAccountId);
                            return acc ? <p className="text-xs text-amber-500/70 mt-0.5">↳ {acc.name}</p> : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-zinc-500">{formatRelative(payment.createdAt)}</span>
                            <span className="text-xs text-zinc-600">{formatAbsolute(payment.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditPayment(payment)}
                              className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
                              title="Editar pago"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => setDeletingPayment(payment)}
                              className="p-1.5 text-zinc-600 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
                              title="Eliminar pago"
                            >
                              <Loader2 size={12} className="hidden" />{/* placeholder */}
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
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
          </>}

          {activeTab === "gastos" && (() => {
            const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
            const margin = order.finalSalePrice - totalExpenses;
            return (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-300">Gastos del proyecto</h2>
                  <Link
                    href="/compras/nuevo"
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Plus size={12} /> Registrar gasto
                  </Link>
                </div>
                {expenses.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <p className="text-sm text-zinc-500">Sin gastos asociados a este pedido</p>
                    <Link
                      href="/compras/nuevo"
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      + Registrar el primer gasto
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800 text-left">
                            <th className="pb-2 text-xs font-medium text-zinc-500">Proveedor / Categoría</th>
                            <th className="pb-2 pl-4 text-xs font-medium text-zinc-500">Descripción</th>
                            <th className="pb-2 pl-4 text-xs font-medium text-zinc-500 text-right whitespace-nowrap">Fecha</th>
                            <th className="pb-2 pl-4 text-xs font-medium text-zinc-500 text-right whitespace-nowrap">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {expenses.map((exp) => (
                            <tr key={exp.id} className="hover:bg-zinc-800/50 transition-colors group">
                              <td className="py-2.5 pr-4">
                                <Link href={`/compras/${exp.id}`} className="block group-hover:text-amber-400 text-zinc-200 transition-colors">
                                  {exp.supplierName || EXPENSE_CATEGORY_LABELS[exp.category]}
                                </Link>
                                <span className="text-xs text-zinc-500">{EXPENSE_CATEGORY_LABELS[exp.category]}</span>
                              </td>
                              <td className="py-2.5 pl-4 text-zinc-400 text-xs max-w-[200px]">
                                <p className="truncate">{exp.description || "—"}</p>
                              </td>
                              <td className="py-2.5 pl-4 text-right text-zinc-500 text-xs whitespace-nowrap">
                                {formatDateShort(exp.date)}
                              </td>
                              <td className="py-2.5 pl-4 text-right font-mono font-medium text-zinc-200 whitespace-nowrap">
                                {formatCurrency(exp.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Total gastos</span>
                        <span className="text-red-400 font-medium">{formatCurrency(totalExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-zinc-300">Margen bruto</span>
                        <span className={`font-bold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatCurrency(margin)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Payment summary */}
          {(() => {
            const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
            const margin = order.finalSalePrice - totalExpenses;
            return (
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
                  <div className="border-t border-zinc-700 pt-2 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-zinc-300">Saldo pendiente</span>
                      <span className={`font-bold ${order.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {order.balanceDue > 0 ? formatCurrency(order.balanceDue) : "Pagado"}
                      </span>
                    </div>
                    {expenses.length > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Total gastos</span>
                          <span className="text-red-400 font-medium">{formatCurrency(totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-zinc-300">Margen bruto</span>
                          <span className={`font-bold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatCurrency(margin)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

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

      {/* Edit payment modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Editar pago</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Los cambios en el monto o la cuenta se reflejarán automáticamente en Tesorería.
                </p>
              </div>
              <button onClick={() => setEditingPayment(null)} className="text-zinc-500 hover:text-zinc-200 transition-colors ml-3 shrink-0">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo de pago</Label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as OrderPaymentType }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                  >
                    {(Object.keys(ORDER_PAYMENT_TYPE_LABELS) as OrderPaymentType[]).map((t) => (
                      <option key={t} value={t}>{ORDER_PAYMENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Método de pago</Label>
                  <select
                    value={editForm.method}
                    onChange={(e) => setEditForm((f) => ({ ...f, method: e.target.value as OrderPaymentMethod }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                  >
                    {(Object.keys(ORDER_PAYMENT_METHOD_LABELS) as OrderPaymentMethod[]).map((m) => (
                      <option key={m} value={m}>{ORDER_PAYMENT_METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Fecha del pago *</Label>
                  <Input
                    type="date"
                    value={editForm.paymentDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Cuenta de destino</Label>
                {treasuryAccounts.length === 0 ? (
                  <p className="text-xs text-zinc-500">No hay cuentas en Tesorería</p>
                ) : (
                  <select
                    value={editForm.accountId}
                    onChange={(e) => setEditForm((f) => ({ ...f, accountId: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                  >
                    <option value="">Sin cuenta asociada</option>
                    {treasuryAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Notas</Label>
                <Textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Referencia de transferencia, observación..."
                />
              </div>
              {editError && <p className="text-xs text-red-400">{editError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <button
                onClick={() => setEditingPayment(null)}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePayment}
                disabled={editSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 transition-colors"
              >
                {editSaving && <Loader2 size={11} className="animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete payment confirm modal */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">¿Eliminar este pago?</h2>
              <p className="text-xs text-zinc-400 mt-2">
                Se eliminará el pago de{" "}
                <span className="font-semibold text-zinc-200">{formatCurrency(deletingPayment.amount)}</span>{" "}
                ({ORDER_PAYMENT_TYPE_LABELS[deletingPayment.type]}).
              </p>
              {deletingPayment.treasuryAccountId && (() => {
                const acc = treasuryAccounts.find((a) => a.id === deletingPayment.treasuryAccountId);
                return acc ? (
                  <p className="text-xs text-amber-400/80 mt-1">
                    Se revertirá el movimiento en la cuenta <strong>{acc.name}</strong>.
                  </p>
                ) : null;
              })()}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingPayment(null)}
                disabled={deleteConfirming}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePayment}
                disabled={deleteConfirming}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-60 transition-colors"
              >
                {deleteConfirming && <Loader2 size={11} className="animate-spin" />}
                Eliminar pago
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
