"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { leadSchema, type LeadFormValues } from "@/lib/schemas/lead";
import { getLeadById, updateLead } from "@/lib/firestore/leads";
import { LEAD_SOURCE_LABELS, LEAD_INTERESTED_IN_LABELS, LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS } from "@/types/lead";
import type { LeadSource, LeadInterestedIn, LeadPriority, LeadStatus } from "@/types/lead";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

const clean = (v?: string) => (v?.trim() === "" ? undefined : v?.trim());

function toDateInputValue(date?: Date): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function EditLeadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

  useEffect(() => {
    getLeadById(leadId).then((lead) => {
      if (!lead) return;
      reset({
        fullName: lead.fullName,
        phone: lead.phone,
        secondaryPhone: lead.secondaryPhone ?? "",
        email: lead.email ?? "",
        source: lead.source,
        interestedIn: lead.interestedIn,
        status: lead.status,
        priority: lead.priority,
        department: lead.department ?? "",
        city: lead.city ?? "",
        budgetRange: lead.budgetRange ?? "",
        expectedPurchaseDate: toDateInputValue(lead.expectedPurchaseDate),
        notes: lead.notes ?? "",
        nextAction: lead.nextAction ?? "",
        nextActionDate: toDateInputValue(lead.nextActionDate),
        lossReason: lead.lossReason ?? "",
      });
    }).finally(() => setLoading(false));
  }, [leadId, reset]);

  async function onSubmit(values: LeadFormValues) {
    setServerError(null);
    try {
      await updateLead(leadId, {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        secondaryPhone: clean(values.secondaryPhone),
        email: clean(values.email),
        source: values.source,
        interestedIn: values.interestedIn,
        status: values.status,
        priority: values.priority,
        department: clean(values.department),
        city: clean(values.city),
        budgetRange: clean(values.budgetRange),
        expectedPurchaseDate: values.expectedPurchaseDate
          ? new Date(values.expectedPurchaseDate + "T00:00:00")
          : undefined,
        notes: clean(values.notes),
        nextAction: clean(values.nextAction),
        nextActionDate: values.nextActionDate
          ? new Date(values.nextActionDate + "T00:00:00")
          : undefined,
        lossReason: clean(values.lossReason),
      });
      router.push(`/crm/${leadId}`);
    } catch {
      setServerError("Error al guardar los cambios. Intenta de nuevo.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/crm/${leadId}`}
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Editar lead
          </h1>
          <p className="text-xs text-zinc-500">Modifica la información del prospecto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Required info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Información principal</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Nombre completo *</Label>
              <Input id="fullName" {...register("fullName")} placeholder="Ej. Juan Pérez" />
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input id="phone" {...register("phone")} placeholder="Ej. +57 300 123 4567" />
              {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="secondaryPhone">Teléfono secundario</Label>
              <Input id="secondaryPhone" {...register("secondaryPhone")} placeholder="Opcional" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" {...register("email")} placeholder="correo@ejemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Canal de origen *</Label>
              <select
                id="source"
                {...register("source")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 [&>option]:bg-zinc-900"
              >
                {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((s) => (
                  <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="interestedIn">Interesado en *</Label>
              <select
                id="interestedIn"
                {...register("interestedIn")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 [&>option]:bg-zinc-900"
              >
                {(Object.keys(LEAD_INTERESTED_IN_LABELS) as LeadInterestedIn[]).map((i) => (
                  <option key={i} value={i}>{LEAD_INTERESTED_IN_LABELS[i]}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Prioridad *</Label>
              <select
                id="priority"
                {...register("priority")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 [&>option]:bg-zinc-900"
              >
                {(Object.keys(LEAD_PRIORITY_LABELS) as LeadPriority[]).map((p) => (
                  <option key={p} value={p}>{LEAD_PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              {...register("status")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 [&>option]:bg-zinc-900"
            >
              {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Información adicional</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department">Departamento</Label>
              <Input id="department" {...register("department")} placeholder="Ej. Francisco Morazán" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...register("city")} placeholder="Ej. Tegucigalpa" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budgetRange">Presupuesto estimado</Label>
              <Input id="budgetRange" {...register("budgetRange")} placeholder="Ej. L 200,000 - L 300,000" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedPurchaseDate">Fecha estimada de compra</Label>
              <DatePicker value={watch("expectedPurchaseDate")} onChange={(v) => setValue("expectedPurchaseDate", v || undefined)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Información adicional sobre el lead..." rows={3} className="resize-y" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lossReason">Motivo de pérdida</Label>
            <Input id="lossReason" {...register("lossReason")} placeholder="Solo si el lead fue perdido" />
          </div>
        </div>

        {/* Next action */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Próxima acción</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="nextAction">Acción a realizar</Label>
              <Input id="nextAction" {...register("nextAction")} placeholder="Ej. Llamar para agendar visita" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextActionDate">Fecha límite</Label>
              <DatePicker value={watch("nextActionDate")} onChange={(v) => setValue("nextActionDate", v || undefined)} />
            </div>
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{serverError}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Link
            href={`/crm/${leadId}`}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 transition-colors"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
