"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, X, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { listClients } from "@/lib/firestore/clients";
import type { Client } from "@/types/client";
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

  // ── Client search ──
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listClients().then(setClients); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredClients = clientSearch.trim().length > 0
    ? clients.filter((c) =>
        c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.documentId?.toLowerCase().includes(clientSearch.toLowerCase())
      ).slice(0, 8)
    : clients.slice(0, 6);

  function pickClient(c: Client) {
    setSelectedClient(c);
    setClientSearch(c.fullName);
    setShowDropdown(false);
    setValue("clientName", c.fullName, { shouldValidate: true });
    setValue("clientPhone", c.phone ?? "", { shouldValidate: true });
    setValue("clientId", c.id);
  }

  function clearClient() {
    setSelectedClient(null);
    setClientSearch("");
    setValue("clientName", "");
    setValue("clientPhone", "");
    setValue("clientId", "");
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceAssetFormValues>({
    resolver: zodResolver(maintenanceAssetSchema),
    defaultValues: { maintenanceFrequencyMonths: 6, status: "active", createdSource: "manual" },
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
          <div ref={searchRef} className="relative">
            <Label>Buscar cliente</Label>
            <div className="relative mt-1.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); setSelectedClient(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar por nombre, teléfono o cédula…"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-8 pr-8 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {clientSearch && (
                <button type="button" onClick={clearClient} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
            {showDropdown && filteredClients.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-h-56 overflow-y-auto">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => pickClient(c)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-zinc-100 truncate">{c.fullName}</span>
                      <span className="text-xs text-zinc-500">{c.phone}{c.documentId ? ` · ${c.documentId}` : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && clientSearch.trim().length > 0 && filteredClients.length === 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-xs text-zinc-500">
                Sin resultados. <Link href="/clientes/nuevo" className="text-amber-400 hover:underline">Crear cliente nuevo</Link>
              </div>
            )}
          </div>

          {selectedClient ? (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-300">{selectedClient.fullName}</p>
                <p className="text-xs text-zinc-400">{selectedClient.phone}{selectedClient.documentId ? ` · ${selectedClient.documentId}` : ""}</p>
              </div>
              <button type="button" onClick={clearClient} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            (errors.clientName || errors.clientPhone) && (
              <p className="text-xs text-red-400">Debes seleccionar un cliente.</p>
            )
          )}

          {/* Hidden registered fields so react-hook-form tracks them */}
          <input type="hidden" {...register("clientName")} />
          <input type="hidden" {...register("clientPhone")} />
          <input type="hidden" {...register("clientId")} />
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
