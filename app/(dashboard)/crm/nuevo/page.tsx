"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { leadSchema, type LeadFormValues } from "@/lib/schemas/lead";
import { createLead } from "@/lib/firestore/leads";
import { LEAD_SOURCE_LABELS, LEAD_INTERESTED_IN_LABELS, LEAD_PRIORITY_LABELS } from "@/types/lead";
import type { LeadSource, LeadInterestedIn, LeadPriority } from "@/types/lead";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const clean = (v?: string) => (v?.trim() === "" ? undefined : v?.trim());

export default function NewLeadPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      status: "new",
      priority: "medium",
      interestedIn: "unknown",
      source: "whatsapp",
    },
  });

  async function onSubmit(values: LeadFormValues) {
    setServerError(null);
    try {
      const id = await createLead({
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
          ? new Date(values.expectedPurchaseDate)
          : undefined,
        notes: clean(values.notes),
        nextAction: clean(values.nextAction),
        nextActionDate: values.nextActionDate
          ? new Date(values.nextActionDate)
          : undefined,
      });
      router.push(`/crm/${id}`);
    } catch {
      setServerError("Error al crear el lead. Intenta de nuevo.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/crm"
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Nuevo lead
          </h1>
          <p className="text-xs text-zinc-500">Registra un prospecto nuevo</p>
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
        </div>

        {/* Optional info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Información adicional</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department">Departamento</Label>
              <Input id="department" {...register("department")} placeholder="Ej. Cundinamarca" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" {...register("city")} placeholder="Ej. Bogotá" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budgetRange">Presupuesto estimado</Label>
              <Input id="budgetRange" {...register("budgetRange")} placeholder="Ej. $5M - $10M" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedPurchaseDate">Fecha estimada de compra</Label>
              <Input id="expectedPurchaseDate" type="date" {...register("expectedPurchaseDate")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Información adicional sobre el lead..." rows={3} className="resize-y" />
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
              <Label htmlFor="nextActionDate">Fecha de la acción</Label>
              <Input id="nextActionDate" type="date" {...register("nextActionDate")} />
            </div>
          </div>
        </div>

        {serverError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href="/crm"
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
            {isSubmitting ? "Guardando…" : "Crear lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
