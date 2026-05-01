"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import { inventoryItemSchema, type InventoryItemFormValues } from "@/lib/schemas/inventory";
import { createInventoryItem, listInventoryLocations } from "@/lib/firestore/inventory";
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_ITEM_TYPE_LABELS,
  INVENTORY_UNIT_LABELS,
} from "@/types/inventory";
import type { InventoryLocation, InventoryCategory, InventoryItemType, InventoryUnit } from "@/types/inventory";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-zinc-400">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function NuevoInventarioPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      currentStock: 0,
      minimumStock: 0,
      averageCost: 0,
    },
  });

  useEffect(() => {
    listInventoryLocations().then(setLocations).catch(() => {});
  }, []);

  async function onSubmit(values: InventoryItemFormValues) {
    setServerError(null);
    try {
      const id = await createInventoryItem(values);
      router.push(`/inventario/${id}`);
    } catch {
      setServerError("Error al crear el artículo. Intenta de nuevo.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/inventario"
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </Link>
        <div className="flex items-center gap-2">
          <Package size={18} className="text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
              Nuevo artículo
            </h1>
            <p className="text-xs text-zinc-500">Registrar material, herramienta o producto terminado</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Identification */}
        <Section title="Identificación">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *" error={errors.name?.message}>
              <Input
                {...register("name")}
                placeholder="Ej: Viga de pino 2x4"
              />
            </Field>
            <Field label="SKU / Código" error={errors.sku?.message}>
              <Input
                {...register("sku")}
                placeholder="Ej: MAD-PINO-2X4"
              />
            </Field>
          </div>
          <Field label="Descripción" error={errors.description?.message}>
            <Textarea
              {...register("description")}
              placeholder="Descripción opcional del artículo…"
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Categoría *" error={errors.category?.message}>
              <Select {...register("category")}>
                <option value="">Seleccionar…</option>
                {(Object.entries(INVENTORY_CATEGORY_LABELS) as [InventoryCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo *" error={errors.itemType?.message}>
              <Select {...register("itemType")}>
                <option value="">Seleccionar…</option>
                {(Object.entries(INVENTORY_ITEM_TYPE_LABELS) as [InventoryItemType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Unidad *" error={errors.unit?.message}>
              <Select {...register("unit")}>
                <option value="">Seleccionar…</option>
                {(Object.entries(INVENTORY_UNIT_LABELS) as [InventoryUnit, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        {/* Stock */}
        <Section title="Stock y costos">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Stock inicial" error={errors.currentStock?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("currentStock", { valueAsNumber: true })}
                placeholder="0"
              />
            </Field>
            <Field label="Stock mínimo" error={errors.minimumStock?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("minimumStock", { valueAsNumber: true })}
                placeholder="0"
              />
            </Field>
            <Field label="Costo promedio" error={errors.averageCost?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("averageCost", { valueAsNumber: true })}
                placeholder="0.00"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Último costo de compra" error={errors.lastPurchaseCost?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("lastPurchaseCost", { valueAsNumber: true, setValueAs: (v) => (v === "" || isNaN(v) ? undefined : Number(v)) })}
                placeholder="Opcional"
              />
            </Field>
            <Field label="Precio de venta" error={errors.salePrice?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("salePrice", { valueAsNumber: true, setValueAs: (v) => (v === "" || isNaN(v) ? undefined : Number(v)) })}
                placeholder="Opcional"
              />
            </Field>
          </div>
        </Section>

        {/* Location */}
        <Section title="Ubicación">
          <Field label="Ubicación *" error={errors.locationId?.message}>
            <Select {...register("locationId")}>
              <option value="">Seleccionar ubicación…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          {locations.length === 0 && (
            <p className="text-xs text-amber-400">
              No hay ubicaciones registradas.{" "}
              <Link href="/inventario/ubicaciones" className="underline hover:text-amber-300">
                Crear ubicaciones
              </Link>
            </p>
          )}
        </Section>

        {/* Notes */}
        <Section title="Notas">
          <Field label="Notas internas" error={errors.notes?.message}>
            <Textarea
              {...register("notes")}
              placeholder="Observaciones, proveedor habitual, especificaciones técnicas…"
              rows={3}
            />
          </Field>
        </Section>

        {/* Error */}
        {serverError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-400">{serverError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/inventario"
            className="h-10 px-4 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors flex items-center"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 text-sm font-semibold transition-colors flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? "Guardando…" : "Crear artículo"}
          </button>
        </div>
      </form>
    </div>
  );
}
