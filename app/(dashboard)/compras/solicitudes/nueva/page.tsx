"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPurchaseRequest } from "@/lib/firestore/purchases";
import { listInventoryItems } from "@/lib/firestore/inventory";
import { listInventoryLocations } from "@/lib/firestore/inventory";
import {
  purchaseRequestSchema,
  type PurchaseRequestFormValues,
  type PurchaseRequestItemFormValues,
} from "@/lib/schemas/purchases";
import {
  PURCHASE_REQUEST_SOURCE_LABELS,
  PURCHASE_PRIORITY_LABELS,
} from "@/types/purchases";
import {
  INVENTORY_UNIT_LABELS,
  INVENTORY_ITEM_TYPE_LABELS,
} from "@/types/inventory";
import type { InventoryItem, InventoryLocation } from "@/types/inventory";

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [lineItems, setLineItems] = useState<PurchaseRequestItemFormValues[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchaseRequestFormValues>({
    resolver: zodResolver(purchaseRequestSchema),
    defaultValues: { sourceType: "manual", priority: "medium" },
  });

  useEffect(() => {
    Promise.all([listInventoryItems(), listInventoryLocations()]).then(([items, locs]) => {
      setInventoryItems(items.filter((i) => i.isActive));
      setLocations(locs.filter((l) => l.isActive));
    });
  }, []);

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        inventoryItemId: "",
        itemName: "",
        itemType: "",
        quantity: 1,
        unit: "unit",
        estimatedUnitCost: undefined,
        notes: "",
      },
    ]);
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLineItem(idx: number, field: string, value: unknown) {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === "inventoryItemId") {
          const inv = inventoryItems.find((it) => it.id === value);
          return {
            ...item,
            inventoryItemId: value as string,
            itemName: inv?.name ?? "",
            itemType: inv?.itemType ?? "",
            unit: inv?.unit ?? "unit",
          };
        }
        return { ...item, [field]: value };
      })
    );
  }

  const destLocationId = watch("destinationLocationId");

  async function onSubmit(values: PurchaseRequestFormValues) {
    if (lineItems.length === 0) {
      setError("Agrega al menos un artículo a la solicitud");
      return;
    }
    if (lineItems.some((i) => !i.inventoryItemId)) {
      setError("Todos los artículos deben tener un artículo del inventario seleccionado");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const locationName = locations.find((l) => l.id === values.destinationLocationId)?.name;
      const id = await createPurchaseRequest(values, lineItems, locationName);
      router.push(`/compras/solicitudes/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la solicitud");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/compras/solicitudes"
          className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Nueva solicitud de compra</h1>
          <p className="text-sm text-zinc-400">Registra una necesidad interna de materiales</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* General info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Información general</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Origen *</Label>
              <Select
                defaultValue="manual"
                onValueChange={(v) => setValue("sourceType", v as PurchaseRequestFormValues["sourceType"])}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {Object.entries(PURCHASE_REQUEST_SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sourceType && <p className="text-xs text-red-400">{errors.sourceType.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Prioridad *</Label>
              <Select
                defaultValue="medium"
                onValueChange={(v) => setValue("priority", v as PurchaseRequestFormValues["priority"])}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {Object.entries(PURCHASE_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Ubicación destino *</Label>
              <Select
                onValueChange={(v) => setValue("destinationLocationId", v)}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder="Seleccionar ubicación" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.destinationLocationId && (
                <p className="text-xs text-red-400">{errors.destinationLocationId.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Fecha requerida</Label>
              <Input
                type="date"
                {...register("neededByDate")}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notas</Label>
            <Textarea
              {...register("notes")}
              placeholder="Información adicional sobre la solicitud..."
              rows={2}
              className="resize-y bg-zinc-950 border-zinc-800 text-zinc-200"
            />
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Artículos solicitados</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <Plus className="size-4 mr-1.5" /> Agregar artículo
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No hay artículos. Haz clic en &quot;Agregar artículo&quot;.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {lineItems.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">Artículo {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <Label className="text-xs">Artículo del inventario *</Label>
                      <Select
                        value={item.inventoryItemId}
                        onValueChange={(v) => updateLineItem(idx, "inventoryItemId", v)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          <SelectValue placeholder="Seleccionar artículo" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
                          {inventoryItems.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.name} ({INVENTORY_ITEM_TYPE_LABELS[inv.itemType]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Cantidad *</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Unidad</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(v) => updateLineItem(idx, "unit", v)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {Object.entries(INVENTORY_UNIT_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Costo estimado unitario</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.estimatedUnitCost ?? ""}
                        onChange={(e) =>
                          updateLineItem(idx, "estimatedUnitCost", e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        className="bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button asChild variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
            <Link href="/compras/solicitudes">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          >
            {submitting ? "Guardando..." : "Crear solicitud"}
          </Button>
        </div>
      </form>
    </div>
  );
}
