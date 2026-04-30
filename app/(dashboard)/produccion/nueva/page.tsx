"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Factory, Loader2 } from "lucide-react";
import Link from "next/link";
import { productionOrderSchema, type ProductionOrderFormValues } from "@/lib/schemas/production";
import { createProductionOrder } from "@/lib/firestore/production";
import { getOrderById, updateOrder } from "@/lib/firestore/orders";
import {
  PRODUCTION_PROJECT_TYPE_LABELS,
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
} from "@/types/production";
import type { ProductionProjectType, ProductionStatus, ProductionPriority } from "@/types/production";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

export default function NuevaOrdenProduccionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOrderId = searchParams.get("fromOrder");

  const [serverError, setServerError] = useState<string | null>(null);
  const [fromOrderNumber, setFromOrderNumber] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(!!fromOrderId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductionOrderFormValues>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: {
      status: "pending",
      priority: "medium",
      projectType: "custom",
    },
  });

  useEffect(() => {
    if (!fromOrderId) return;
    getOrderById(fromOrderId)
      .then((order) => {
        if (!order) return;
        setFromOrderNumber(order.orderNumber);
        reset({
          clientName: order.clientName,
          clientPhone: order.clientPhone ?? "",
          orderId: fromOrderId,
          projectType: order.projectType as ProductionProjectType,
          title: order.title,
          description: order.description ?? "",
          priority: order.priority as ProductionPriority,
          promisedDeliveryDate: order.promisedDeliveryDate
            ? order.promisedDeliveryDate.toISOString().split("T")[0]
            : "",
          notes: order.notes ?? "",
          internalNotes: order.internalNotes ?? "",
          workshopInternalPrice: order.finalSalePrice,
          status: "pending",
        });
      })
      .finally(() => setLoadingOrder(false));
  }, [fromOrderId, reset]);

  async function onSubmit(values: ProductionOrderFormValues) {
    setServerError(null);
    try {
      const id = await createProductionOrder(values);
      if (fromOrderId) {
        await updateOrder(fromOrderId, { status: "sent_to_workshop" });
      }
      router.push(`/produccion/${id}`);
    } catch {
      setServerError("Error al crear la orden. Intenta de nuevo.");
    }
  }

  if (loadingOrder) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={fromOrderId ? `/pedidos/${fromOrderId}` : "/produccion"}
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Nueva orden de producción
          </h1>
          <p className="text-xs text-zinc-500">
            {fromOrderNumber ? `Desde pedido ${fromOrderNumber}` : "Registra un proyecto para fabricación en taller"}
          </p>
        </div>
      </div>

      {/* From-order banner */}
      {fromOrderNumber && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          <Factory size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Datos precargados desde el pedido {fromOrderNumber}</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Completa los campos faltantes (responsable, equipo, fechas, costos internos) y guarda para crear la orden.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Client */}
        <Section title="Cliente y proyecto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del cliente *" error={errors.clientName?.message} className="sm:col-span-2">
              <Input {...register("clientName")} placeholder="Nombre completo del cliente" />
            </Field>
            <Field label="Teléfono del cliente">
              <Input {...register("clientPhone")} placeholder="+504 9999-9999" />
            </Field>
            <Field label="ID del pedido (opcional)">
              <Input {...register("orderId")} placeholder="ID del pedido relacionado" readOnly={!!fromOrderId} className={fromOrderId ? "opacity-60 cursor-not-allowed" : ""} />
            </Field>
          </div>
        </Section>

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
            <Field label="Estado inicial *">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha de inicio planificada">
              <Input type="date" {...register("plannedStartDate")} />
            </Field>
            <Field label="Fecha de entrega prometida">
              <Input type="date" {...register("promisedDeliveryDate")} />
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
            <Field label="Horas estimadas de trabajo">
              <Input type="number" min={0} step="0.5" {...register("estimatedLaborHours", { valueAsNumber: true })} placeholder="0" />
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
            href="/produccion"
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
            {isSubmitting ? "Creando…" : fromOrderId ? "Crear orden desde pedido" : "Crear orden de producción"}
          </button>
        </div>
      </form>
    </div>
  );
}
