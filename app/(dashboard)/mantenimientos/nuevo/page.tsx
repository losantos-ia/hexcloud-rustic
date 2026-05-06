"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { maintenanceAssetSchema, type MaintenanceAssetFormValues } from "@/lib/schemas/maintenance";
import { createMaintenanceAsset } from "@/lib/firestore/maintenance";
import { MAINTENANCE_PROJECT_TYPE_LABELS, type MaintenanceProjectType } from "@/types/maintenance";

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

export default function NuevoActivoPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceAssetFormValues>({
    resolver: zodResolver(maintenanceAssetSchema),
    defaultValues: { maintenanceFrequencyMonths: 6, status: "active" },
  });

  async function onSubmit(values: MaintenanceAssetFormValues) {
    setServerError(null);
    try {
      const id = await createMaintenanceAsset(values);
      router.push(`/mantenimientos/${id}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Error al crear el activo");
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/mantenimientos"
          className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Registrar activo</h1>
          <p className="text-sm text-zinc-400">Registra una estructura instalada para seguimiento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Client info */}
        <Section title="Información del cliente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del cliente *" error={errors.clientName?.message} className="sm:col-span-2">
              <Input {...register("clientName")} placeholder="Nombre completo" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="Teléfono *" error={errors.clientPhone?.message}>
              <Input {...register("clientPhone")} placeholder="+504 0000-0000" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="ID cliente (opcional)">
              <Input {...register("clientId")} placeholder="ID en el sistema" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
          </div>
        </Section>

        {/* Project info */}
        <Section title="Información del proyecto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo de estructura *" error={errors.projectType?.message}>
              <select
                {...register("projectType")}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Seleccionar...</option>
                {(Object.entries(MAINTENANCE_PROJECT_TYPE_LABELS) as [MaintenanceProjectType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Frecuencia de mantenimiento *" error={errors.maintenanceFrequencyMonths?.message}>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  {...register("maintenanceFrequencyMonths", { valueAsNumber: true })}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 w-24"
                />
                <span className="text-sm text-zinc-400">meses</span>
              </div>
            </Field>
            <Field label="ID pedido (opcional)">
              <Input {...register("orderId")} placeholder="ID del pedido" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="ID producción (opcional)">
              <Input {...register("productionOrderId")} placeholder="ID de orden de producción" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section title="Ubicación">
          <div className="flex flex-col gap-4">
            <Field label="Dirección *" error={errors.locationAddress?.message}>
              <Input {...register("locationAddress")} placeholder="Dirección completa de instalación" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="Google Maps URL">
              <Input {...register("googleMapsUrl")} placeholder="https://maps.google.com/..." className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
          </div>
        </Section>

        {/* Dates */}
        <Section title="Fechas">
          <Field label="Fecha de instalación *" error={errors.installationDate?.message}>
            <DatePicker
              value={watch("installationDate")}
              onChange={(v) => setValue("installationDate", v ?? "")}
            />
          </Field>
          <p className="text-xs text-zinc-500">
            La próxima fecha de mantenimiento se calculará automáticamente: fecha de instalación + frecuencia en meses.
          </p>
        </Section>

        {/* Notes */}
        <Section title="Notas">
          <Field label="Observaciones">
            <Textarea
              {...register("notes")}
              placeholder="Detalles adicionales de la instalación, condiciones especiales, etc."
              rows={3}
              className="resize-y bg-zinc-950 border-zinc-800 text-zinc-200"
            />
          </Field>
        </Section>

        {serverError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{serverError}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/mantenimientos">
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
            {isSubmitting ? "Guardando..." : "Registrar activo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
