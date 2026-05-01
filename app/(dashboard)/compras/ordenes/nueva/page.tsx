"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { createPurchaseOrder } from "@/lib/firestore/purchases";
import { listInventoryItems, listInventoryLocations } from "@/lib/firestore/inventory";
import { listSuppliers } from "@/lib/firestore/purchases";
import type { PurchaseOrderItemFormValues } from "@/lib/schemas/purchases";
import { purchaseOrderSchema, type PurchaseOrderFormValues } from "@/lib/schemas/purchases";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PURCHASE_ASSIGN_TYPE_LABELS,
} from "@/types/purchases";
import {
  INVENTORY_UNIT_LABELS,
  INVENTORY_ITEM_TYPE_LABELS,
} from "@/types/inventory";
import type { InventoryItem, InventoryLocation } from "@/types/inventory";
import type { Supplier } from "@/types/purchases";
import { useCurrency } from "@/context/currency-context";

export default function NuevaOrdenPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [lineItems, setLineItems] = useState<PurchaseOrderItemFormValues[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: { discountAmount: 0, taxAmount: 0 },
  });

  useEffect(() => {
    Promise.all([listInventoryItems(), listInventoryLocations(), listSuppliers()]).then(
      ([items, locs, sups]) => {
        setInventoryItems(items.filter((i) => i.isActive));
        setLocations(locs.filter((l) => l.isActive));
        setSuppliers(sups.filter((s) => s.isActive));
      }
    );
  }, []);

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        inventoryItemId: "",
        itemName: "",
        itemType: "",
        quantityOrdered: 1,
        unit: "unit",
        unitCost: 0,
        assignToType: "stock",
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
            unitCost: inv?.lastPurchaseCost ?? inv?.averageCost ?? 0,
          };
        }
        return { ...item, [field]: value };
      })
    );
  }

  const discount = watch("discountAmount") ?? 0;
  const tax = watch("taxAmount") ?? 0;
  const subtotal = lineItems.reduce((s, i) => s + (i.quantityOrdered * i.unitCost), 0);
  const total = subtotal - discount + tax;

  async function onSubmit(values: PurchaseOrderFormValues) {
    if (lineItems.length === 0) {
      setError("Agrega al menos un artículo");
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
      const supplierName = suppliers.find((s) => s.id === values.supplierId)?.name;
      const id = await createPurchaseOrder(values, lineItems, locationName, supplierName);
      router.push(`/compras/ordenes/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la orden");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/compras/ordenes"
          className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Nueva orden de compra</h1>
          <p className="text-sm text-zinc-400">Registra una compra a proveedor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* General */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Información general</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Proveedor</Label>
              <Select onValueChange={(v) => setValue("supplierId", v)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder="Seleccionar proveedor (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Nombre de proveedor (manual)</Label>
              <Input
                {...register("supplierName")}
                placeholder="Si no está en el directorio"
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Ubicación destino *</Label>
              <Select onValueChange={(v) => setValue("destinationLocationId", v)}>
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
              <Label>Fecha esperada de entrega</Label>
              <Input
                type="date"
                {...register("expectedDeliveryDate")}
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Notas</Label>
            <Textarea
              {...register("notes")}
              placeholder="Instrucciones de entrega, condiciones, etc."
              rows={2}
              className="resize-y bg-zinc-950 border-zinc-800 text-zinc-200"
            />
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Artículos</h2>
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
                        value={item.quantityOrdered}
                        onChange={(e) => updateLineItem(idx, "quantityOrdered", parseFloat(e.target.value) || 0)}
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
                      <Label className="text-xs">Costo unitario *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateLineItem(idx, "unitCost", parseFloat(e.target.value) || 0)}
                        className="bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Subtotal</Label>
                      <p className="text-sm font-medium text-amber-400 py-2">
                        {formatCurrency(item.quantityOrdered * item.unitCost)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <Label className="text-xs">Destino</Label>
                      <Select
                        value={item.assignToType}
                        onValueChange={(v) => updateLineItem(idx, "assignToType", v)}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {Object.entries(PURCHASE_ASSIGN_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {item.assignToType === "production_order" && (
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label className="text-xs">ID del proyecto / orden de producción</Label>
                        <Input
                          placeholder="ID de la orden de producción"
                          value={item.productionOrderId ?? ""}
                          onChange={(e) => updateLineItem(idx, "productionOrderId", e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-zinc-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {lineItems.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Totales</h2>
            <div className="flex flex-col gap-2 max-w-xs ml-auto w-full">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="text-zinc-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500 shrink-0">Descuento</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register("discountAmount", { valueAsNumber: true })}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 h-7 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500 shrink-0">Impuesto</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register("taxAmount", { valueAsNumber: true })}
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 h-7 text-xs"
                />
              </div>
              <div className="flex items-center justify-between text-base font-bold border-t border-zinc-800 pt-2 mt-1">
                <span className="text-zinc-300">Total</span>
                <span className="text-amber-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button asChild variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
            <Link href="/compras/ordenes">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          >
            {submitting ? "Guardando..." : "Crear orden"}
          </Button>
        </div>
      </form>
    </div>
  );
}
