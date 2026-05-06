"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { productionOrderSchema, type ProductionOrderFormValues } from "@/lib/schemas/production";
import { getProductionOrderById, updateProductionOrder } from "@/lib/firestore/production";
import { listInventoryItems, listInventoryLocations } from "@/lib/firestore/inventory";
import {
  PRODUCTION_PROJECT_TYPE_LABELS,
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
} from "@/types/production";
import type { ProductionProjectType, ProductionStatus, ProductionPriority } from "@/types/production";
import type { InventoryItem, InventoryLocation } from "@/types/inventory";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function toDateInputValue(date?: Date): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export default function EditarOrdenProduccionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productionTypeVal, setProductionTypeVal] = useState<"order_based" | "stock" | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductionOrderFormValues>({
    resolver: zodResolver(productionOrderSchema),
  });

  useEffect(() => {
    getProductionOrderById(id)
      .then((order) => {
        if (!order) {
          setLoadError("Orden no encontrada.");
          return;
        }
        setProductionTypeVal(order.productionType ?? "order_based");
        if ((order.productionType ?? "order_based") === "stock") {
          listInventoryItems().then((items) => setInventoryItems(items.filter((i) => i.isActive)));
          listInventoryLocations().then((locs) => setLocations(locs.filter((l) => l.isActive)));
        }
        reset({
          productionType: order.productionType ?? "order_based",
          orderId: order.orderId ?? "",
          clientName: order.clientName ?? "",
          clientPhone: order.clientPhone ?? "",
          inventoryItemId: order.inventoryItemId ?? "",
          quantityToProduce: order.quantityToProduce,
          destinationLocationId: order.destinationLocationId ?? "",
          unitCost: order.unitCost,
          projectType: order.projectType,
          title: order.title,
          description: order.description ?? "",
          status: order.status,
          priority: order.priority,
          workshopInternalPrice: order.workshopInternalPrice,
          estimatedMaterialCost: order.estimatedMaterialCost,
          estimatedLaborHours: order.estimatedLaborHours,
          actualLaborHours: order.actualLaborHours,
          plannedStartDate: toDateInputValue(order.plannedStartDate),
          promisedDeliveryDate: toDateInputValue(order.promisedDeliveryDate),
          actualFinishDate: toDateInputValue(order.actualFinishDate),
          assignedTeam: order.assignedTeam ?? "",
          responsiblePerson: order.responsiblePerson ?? "",
          notes: order.notes ?? "",
          internalNotes: order.internalNotes ?? "",
        });
      })
      .catch(() => setLoadError("Error al cargar la orden."))
      .finally(() => setLoading(false));
  }, [id, reset]);

  async function onSubmit(values: ProductionOrderFormValues) {
    setServerError(null);
    try {
      await updateProductionOrder(id, values);
      router.push(`/produccion/${id}`);
    } catch {
      setServerError("Error al guardar los cambios. Intenta de nuevo.");
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

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/produccion/${id}`}
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Editar orden de producción
          </h1>
          <p className="text-xs text-zinc-500">Actualiza los datos del proyecto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Client - only for order_based */}
        {productionTypeVal !== "stock" && (
        <Section title="Cliente y proyecto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del cliente *" error={errors.clientName?.message} className="sm:col-span-2">
              <Input {...register("clientName")} placeholder="Nombre completo del cliente" />
            </Field>
            <Field label="Teléfono del cliente">
              <Input {...register("clientPhone")} placeholder="+504 9999-9999" />
            </Field>
            <Field label="ID del pedido (opcional)">
              <Input {...register("orderId")} placeholder="ID del pedido relacionado" />
            </Field>
          </div>
        </Section>
        )}

        {/* Stock-specific fields */}
        {productionTypeVal === "stock" && (
          <Section title="Artículo para producir">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Artículo del catálogo *" error={errors.inventoryItemId?.message} className="sm:col-span-2">
                <select
                  {...register("inventoryItemId")}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                >
                  <option value="">— Selecciona un artículo —</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.sku ? ` (${item.sku})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad a producir *" error={errors.quantityToProduce?.message}>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  {...register("quantityToProduce", { valueAsNumber: true })}
                  placeholder="0"
                />
              </Field>
              <Field label="Ubicación de destino *" error={errors.destinationLocationId?.message}>
                <select
                  {...register("destinationLocationId")}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                >
                  <option value="">— Selecciona ubicación —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Costo por unidad (opcional)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register("unitCost", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </Field>
            </div>
          </Section>
        )}

        {/* Production details */}
        <Section title="Detalles de la orden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo de proyecto *">
              <select {...register("projectType")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                {(Object.keys(PRODUCTION_PROJECT_TYPE_LABELS) as ProductionProjectType[]).map((t) => (
                  <option key={t} value={t}>{PRODUCTION_PROJECT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad *">
              <select {...register("priority")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                {(Object.keys(PRODUCTION_PRIORITY_LABELS) as ProductionPriority[]).map((p) => (
                  <option key={p} value={p}>{PRODUCTION_PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado *">
              <select {...register("status")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                {(Object.keys(PRODUCTION_STATUS_LABELS) as ProductionStatus[]).map((s) => (
                  <option key={s} value={s}>{PRODUCTION_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Responsable">
              <Input {...register("responsiblePerson")} placeholder="Nombre del encargado" />
            </Field>
            <Field label="Título del proyecto *" error={errors.title?.message} className="sm:col-span-2">
              <Input {...register("title")} placeholder="Ej. Cabaña 3 habitaciones – Finca La Esperanza" />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <Textarea {...register("description")} rows={3} placeholder="Descripción del trabajo a realizar…" />
            </Field>
            <Field label="Equipo asignado" className="sm:col-span-2">
              <Input {...register("assignedTeam")} placeholder="Ej. Equipo carpintería norte" />
            </Field>
          </div>
        </Section>

        {/* Dates */}
        <Section title="Fechas">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Fecha de inicio planificada">
              <DatePicker value={watch("plannedStartDate")} onChange={(v) => setValue("plannedStartDate", v || undefined)} />
            </Field>
            <Field label="Fecha de entrega prometida">
              <DatePicker value={watch("promisedDeliveryDate")} onChange={(v) => setValue("promisedDeliveryDate", v || undefined)} />
            </Field>
            <Field label="Fecha de finalización real">
              <DatePicker value={watch("actualFinishDate")} onChange={(v) => setValue("actualFinishDate", v || undefined)} />
            </Field>
          </div>
        </Section>

        {/* Internal financials */}
        <Section title="Costos internos (taller)">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Precio interno (taller)">
              <Input type="number" min={0} {...register("workshopInternalPrice", { valueAsNumber: true })} placeholder="0" />
            </Field>
            <Field label="Costo estimado de materiales">
              <Input type="number" min={0} {...register("estimatedMaterialCost", { valueAsNumber: true })} placeholder="0" />
            </Field>
            <Field label="Horas estimadas">
              <Input type="number" min={0} step="0.5" {...register("estimatedLaborHours", { valueAsNumber: true })} placeholder="0" />
            </Field>
          </div>
        </Section>

        {/* Actual hours */}
        <Section title="Resultados reales">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Horas reales de trabajo">
              <Input type="number" min={0} step="0.5" {...register("actualLaborHours", { valueAsNumber: true })} placeholder="0" />
            </Field>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notas">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Notas generales">
              <Textarea {...register("notes")} rows={3} placeholder="Notas visibles para el equipo…" />
            </Field>
            <Field label="Notas internas">
              <Textarea {...register("internalNotes")} rows={3} placeholder="Notas internas de administración…" />
            </Field>
          </div>
        </Section>

        {serverError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{serverError}</p>
        )}

        <div className="flex gap-3">
          <Link
            href={`/produccion/${id}`}
            className="flex-1 flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
