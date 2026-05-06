"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Wrench, MapPin, Phone, Calendar, Clock, CheckCircle2,
  Plus, ExternalLink, Loader2, CalendarDays,
} from "lucide-react";
import {
  getMaintenanceAssetById,
  listMaintenanceRecordsByAsset,
  createMaintenanceRecord,
  completeMaintenanceRecord,
  createMaintenanceNotification,
  listPendingMaintenanceNotifications,
  markNotificationAsSent,
} from "@/lib/firestore/maintenance";
import type { MaintenanceAsset, MaintenanceRecord, MaintenanceNotification } from "@/types/maintenance";
import {
  MAINTENANCE_PROJECT_TYPE_LABELS,
  MAINTENANCE_RECORD_STATUS_LABELS,
  MAINTENANCE_RECORD_TYPE_LABELS,
} from "@/types/maintenance";
import { maintenanceRecordSchema, type MaintenanceRecordFormValues } from "@/lib/schemas/maintenance";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

type BadgeVariant = BadgeProps["variant"];

const RECORD_STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "default",
  scheduled: "blue",
  completed: "green",
  cancelled: "red",
};

const RECORD_TYPE_VARIANT: Record<string, BadgeVariant> = {
  preventive: "amber",
  corrective: "red",
};

function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function InfoRow({ icon: Icon, label, value, link }: { icon: React.ElementType; label: string; value?: string; link?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-zinc-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] text-zinc-500">{label}</p>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-400 hover:underline flex items-center gap-1">
            {value} <ExternalLink size={11} />
          </a>
        ) : (
          <p className="text-sm text-zinc-200">{value}</p>
        )}
      </div>
    </div>
  );
}

function getMaintenanceStatus(asset: MaintenanceAsset): "overdue" | "upcoming" | "ok" {
  const today = new Date();
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);
  if (asset.nextMaintenanceDate < today) return "overdue";
  if (asset.nextMaintenanceDate <= sevenDays) return "upcoming";
  return "ok";
}

export default function MaintenanceAssetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = params.id;

  const [asset, setAsset] = useState<MaintenanceAsset | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [notifications, setNotifications] = useState<MaintenanceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSent, setNotifSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceRecordFormValues>({
    resolver: zodResolver(maintenanceRecordSchema),
    defaultValues: {
      maintenanceAssetId: assetId,
      type: "preventive",
      status: "scheduled",
    },
  });

  useEffect(() => {
    Promise.all([
      getMaintenanceAssetById(assetId),
      listMaintenanceRecordsByAsset(assetId).catch(() => [] as MaintenanceRecord[]),
      listPendingMaintenanceNotifications().catch(() => [] as MaintenanceNotification[]),
    ]).then(([a, r, n]) => {
      if (!a) { setLoadError("Activo no encontrado."); setLoading(false); return; }
      setAsset(a);
      setRecords(r);
      setNotifications(n.filter((notif) => notif.maintenanceAssetId === assetId));
      setLoading(false);
    }).catch(() => { setLoadError("Error al cargar el activo."); setLoading(false); });
  }, [assetId]);

  async function onScheduleSubmit(values: MaintenanceRecordFormValues) {
    setScheduleError(null);
    try {
      await createMaintenanceRecord({ ...values, maintenanceAssetId: assetId });
      const r = await listMaintenanceRecordsByAsset(assetId);
      setRecords(r);
      setShowScheduleForm(false);
      reset({ maintenanceAssetId: assetId, type: "preventive", status: "scheduled" });
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : "Error al programar");
    }
  }

  async function handleComplete(record: MaintenanceRecord) {
    if (!asset) return;
    setCompleting(record.id);
    try {
      await completeMaintenanceRecord(record.id, assetId, asset.maintenanceFrequencyMonths);
      const [updatedAsset, updatedRecords] = await Promise.all([
        getMaintenanceAssetById(assetId),
        listMaintenanceRecordsByAsset(assetId),
      ]);
      setAsset(updatedAsset);
      setRecords(updatedRecords);
    } catch {
      // ignore
    } finally {
      setCompleting(null);
    }
  }

  async function handleSendReminder() {
    if (!asset) return;
    setSendingNotif(true);
    try {
      const typeLabel: Record<string, string> = {
        cabin: "cabaña", pergola: "pérgola", kiosk: "kiosco", deck: "deck",
        playground: "juego infantil", rustic_cafe: "café rústico", custom: "proyecto",
      };
      const message = `Hola ${asset.clientName}, le recordamos que el mantenimiento de su ${typeLabel[asset.projectType] ?? "estructura"} está próximo. Podemos agendar su cita.`;
      const nextStr = asset.nextMaintenanceDate.toISOString().split("T")[0];

      if (notifications.length > 0) {
        await markNotificationAsSent(notifications[0].id, message);
      } else {
        await createMaintenanceNotification({
          maintenanceAssetId: assetId,
          clientName: asset.clientName,
          clientPhone: asset.clientPhone,
          nextMaintenanceDate: nextStr,
          status: "notified",
          messageSent: message,
        });
      }
      setNotifSent(true);
    } catch {
      // ignore
    } finally {
      setSendingNotif(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-zinc-500"><Loader2 className="size-5 animate-spin mr-2" /> Cargando...</div>;
  }
  if (loadError || !asset) {
    return <div className="flex items-center justify-center min-h-[40vh] text-red-400">{loadError ?? "Activo no encontrado."}</div>;
  }

  const maintenanceStatus = getMaintenanceStatus(asset);
  const statusColors = { overdue: "text-red-400", upcoming: "text-amber-400", ok: "text-green-400" };
  const statusLabels = { overdue: "Vencido", upcoming: "Próximo", ok: "Al día" };
  const statusVariants: Record<string, BadgeVariant> = { overdue: "red", upcoming: "amber", ok: "green" };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/mantenimientos"
          className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors mt-0.5"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{asset.clientName}</h1>
            <Badge variant={statusVariants[maintenanceStatus]}>{statusLabels[maintenanceStatus]}</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">
            {MAINTENANCE_PROJECT_TYPE_LABELS[asset.projectType]} · {asset.locationAddress}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/mantenimientos/${assetId}/editar`}
            className="rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm px-3 py-1.5 transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Grid: client + project + location + dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Información del cliente</h3>
          <InfoRow icon={Phone} label="Teléfono" value={asset.clientPhone} />
          {asset.clientId && <InfoRow icon={Wrench} label="ID cliente" value={asset.clientId} />}
        </div>

        {/* Project */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Proyecto</h3>
          <InfoRow icon={Wrench} label="Tipo" value={MAINTENANCE_PROJECT_TYPE_LABELS[asset.projectType]} />
          {asset.orderId && <InfoRow icon={Wrench} label="Pedido" value={asset.orderId} />}
          {asset.productionOrderId && <InfoRow icon={Wrench} label="Producción" value={asset.productionOrderId} />}
        </div>

        {/* Location */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ubicación</h3>
          <InfoRow icon={MapPin} label="Dirección" value={asset.locationAddress} />
          {asset.googleMapsUrl && <InfoRow icon={ExternalLink} label="Google Maps" value="Ver en mapa" link={asset.googleMapsUrl} />}
        </div>

        {/* Dates */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Fechas</h3>
          <InfoRow icon={Calendar} label="Instalación" value={formatDate(asset.installationDate)} />
          <InfoRow icon={CheckCircle2} label="Último mantenimiento" value={asset.lastMaintenanceDate ? formatDate(asset.lastMaintenanceDate) : "Sin registros"} />
          <div className="flex items-start gap-3">
            <CalendarDays className={`size-4 mt-0.5 shrink-0 ${statusColors[maintenanceStatus]}`} />
            <div>
              <p className="text-[11px] text-zinc-500">Próximo mantenimiento</p>
              <p className={`text-sm font-semibold ${statusColors[maintenanceStatus]}`}>{formatDate(asset.nextMaintenanceDate)}</p>
            </div>
          </div>
          <InfoRow icon={Clock} label="Frecuencia" value={`Cada ${asset.maintenanceFrequencyMonths} meses`} />
        </div>
      </div>

      {/* Notes */}
      {asset.notes && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Notas</h3>
          <p className="text-sm text-zinc-300 whitespace-pre-line">{asset.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Acciones</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => setShowScheduleForm((v) => !v)}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          >
            <Plus className="size-4 mr-1.5" /> Programar mantenimiento
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={sendingNotif || notifSent}
            onClick={handleSendReminder}
            className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            {sendingNotif ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
            {notifSent ? "✓ Recordatorio registrado" : "Enviar recordatorio"}
          </Button>
        </div>
      </div>

      {/* Schedule form */}
      {showScheduleForm && (
        <div className="rounded-xl border border-amber-500/30 bg-zinc-900 p-5 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-300">Programar mantenimiento</h3>
          <form onSubmit={handleSubmit(onScheduleSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <select
                  {...register("type")}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-500"
                >
                  <option value="preventive">Preventivo</option>
                  <option value="corrective">Correctivo</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fecha programada *</Label>
                <DatePicker
                  value={watch("scheduledDate")}
                  onChange={(v) => setValue("scheduledDate", v ?? "")}
                />
                {errors.scheduledDate && <p className="text-xs text-red-400">{errors.scheduledDate.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Técnico asignado</Label>
                <Input {...register("technician")} placeholder="Nombre del técnico" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Costo estimado</Label>
                <Input type="number" min={0} step="0.01" {...register("cost", { valueAsNumber: true })} placeholder="0.00" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Observaciones</Label>
                <Textarea {...register("observations")} placeholder="Descripción del trabajo a realizar..." rows={2} className="resize-y bg-zinc-950 border-zinc-800 text-zinc-200" />
              </div>
            </div>
            {scheduleError && <p className="text-xs text-red-400">{scheduleError}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowScheduleForm(false)} className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Maintenance history */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-300">Historial de mantenimientos</h3>
        </div>
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-500">
            <Wrench size={28} className="text-zinc-700" />
            <p className="text-sm">Sin registros de mantenimiento.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {records.map((record) => (
              <div key={record.id} className="px-4 py-3.5 flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <div className={`size-2.5 rounded-full ${record.status === "completed" ? "bg-green-500" : record.status === "scheduled" ? "bg-blue-500" : record.status === "cancelled" ? "bg-red-500" : "bg-zinc-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={RECORD_TYPE_VARIANT[record.type]}>{MAINTENANCE_RECORD_TYPE_LABELS[record.type]}</Badge>
                    <Badge variant={RECORD_STATUS_VARIANT[record.status]}>{MAINTENANCE_RECORD_STATUS_LABELS[record.status]}</Badge>
                    <span className="text-xs text-zinc-500">Programado: {formatDateShort(record.scheduledDate)}</span>
                    {record.completedDate && (
                      <span className="text-xs text-green-400">Completado: {formatDateShort(record.completedDate)}</span>
                    )}
                  </div>
                  {record.technician && <p className="text-xs text-zinc-400 mt-1">Técnico: {record.technician}</p>}
                  {record.observations && <p className="text-xs text-zinc-500 mt-1">{record.observations}</p>}
                  {record.tasksPerformed && <p className="text-xs text-zinc-500 mt-1">Tareas: {record.tasksPerformed}</p>}
                  {record.cost != null && <p className="text-xs text-zinc-400 mt-1">Costo: L {record.cost.toLocaleString("es-HN")}</p>}
                </div>
                {(record.status === "scheduled" || record.status === "pending") && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={completing === record.id}
                    onClick={() => handleComplete(record)}
                    className="bg-green-600 hover:bg-green-500 text-white text-xs shrink-0"
                  >
                    {completing === record.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3 mr-1" />}
                    Completar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Recordatorio pendiente</h3>
          {notifications.map((n) => (
            <div key={n.id} className="text-sm text-zinc-300">
              <p>{n.messageSent}</p>
              <p className="text-xs text-zinc-500 mt-1">Creado: {formatDateShort(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
