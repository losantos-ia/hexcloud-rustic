"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Loader2, Plus, Clock, UserCheck, FileText,
  Phone, Mail, MapPin, MessageSquare, ChevronDown, Pencil,
} from "lucide-react";
import Link from "next/link";
import { getLeadById, updateLead, createLeadActivity, listLeadActivities } from "@/lib/firestore/leads";
import type { Lead, LeadActivity, LeadStatus, LeadPriority, LeadActivityType } from "@/types/lead";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_INTERESTED_IN_LABELS,
  LEAD_PRIORITY_LABELS,
  LEAD_ACTIVITY_TYPE_LABELS,
} from "@/types/lead";
import { leadActivitySchema, type LeadActivityFormValues } from "@/lib/schemas/lead";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<LeadStatus, BadgeVariant> = {
  new: "blue", contacted: "purple", qualified: "amber",
  waiting_measurements: "default", quotation_pending: "amber",
  quotation_sent: "blue", follow_up: "purple", negotiation: "amber",
  deposit_pending: "amber", won: "green", lost: "red", archived: "default",
};

const PRIORITY_VARIANT: Record<LeadPriority, BadgeVariant> = {
  high: "red", medium: "amber", low: "default",
};

const ACTIVITY_ICONS: Record<LeadActivityType, React.ReactNode> = {
  call: <Phone size={12} />,
  whatsapp: <MessageSquare size={12} />,
  instagram_message: <MessageSquare size={12} />,
  facebook_message: <MessageSquare size={12} />,
  note: <FileText size={12} />,
  status_change: <ChevronDown size={12} />,
  meeting: <UserCheck size={12} />,
  quotation_sent: <FileText size={12} />,
  follow_up: <Clock size={12} />,
};

function isOverdue(date?: Date): boolean {
  if (!date) return false;
  return date < new Date();
}

function formatDateTime(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTimeRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatAbsoluteDateTime(date: Date): string {
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadActivityFormValues>({
    resolver: zodResolver(leadActivitySchema),
    defaultValues: { type: "note" },
  });

  useEffect(() => {
    Promise.all([getLeadById(leadId), listLeadActivities(leadId)]).then(
      ([l, a]) => {
        setLead(l);
        setActivities(a);
      }
    ).finally(() => setLoading(false));
  }, [leadId]);

  async function handleStatusChange(newStatus: LeadStatus) {
    if (!lead || newStatus === lead.status) return;
    setSavingStatus(true);
    const prevStatus = lead.status;
    try {
      await updateLead(leadId, { status: newStatus });
      await createLeadActivity({
        leadId,
        type: "status_change",
        title: `Estado cambiado: ${LEAD_STATUS_LABELS[prevStatus]} → ${LEAD_STATUS_LABELS[newStatus]}`,
      });
      setLead((prev) => prev ? { ...prev, status: newStatus } : prev);
      setActivities((prev) => [{
        id: Date.now().toString(),
        leadId,
        type: "status_change",
        title: `Estado cambiado: ${LEAD_STATUS_LABELS[prevStatus]} → ${LEAD_STATUS_LABELS[newStatus]}`,
        createdAt: new Date(),
      }, ...prev]);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handlePriorityChange(newPriority: LeadPriority) {
    if (!lead || newPriority === lead.priority) return;
    setSavingPriority(true);
    try {
      await updateLead(leadId, { priority: newPriority });
      setLead((prev) => prev ? { ...prev, priority: newPriority } : prev);
    } finally {
      setSavingPriority(false);
    }
  }

  async function onAddActivity(values: LeadActivityFormValues) {
    setActivityError(null);
    try {
      const id = await createLeadActivity({
        leadId,
        type: values.type,
        title: values.title,
        description: values.description?.trim() || undefined,
      });
      setActivities((prev) => [{
        id,
        leadId,
        type: values.type,
        title: values.title,
        description: values.description?.trim() || undefined,
        createdAt: new Date(),
      }, ...prev]);
      reset({ type: "note" });
      setShowActivityForm(false);
    } catch {
      setActivityError("Error al guardar la actividad.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-zinc-400">Lead no encontrado</p>
        <Link href="/crm" className="text-xs text-amber-400 hover:underline">Volver al CRM</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/crm"
            className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
              {lead.fullName}
            </h1>
            <p className="text-xs text-zinc-500">Lead · {formatDateTime(lead.createdAt)}</p>
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Link
            href={`/crm/${lead.id}/editar`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <Pencil size={12} /> Editar
          </Link>
          <button
            disabled
            title="Próximamente"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 cursor-not-allowed opacity-50"
          >
            <FileText size={12} /> Cotización
          </button>
          <button
            disabled
            title="Próximamente"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 cursor-not-allowed opacity-50"
          >
            <UserCheck size={12} /> Convertir en cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Lead info card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Información del lead</h2>
              <Badge variant={STATUS_VARIANT[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<Phone size={13} />} label="Teléfono" value={lead.phone} />
              {lead.secondaryPhone && <InfoRow icon={<Phone size={13} />} label="Tel. secundario" value={lead.secondaryPhone} />}
              {lead.email && <InfoRow icon={<Mail size={13} />} label="Correo" value={lead.email} />}
              {(lead.city || lead.department) && (
                <InfoRow icon={<MapPin size={13} />} label="Ubicación" value={[lead.city, lead.department].filter(Boolean).join(", ")} />
              )}
              <InfoRow icon={<MessageSquare size={13} />} label="Canal" value={LEAD_SOURCE_LABELS[lead.source]} />
              <InfoRow icon={<FileText size={13} />} label="Interesado en" value={LEAD_INTERESTED_IN_LABELS[lead.interestedIn]} />
              {lead.budgetRange && <InfoRow icon={<FileText size={13} />} label="Presupuesto" value={lead.budgetRange} />}
              {lead.expectedPurchaseDate && (
                <InfoRow icon={<Clock size={13} />} label="Compra estimada" value={formatDateTime(lead.expectedPurchaseDate)} />
              )}
            </div>

            {lead.notes && (
              <div className="rounded-lg bg-zinc-800/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500 mb-1">Notas</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Activity timeline */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Actividad</h2>
              <button
                onClick={() => setShowActivityForm((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            {/* Add activity form */}
            {showActivityForm && (
              <form onSubmit={handleSubmit(onAddActivity)} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Tipo</Label>
                    <select
                      {...register("type")}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                    >
                      {(Object.keys(LEAD_ACTIVITY_TYPE_LABELS) as LeadActivityType[])
                        .filter((t) => t !== "status_change")
                        .map((t) => (
                          <option key={t} value={t}>{LEAD_ACTIVITY_TYPE_LABELS[t]}</option>
                        ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Título *</Label>
                    <Input {...register("title")} placeholder="Ej. Llamada de seguimiento" />
                    {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Descripción</Label>
                  <Textarea {...register("description")} placeholder="Detalles de la actividad..." rows={2} className="resize-y" />
                </div>
                {activityError && <p className="text-xs text-red-400">{activityError}</p>}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowActivityForm(false); reset({ type: "note" }); }}
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
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {/* Timeline */}
            {activities.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No hay actividad registrada</p>
            ) : (
              <div className="flex flex-col gap-0">
                {activities.map((activity, idx) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="size-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                        {ACTIVITY_ICONS[activity.type]}
                      </div>
                      {idx < activities.length - 1 && (
                        <div className="w-px flex-1 bg-zinc-800 my-1" />
                      )}
                    </div>
                    <div className={`pb-4 flex-1 min-w-0 ${idx < activities.length - 1 ? "pb-4" : ""}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-200">{activity.title}</span>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-xs text-zinc-500">{formatDateTimeRelative(activity.createdAt)}</span>
                          <span className="text-xs text-zinc-600">{formatAbsoluteDateTime(activity.createdAt)}</span>
                        </div>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">{activity.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Status selector */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Estado</h2>
              {savingStatus && <Loader2 size={12} className="animate-spin text-zinc-500" />}
            </div>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              disabled={savingStatus}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900 disabled:opacity-60"
            >
              {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Priority selector */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Prioridad</h2>
              {savingPriority && <Loader2 size={12} className="animate-spin text-zinc-500" />}
            </div>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as LeadPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  disabled={savingPriority}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    lead.priority === p
                      ? p === "high"
                        ? "bg-red-500/20 border-red-500/40 text-red-400"
                        : p === "medium"
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                          : "bg-zinc-700 border-zinc-600 text-zinc-300"
                      : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {LEAD_PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Next action */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Próxima acción</h2>
            {lead.nextAction || lead.nextActionDate ? (
              <div>
                {lead.nextActionDate && (
                  <p className={`text-xs font-medium mb-1 ${isOverdue(lead.nextActionDate) ? "text-red-400" : "text-amber-400"}`}>
                    {isOverdue(lead.nextActionDate) ? "⚠ Vencido · " : "📅 "}{formatDateTime(lead.nextActionDate)}
                  </p>
                )}
                {lead.nextAction && (
                  <p className="text-sm text-zinc-300">{lead.nextAction}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Sin acción programada</p>
            )}
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-zinc-300 mb-1">Resumen</h2>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Canal</span>
              <Badge variant="default">{LEAD_SOURCE_LABELS[lead.source]}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Interés</span>
              <span className="text-zinc-300">{LEAD_INTERESTED_IN_LABELS[lead.interestedIn]}</span>
            </div>
            {lead.budgetRange && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Presupuesto</span>
                <span className="text-zinc-300">{lead.budgetRange}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Actividades</span>
              <span className="text-zinc-300">{activities.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Creado</span>
              <span className="text-zinc-300">{formatDateTime(lead.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-zinc-500 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-sm text-zinc-200">{value}</p>
      </div>
    </div>
  );
}
