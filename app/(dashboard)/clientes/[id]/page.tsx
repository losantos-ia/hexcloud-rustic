"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  User,
  Building2,
  Plus,
  Loader2,
  Home,
  X,
  Calendar,
  Wrench,
} from "lucide-react";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { getClientById } from "@/lib/firestore/clients";
import {
  listStructureAssetsByClient,
  createStructureAsset,
} from "@/lib/firestore/structures";
import type { Client } from "@/types/client";
import type { StructureAsset } from "@/types/structure";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_SOURCE_LABELS,
} from "@/types/client";
import {
  STRUCTURE_TYPE_LABELS,
  STRUCTURE_STATUS_LABELS,
} from "@/types/structure";
import { structureSchema, type StructureFormValues } from "@/lib/schemas/structure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-zinc-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p className="text-sm text-zinc-200">{value}</p>
      </div>
    </div>
  );
}

const STATUS_VARIANT: Record<
  string,
  "default" | "green" | "amber" | "blue"
> = {
  active: "green",
  pending_delivery: "amber",
  archived: "default",
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [structures, setStructures] = useState<StructureAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStructure, setShowAddStructure] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Computed next maintenance preview
  const [nextMaintPreview, setNextMaintPreview] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StructureFormValues>({
    resolver: zodResolver(structureSchema),
    defaultValues: { maintenanceFrequencyMonths: 6 },
  });

  const watchDelivery = watch("deliveryDate");
  const watchFreq = watch("maintenanceFrequencyMonths");

  useEffect(() => {
    if (watchDelivery) {
      const d = new Date(watchDelivery);
      if (!isNaN(d.getTime())) {
        setNextMaintPreview(addMonths(d, Number(watchFreq) || 6));
      }
    } else {
      setNextMaintPreview(null);
    }
  }, [watchDelivery, watchFreq]);

  useEffect(() => {
    if (!id) return;
    Promise.all([getClientById(id), listStructureAssetsByClient(id)])
      .then(([c, s]) => {
        if (!c) {
          router.replace("/clientes");
          return;
        }
        setClient(c);
        setStructures(s);
      })
      .catch((err) => setError(err.message ?? "Error al cargar datos"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function onAddStructure(values: StructureFormValues) {
    setAddError(null);
    const clean = (v?: string) =>
      v?.trim() === "" ? undefined : v?.trim();
    try {
      const deliveryDate = values.deliveryDate?.trim()
        ? new Date(values.deliveryDate)
        : undefined;
      const nextMaintenanceDate = deliveryDate
        ? addMonths(deliveryDate, values.maintenanceFrequencyMonths)
        : undefined;
      const status =
        deliveryDate && deliveryDate <= new Date()
          ? "active"
          : "pending_delivery";

      await createStructureAsset(id, {
        type: values.type,
        name: values.name.trim(),
        model: clean(values.model),
        deliveryDate,
        maintenanceFrequencyMonths: values.maintenanceFrequencyMonths,
        nextMaintenanceDate,
        status,
        notes: clean(values.notes),
      });

      const updated = await listStructureAssetsByClient(id);
      setStructures(updated);
      setShowAddStructure(false);
      reset();
      setNextMaintPreview(null);
    } catch (err: unknown) {
      setAddError(
        err instanceof Error ? err.message : "Error al guardar la estructura"
      );
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? "Cliente no encontrado"}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/clientes">
          <button className="flex items-center justify-center size-9 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
            <ArrowLeft className="size-4" />
          </button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-white tracking-tight font-[family:var(--font-heading)] truncate">
            {client.fullName}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cliente desde{" "}
            {format(client.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={client.clientType === "company" ? "purple" : "blue"}
          >
            {CLIENT_TYPE_LABELS[client.clientType]}
          </Badge>
          <Badge variant="amber">
            {CLIENT_SOURCE_LABELS[client.source]}
          </Badge>
        </div>
      </div>

      {/* Client info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">
          Información de contacto
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={Phone} label="Teléfono principal" value={client.phone} />
          {client.secondaryPhone && (
            <InfoRow
              icon={Phone}
              label="Teléfono secundario"
              value={client.secondaryPhone}
            />
          )}
          {client.email && (
            <InfoRow icon={Mail} label="Correo electrónico" value={client.email} />
          )}
          {client.documentId && (
            <InfoRow
              icon={client.clientType === "company" ? Building2 : User}
              label="Cédula / RTN"
              value={client.documentId}
            />
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-[11px] text-zinc-500 mb-1">Notas</p>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}
      </div>

      {/* Addresses — placeholder */}
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="size-4 text-zinc-500" />
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            Direcciones
          </h2>
        </div>
        <p className="text-xs text-zinc-600 ml-6">
          Gestión de direcciones disponible próximamente.
        </p>
      </div>

      {/* Structures */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="size-4 text-zinc-500" />
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              Estructuras ({structures.length})
            </h2>
          </div>
          {!showAddStructure && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowAddStructure(true)}
            >
              <Plus className="size-3.5" />
              Agregar estructura
            </Button>
          )}
        </div>

        {/* Add structure form */}
        {showAddStructure && (
          <div className="rounded-xl border border-amber-500/20 bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">
                Nueva estructura
              </h3>
              <button
                onClick={() => {
                  setShowAddStructure(false);
                  reset();
                  setNextMaintPreview(null);
                  setAddError(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onAddStructure)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="str-type">
                    Tipo <span className="text-amber-500">*</span>
                  </Label>
                  <Select id="str-type" {...register("type")}>
                    <option value="cabin">Cabaña</option>
                    <option value="pergola">Pérgola</option>
                    <option value="kiosk">Kiosco</option>
                    <option value="deck">Deck</option>
                    <option value="playground">Parque infantil</option>
                    <option value="rustic_cafe">Cafetería rústica</option>
                    <option value="custom">Personalizada</option>
                  </Select>
                  <FieldError message={errors.type?.message} />
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="str-name">
                    Nombre <span className="text-amber-500">*</span>
                  </Label>
                  <Input
                    id="str-name"
                    placeholder="Cabaña principal / Pérgola jardín"
                    {...register("name")}
                    aria-invalid={!!errors.name}
                  />
                  <FieldError message={errors.name?.message} />
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <Label htmlFor="str-model">Modelo</Label>
                  <Input
                    id="str-model"
                    placeholder="Modelo o referencia (opcional)"
                    {...register("model")}
                  />
                </div>

                {/* Delivery date */}
                <div className="space-y-1.5">
                  <Label htmlFor="str-delivery">Fecha de entrega</Label>
                  <Input
                    id="str-delivery"
                    type="date"
                    {...register("deliveryDate")}
                    className="[color-scheme:dark]"
                  />
                </div>

                {/* Maintenance frequency */}
                <div className="space-y-1.5">
                  <Label htmlFor="str-freq">
                    Frecuencia de mantenimiento (meses)
                  </Label>
                  <Input
                    id="str-freq"
                    type="number"
                    min={1}
                    max={60}
                    {...register("maintenanceFrequencyMonths", {
                      valueAsNumber: true,
                    })}
                    aria-invalid={!!errors.maintenanceFrequencyMonths}
                  />
                  <FieldError
                    message={errors.maintenanceFrequencyMonths?.message}
                  />
                </div>

                {/* Next maintenance preview */}
                {nextMaintPreview && (
                  <div className="space-y-1.5">
                    <Label>Próximo mantenimiento calculado</Label>
                    <div className="flex items-center gap-2 h-10 rounded-lg border border-zinc-700 bg-zinc-800/30 px-3 text-sm">
                      <Wrench className="size-3.5 text-amber-400" />
                      <span className="text-amber-300">
                        {format(nextMaintPreview, "dd 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="str-notes">Notas</Label>
                  <Textarea
                    id="str-notes"
                    placeholder="Observaciones sobre la estructura…"
                    rows={2}
                    {...register("notes")}
                  />
                </div>
              </div>

              {addError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {addError}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {isSubmitting ? "Guardando…" : "Guardar estructura"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddStructure(false);
                    reset();
                    setNextMaintPreview(null);
                    setAddError(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Structures list */}
        {structures.length === 0 && !showAddStructure && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 py-14 text-center">
            <Home className="size-8 text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-400">Sin estructuras registradas</p>
            <p className="text-xs text-zinc-600 mt-1">
              Agrega la primera estructura de este cliente
            </p>
          </div>
        )}

        {structures.length > 0 && (
          <div className="space-y-3">
            {structures.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">
                        {s.name}
                      </span>
                      <Badge variant="default">
                        {STRUCTURE_TYPE_LABELS[s.type]}
                      </Badge>
                      {s.model && (
                        <span className="text-xs text-zinc-500">
                          · {s.model}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {s.deliveryDate && (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Calendar className="size-3 text-zinc-600" />
                          Entrega:{" "}
                          {format(s.deliveryDate, "dd MMM yyyy", {
                            locale: es,
                          })}
                        </span>
                      )}
                      {s.nextMaintenanceDate && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-400">
                          <Wrench className="size-3" />
                          Mant.:{" "}
                          {format(s.nextMaintenanceDate, "dd MMM yyyy", {
                            locale: es,
                          })}
                        </span>
                      )}
                    </div>

                    {s.notes && (
                      <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                        {s.notes}
                      </p>
                    )}
                  </div>

                  <Badge variant={STATUS_VARIANT[s.status] ?? "default"}>
                    {STRUCTURE_STATUS_LABELS[s.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
