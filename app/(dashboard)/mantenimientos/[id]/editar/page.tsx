"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { maintenanceAssetSchema, type MaintenanceAssetFormValues } from "@/lib/schemas/maintenance";
import { getMaintenanceAssetById, updateMaintenanceAsset } from "@/lib/firestore/maintenance";
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

function toDateStr(date?: Date): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export default function EditarActivoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = params.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceAssetFormValues>({
    resolver: zodResolver(maintenanceAssetSchema),
    defaultValues: { maintenanceFrequencyMonths: 6, status: "active" },
  });

  useEffect(() => {
    getMaintenanceAssetById(assetId).then((asset) => {
      if (!asset) { setLoadError("Activo no encontrado."); setLoading(false); return; }
      reset({
        clientId: asset.clientId ?? "",
        clientName: asset.clientName,
        clientPhone: asset.clientPhone,
        projectType: asset.projectType,
        productionOrderId: asset.productionOrderId ?? "",
        orderId: asset.orderId ?? "",
        locationAddress: asset.locationAddress,
        googleMapsUrl: asset.googleMapsUrl ?? "",
        installationDate: toDateStr(asset.installationDate),
        maintenanceFrequencyMonths: asset.maintenanceFrequencyMonths,
        status: asset.status,
        notes: asset.notes ?? "",
      });
      setLoading(false);
    }).catch(() => { setLoadError("Error al cargar el activo."); setLoading(false); });
  }, [assetId, reset]);

  async function onSubmit(values: MaintenanceAssetFormValues) {
    setServerError(null);
    try {
      await updateMaintenanceAsset(assetId, values);
      router.push(`/mantenimientos/${assetId}`);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Error al actualizar");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-zinc-500"><Loader2 className="size-5 animate-spin mr-2" /> Cargando...</div>;
  }
  if (loadError) {
    return <div className="flex items-center justify-center min-h-[40vh] text-red-400">{loadError}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/mantenimientos/${assetId}`}
          className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Editar activo</h1>
          <p className="text-sm text-zinc-400">Modifica la información del activo instalado</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Section title="Información del cliente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del cliente *" error={errors.clientName?.message} className="sm:col-span-2">
              <Input {...register("clientName")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="Teléfono *" error={errors.clientPhone?.message}>
              <Input {...register("clientPhone")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="ID cliente">
              <Input {...register("clientId")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
          </div>
        </Section>

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
            <Field label="Frecuencia (meses) *" error={errors.maintenanceFrequencyMonths?.message}>
              <Input type="number" min={1} max={60} {...register("maintenanceFrequencyMonths", { valueAsNumber: true })} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="Estado">
              <select
                {...register("status")}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-500"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
            <Field label="ID pedido">
              <Input {...register("orderId")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
            <Field label="ID producción">
              <Input {...register("productionOrderId")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </Field>
          </div>
        </Section>

        <Section title="Ubicación">
          <Field label="Dirección *" error={errors.locationAddress?.message}>
            <Input {...register("locationAddress")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
          </Field>
          <Field label="Google Maps URL">
            <Input {...register("googleMapsUrl")} placeholder="https://maps.google.com/..." className="bg-zinc-950 border-zinc-800 text-zinc-200" />
          </Field>
        </Section>

        <Section title="Fechas">
          <Field label="Fecha de instalación *" error={errors.installationDate?.message}>
            <DatePicker value={watch("installationDate")} onChange={(v) => setValue("installationDate", v ?? "")} />
          </Field>
        </Section>

        <Section title="Notas">
          <Field label="Observaciones">
            <Textarea {...register("notes")} rows={3} className="resize-y bg-zinc-950 border-zinc-800 text-zinc-200" />
          </Field>
        </Section>

        {serverError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{serverError}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Link href={`/mantenimientos/${assetId}`}>
            <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
