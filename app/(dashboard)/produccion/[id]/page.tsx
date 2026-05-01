"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Loader2, Edit, AlertTriangle, Clock, User, Users, Calendar,
  CheckCircle2, Circle, Play, XCircle, Plus, ChevronRight, Hammer,
} from "lucide-react";
import {
  getProductionOrderById,
  updateProductionOrder,
  listProductionTasksByProductionOrder,
  createProductionTask,
  updateProductionTask,
  postProductionToInventory,
} from "@/lib/firestore/production";
import { getOrderById } from "@/lib/firestore/orders";
import { getInventoryItemById, getInventoryLocationById } from "@/lib/firestore/inventory";
import type { ProductionOrder, ProductionTask, ProductionStatus } from "@/types/production";
import {
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_PROJECT_TYPE_LABELS,
  PRODUCTION_TYPE_LABELS,
} from "@/types/production";
import { productionTaskSchema, type ProductionTaskFormValues } from "@/lib/schemas/production";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/context/currency-context";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<ProductionStatus, BadgeVariant> = {
  pending: "default",
  design_measurements: "blue",
  materials_pending: "amber",
  materials_ready: "green",
  cutting: "purple",
  assembly: "purple",
  sanding: "purple",
  painting_sealing: "purple",
  roofing_details: "purple",
  quality_control: "blue",
  ready_for_delivery: "green",
  delivered_to_store: "green",
  installed: "green",
  closed: "default",
  cancelled: "red",
};

const STATUS_FLOW: { status: ProductionStatus; label: string }[] = [
  { status: "design_measurements", label: "Diseño / medidas" },
  { status: "materials_pending", label: "Mat. pendientes" },
  { status: "materials_ready", label: "Materiales listos" },
  { status: "cutting", label: "Marcar corte" },
  { status: "assembly", label: "Ensamblaje" },
  { status: "sanding", label: "Lijado" },
  { status: "painting_sealing", label: "Pintura / sellador" },
  { status: "roofing_details", label: "Techo / detalles" },
  { status: "quality_control", label: "Control calidad" },
  { status: "ready_for_delivery", label: "Listo para entrega" },
  { status: "installed", label: "Marcar instalado" },
  { status: "closed", label: "Cerrar producción" },
  { status: "cancelled", label: "Cancelar" },
];

function isOverdue(date?: Date, status?: ProductionStatus): boolean {
  if (!date || !status) return false;
  const terminal: ProductionStatus[] = ["closed", "cancelled", "installed", "delivered_to_store"];
  if (terminal.includes(status)) return false;
  return date < new Date();
}

function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function InfoRow({ label, value, highlight }: { label: string; value?: string | number; highlight?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-red-400" : "text-zinc-200"}`}>{value}</p>
    </div>
  );
}

function TaskStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />;
  if (status === "in_progress") return <Play size={15} className="text-blue-400 shrink-0" />;
  if (status === "blocked") return <XCircle size={15} className="text-red-400 shrink-0" />;
  return <Circle size={15} className="text-zinc-600 shrink-0" />;
}

export default function ProductionOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { formatCurrency } = useCurrency();

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [linkedOrderNumber, setLinkedOrderNumber] = useState<string | null>(null);
  const [inventoryItemName, setInventoryItemName] = useState<string | null>(null);
  const [destinationLocationName, setDestinationLocationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [hoursInput, setHoursInput] = useState("");
  const [savingHours, setSavingHours] = useState(false);
  const [postingInventory, setPostingInventory] = useState(false);
  const [postInventoryError, setPostInventoryError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductionTaskFormValues>({
    resolver: zodResolver(productionTaskSchema),
    defaultValues: { status: "pending" },
  });

  useEffect(() => {
    Promise.all([
      getProductionOrderById(id),
      listProductionTasksByProductionOrder(id),
    ])
      .then(([o, t]) => {
        setOrder(o);
        if (o?.orderId) {
          getOrderById(o.orderId).then((linked) => {
            if (linked) setLinkedOrderNumber(linked.orderNumber);
          }).catch(() => {});
        }
        if (o?.productionType === "stock") {
          if (o.inventoryItemId) {
            getInventoryItemById(o.inventoryItemId).then((item) => {
              if (item) setInventoryItemName(item.name);
            }).catch(() => {});
          }
          if (o.destinationLocationId) {
            getInventoryLocationById(o.destinationLocationId).then((loc) => {
              if (loc) setDestinationLocationName(loc.name);
            }).catch(() => {});
          }
        }
        setTasks(t);
        if (o) setHoursInput(o.actualLaborHours?.toString() ?? "");
      })
      .catch(() => setLoadError("Error al cargar la orden de producción."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus: ProductionStatus) {
    if (!order || newStatus === order.status) return;
    setSavingStatus(true);
    try {
      const extra: Partial<Parameters<typeof updateProductionOrder>[1]> = {};
      if (newStatus === "installed" || newStatus === "closed") {
        extra.actualFinishDate = new Date().toISOString().split("T")[0];
      }
      await updateProductionOrder(id, { status: newStatus, ...extra });
      setOrder((prev) => prev ? {
        ...prev, status: newStatus,
        actualFinishDate: extra.actualFinishDate ? new Date(extra.actualFinishDate) : prev.actualFinishDate,
      } : prev);
    } finally {
      setSavingStatus(false);
    }
  }

  async function onAddTask(values: ProductionTaskFormValues) {
    setTaskError(null);
    try {
      const taskId = await createProductionTask(id, values);
      const newTask: ProductionTask = {
        id: taskId,
        productionOrderId: id,
        title: values.title,
        description: values.description,
        status: values.status,
        assignedTo: values.assignedTo,
        estimatedHours: values.estimatedHours,
        actualHours: values.actualHours,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTasks((prev) => [...prev, newTask]);
      reset({ status: "pending" });
      setShowTaskForm(false);
    } catch {
      setTaskError("Error al crear la tarea.");
    }
  }

  async function toggleTaskStatus(task: ProductionTask) {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    const completedAt = nextStatus === "completed" ? new Date() : null;
    await updateProductionTask(task.id, { status: nextStatus, completedAt });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextStatus, completedAt: completedAt ?? undefined } : t));
  }

  async function handlePostInventory() {
    if (!order) return;
    setPostingInventory(true);
    setPostInventoryError(null);
    try {
      await postProductionToInventory(order.id);
      setOrder((prev) => prev ? { ...prev, inventoryPosted: true, inventoryPostedAt: new Date() } : prev);
    } catch (err) {
      setPostInventoryError(err instanceof Error ? err.message : "Error al registrar el inventario.");
    } finally {
      setPostingInventory(false);
    }
  }

  async function saveActualHours() {
    const hours = parseFloat(hoursInput);
    if (isNaN(hours) || hours < 0) return;
    setSavingHours(true);
    try {
      await updateProductionOrder(id, { actualLaborHours: hours });
      setOrder((prev) => prev ? { ...prev, actualLaborHours: hours } : prev);
    } finally {
      setSavingHours(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>;
  }
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-red-400">{loadError}</p>
        <Link href="/produccion" className="text-xs text-amber-400 hover:underline">Volver a producción</Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-zinc-400">Orden no encontrada</p>
        <Link href="/produccion" className="text-xs text-amber-400 hover:underline">Volver a producción</Link>
      </div>
    );
  }

  const overdue = isOverdue(order.promisedDeliveryDate, order.status);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/produccion"
            className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-amber-400">{order.productionNumber}</span>
              <Badge variant={STATUS_VARIANT[order.status]}>{PRODUCTION_STATUS_LABELS[order.status]}</Badge>
              <Badge variant={order.productionType === "stock" ? "green" : "blue"} className="text-[10px]">
                {PRODUCTION_TYPE_LABELS[order.productionType ?? "order_based"]}
              </Badge>
              {(order.priority === "high" || order.priority === "urgent") && (
                <Badge variant={order.priority === "urgent" ? "red" : "amber"}>
                  {PRODUCTION_PRIORITY_LABELS[order.priority]}
                </Badge>
              )}
              {overdue && <Badge variant="red"><AlertTriangle size={10} className="mr-1" />Retrasada</Badge>}
            </div>
            <h1 className="text-xl font-bold text-zinc-100 mt-0.5" style={{ fontFamily: "var(--font-heading)" }}>
              {order.title}
            </h1>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`/produccion/${id}/editar`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            <Edit size={13} /> Editar
          </Link>
          {/* Status selector */}
          <div className="relative flex items-center gap-1.5">
            {savingStatus && <Loader2 size={12} className="animate-spin text-zinc-500" />}
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as ProductionStatus)}
              disabled={savingStatus || order.status === "closed" || order.status === "cancelled"}
              className="rounded-lg border border-zinc-700 bg-zinc-800 pl-3 pr-7 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed [&>option]:bg-zinc-900 cursor-pointer appearance-none"
            >
              {STATUS_FLOW.map((s) => (
                <option key={s.status} value={s.status}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overdue banner */}
      {overdue && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          <AlertTriangle size={14} />
          Esta orden está retrasada. Fecha prometida: {formatDate(order.promisedDeliveryDate)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-300">Información general</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {order.productionType !== "stock" && (
                <InfoRow label="Cliente" value={order.clientName} />
              )}
              {order.productionType !== "stock" && (
                <InfoRow label="Teléfono" value={order.clientPhone} />
              )}
              <InfoRow label="Tipo de proyecto" value={PRODUCTION_PROJECT_TYPE_LABELS[order.projectType]} />
              <InfoRow label="Prioridad" value={PRODUCTION_PRIORITY_LABELS[order.priority]} />
              <InfoRow label="Responsable" value={order.responsiblePerson} />
              <InfoRow label="Equipo" value={order.assignedTeam} />
              {order.orderId && (
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-zinc-500">Pedido vinculado</p>
                  <Link
                    href={`/pedidos/${order.orderId}`}
                    className="text-sm font-medium text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                  >
                    {linkedOrderNumber ?? order.orderId}
                  </Link>
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

          {/* Tasks */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-300">Tareas</h2>
                {tasks.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {completedTasks}/{tasks.length} completadas
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTaskForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
              >
                <Plus size={12} /> Añadir tarea
              </button>
            </div>

            {/* Add task form */}
            {showTaskForm && (
              <form onSubmit={handleSubmit(onAddTask)} className="border-b border-zinc-800 p-4 flex flex-col gap-3 bg-zinc-800/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <Label>Título de la tarea *</Label>
                    <Input {...register("title")} placeholder="Ej. Cortar vigas principales" />
                    {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Asignado a</Label>
                    <Input {...register("assignedTo")} placeholder="Nombre del operario" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Horas estimadas</Label>
                    <Input type="number" min={0} step="0.5" {...register("estimatedHours", { valueAsNumber: true })} placeholder="0" />
                  </div>
                </div>
                {taskError && <p className="text-xs text-red-400">{taskError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowTaskForm(false)} className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 transition-colors">
                    {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                    Crear tarea
                  </button>
                </div>
              </form>
            )}

            {/* Task list */}
            {tasks.length === 0 ? (
              <p className="text-xs text-zinc-600 px-5 py-6">Sin tareas registradas. Añade una para comenzar.</p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task)}
                      className="mt-0.5 hover:opacity-70 transition-opacity"
                      title={task.status === "completed" ? "Marcar pendiente" : "Marcar completada"}
                    >
                      <TaskStatusIcon status={task.status} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {task.assignedTo && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <User size={10} /> {task.assignedTo}
                          </span>
                        )}
                        {task.estimatedHours !== undefined && (
                          <span className="text-xs text-zinc-600 flex items-center gap-1">
                            <Clock size={10} /> {task.estimatedHours}h est.
                          </span>
                        )}
                        {task.completedAt && (
                          <span className="text-xs text-emerald-600">
                            ✓ {task.completedAt.toLocaleDateString("es-ES")}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Photos placeholder */}
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-sm text-zinc-500">Sección de fotos de progreso</p>
            <p className="text-xs text-zinc-700 mt-1">Próximamente: subida de fotos por fase del proceso</p>
          </div>

          {/* Stock production: inventory posting panel */}
          {order.productionType === "stock" && (
            <div className="rounded-xl border border-green-800/40 bg-green-950/20 p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-green-300">Producción para stock</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventoryItemName && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-zinc-500">Artículo</p>
                    <p className="text-sm font-medium text-zinc-200">{inventoryItemName}</p>
                  </div>
                )}
                {order.quantityToProduce !== undefined && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-zinc-500">Cantidad a producir</p>
                    <p className="text-sm font-medium text-zinc-200">{order.quantityToProduce}</p>
                  </div>
                )}
                {destinationLocationName && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-zinc-500">Destino</p>
                    <p className="text-sm font-medium text-zinc-200">{destinationLocationName}</p>
                  </div>
                )}
                {order.unitCost !== undefined && (
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs text-zinc-500">Costo por unidad</p>
                    <p className="text-sm font-medium text-zinc-200">{formatCurrency(order.unitCost)}</p>
                  </div>
                )}
              </div>
              {destinationLocationName && order.quantityToProduce && (
                <p className="text-xs text-zinc-400">
                  Al registrar, entrarán <strong className="text-green-300">{order.quantityToProduce} unidades</strong> de <strong className="text-green-300">{inventoryItemName}</strong> en <strong className="text-zinc-300">{destinationLocationName}</strong>.
                </p>
              )}
              {order.inventoryPosted ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-700/40 bg-green-900/30 px-3 py-2 text-xs text-green-300">
                  <CheckCircle2 size={14} />
                  Inventario registrado{order.inventoryPostedAt ? ` · ${order.inventoryPostedAt.toLocaleDateString("es-ES")}` : ""}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {postInventoryError && (
                    <p className="text-xs text-red-400">{postInventoryError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handlePostInventory}
                    disabled={postingInventory || order.status === "cancelled"}
                    className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {postingInventory ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {postingInventory ? "Registrando…" : "Registrar entrada a inventario"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {(order.notes || order.internalNotes) && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-zinc-300">Notas</h2>
              {order.notes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Notas generales</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
              {order.internalNotes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Notas internas</p>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{order.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Dates */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Fechas</h2>
            <InfoRow label="Inicio planificado" value={formatDate(order.plannedStartDate)} />
            <InfoRow
              label="Entrega prometida"
              value={order.promisedDeliveryDate ? formatDate(order.promisedDeliveryDate) : "—"}
              highlight={overdue}
            />
            <InfoRow label="Fecha de finalización real" value={formatDate(order.actualFinishDate)} />
            <InfoRow label="Fecha de creación" value={formatDate(order.createdAt)} />
          </div>

          {/* Hours */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Horas de trabajo</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Estimadas</span>
              <span className="text-zinc-200 font-medium">
                {order.estimatedLaborHours !== undefined ? `${order.estimatedLaborHours}h` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Reales</span>
              <span className="text-zinc-200 font-medium">
                {order.actualLaborHours !== undefined ? `${order.actualLaborHours}h` : "—"}
              </span>
            </div>
            {/* Inline hours update */}
            {order.status !== "closed" && order.status !== "cancelled" && (
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  placeholder="Horas reales"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={saveActualHours}
                  disabled={savingHours}
                  className="flex items-center gap-1 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-60 transition-colors"
                >
                  {savingHours ? <Loader2 size={11} className="animate-spin" /> : <Hammer size={11} />}
                  Guardar
                </button>
              </div>
            )}
          </div>

          {/* Financials */}
          {(order.workshopInternalPrice !== undefined || order.estimatedMaterialCost !== undefined) && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-zinc-300">Costos internos</h2>
              {order.workshopInternalPrice !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Precio taller</span>
                  <span className="text-zinc-200 font-medium">{formatCurrency(order.workshopInternalPrice)}</span>
                </div>
              )}
              {order.estimatedMaterialCost !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Costo materiales</span>
                  <span className="text-zinc-200 font-medium">{formatCurrency(order.estimatedMaterialCost)}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick status actions */}
          {order.status !== "closed" && order.status !== "cancelled" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-zinc-300">Acciones rápidas</h2>
              <div className="flex flex-col gap-2">
                {STATUS_FLOW.filter((s) => s.status !== order.status && s.status !== "cancelled").map((s) => (
                  <button
                    key={s.status}
                    type="button"
                    onClick={() => handleStatusChange(s.status)}
                    disabled={savingStatus}
                    className="flex items-center justify-between w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 disabled:opacity-50 transition-colors"
                  >
                    {s.label}
                    <ChevronRight size={12} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={savingStatus}
                  className="flex items-center justify-between w-full rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:border-red-500/40 hover:bg-red-500/5 disabled:opacity-50 transition-colors"
                >
                  Cancelar orden
                  <XCircle size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
