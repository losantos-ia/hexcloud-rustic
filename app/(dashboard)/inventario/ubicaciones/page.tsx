"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Warehouse, Plus, Loader2, Edit2, Check, X } from "lucide-react";
import Link from "next/link";
import { inventoryLocationSchema, type InventoryLocationFormValues } from "@/lib/schemas/inventory";
import {
  listInventoryLocations,
  createInventoryLocation,
  updateInventoryLocation,
} from "@/lib/firestore/inventory";
import {
  INVENTORY_LOCATION_TYPE_LABELS,
} from "@/types/inventory";
import type { InventoryLocation, InventoryLocationType } from "@/types/inventory";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

const LOCATION_TYPE_VARIANT: Record<InventoryLocationType, BadgeVariant> = {
  workshop: "amber",
  store: "green",
  warehouse: "blue",
  vehicle: "purple",
  other: "default",
};

export default function UbicacionesPage() {
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Create form
  const createForm = useForm<InventoryLocationFormValues>({
    resolver: zodResolver(inventoryLocationSchema),
    defaultValues: { type: "workshop" },
  });

  // Edit form
  const editForm = useForm<InventoryLocationFormValues>({
    resolver: zodResolver(inventoryLocationSchema),
  });

  async function loadLocations() {
    const locs = await listInventoryLocations();
    setLocations(locs);
    setLoading(false);
  }

  useEffect(() => { loadLocations(); }, []);

  async function onCreateSubmit(values: InventoryLocationFormValues) {
    setServerError(null);
    try {
      await createInventoryLocation(values);
      await loadLocations();
      createForm.reset({ type: "workshop" });
      setShowForm(false);
    } catch {
      setServerError("Error al crear la ubicación. Intenta de nuevo.");
    }
  }

  function startEdit(loc: InventoryLocation) {
    setEditingId(loc.id);
    editForm.reset({
      name: loc.name,
      type: loc.type,
      description: loc.description ?? "",
    });
  }

  async function onEditSubmit(values: InventoryLocationFormValues) {
    if (!editingId) return;
    setServerError(null);
    try {
      await updateInventoryLocation(editingId, values);
      await loadLocations();
      setEditingId(null);
    } catch {
      setServerError("Error al guardar los cambios.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/inventario"
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1">
          <h1
            className="text-xl font-bold text-zinc-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ubicaciones de inventario
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Administra talleres, tiendas y bodegas
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setServerError(null); }}
          className="flex items-center gap-2 h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold transition-colors"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Nueva ubicación</span>
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-amber-500/20 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Nueva ubicación</h2>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-zinc-400">Nombre *</Label>
                <Input
                  {...createForm.register("name")}
                  placeholder="Ej: Taller principal"
                />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-red-400">{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-zinc-400">Tipo *</Label>
                <Select {...createForm.register("type")}>
                  {(Object.entries(INVENTORY_LOCATION_TYPE_LABELS) as [InventoryLocationType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-zinc-400">Descripción</Label>
              <Textarea
                {...createForm.register("description")}
                placeholder="Dirección, referencia o notas sobre esta ubicación…"
                rows={2}
              />
            </div>
            {serverError && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                {serverError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); createForm.reset(); setServerError(null); }}
                className="h-9 px-4 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createForm.formState.isSubmitting}
                className="h-9 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                {createForm.formState.isSubmitting && <Loader2 size={13} className="animate-spin" />}
                Crear ubicación
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-5 border-2 border-zinc-600 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : locations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
          <Warehouse size={32} />
          <p className="text-sm">No hay ubicaciones registradas</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-amber-500 hover:text-amber-400"
          >
            Crear primera ubicación
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              {editingId === loc.id ? (
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-zinc-400 text-xs">Nombre *</Label>
                      <Input {...editForm.register("name")} />
                      {editForm.formState.errors.name && (
                        <p className="text-xs text-red-400">{editForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-zinc-400 text-xs">Tipo *</Label>
                      <Select {...editForm.register("type")}>
                        {(Object.entries(INVENTORY_LOCATION_TYPE_LABELS) as [InventoryLocationType, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-zinc-400 text-xs">Descripción</Label>
                    <Textarea {...editForm.register("description")} rows={2} />
                  </div>
                  {serverError && (
                    <p className="text-xs text-red-400">{serverError}</p>
                  )}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setServerError(null); }}
                      className="h-8 px-3 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                    >
                      <X size={12} />
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={editForm.formState.isSubmitting}
                      className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      {editForm.formState.isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Guardar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center shrink-0">
                      <Warehouse size={16} className="text-zinc-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-zinc-100">{loc.name}</p>
                        <Badge variant={LOCATION_TYPE_VARIANT[loc.type]}>
                          {INVENTORY_LOCATION_TYPE_LABELS[loc.type]}
                        </Badge>
                        {!loc.isActive && (
                          <Badge variant="default">Inactiva</Badge>
                        )}
                      </div>
                      {loc.description && (
                        <p className="text-xs text-zinc-500 mt-1">{loc.description}</p>
                      )}
                      <p className="text-xs text-zinc-700 mt-1">
                        Creada {loc.createdAt.toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(loc)}
                    className="size-8 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 transition-colors shrink-0"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">Ubicaciones predeterminadas recomendadas:</span>{" "}
          Taller (workshop), Tienda 1 (store). Cada artículo del inventario debe estar asignado a una ubicación.
        </p>
      </div>
    </div>
  );
}
