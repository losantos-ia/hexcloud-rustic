"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getInventoryItemById, updateInventoryItem } from "@/lib/firestore/inventory";
import { inventoryItemSchema, type InventoryItemFormValues } from "@/lib/schemas/inventory";
import {
  INVENTORY_CATEGORY_LABELS, INVENTORY_ITEM_TYPE_LABELS, INVENTORY_UNIT_LABELS,
} from "@/types/inventory";
import type { InventoryItem } from "@/types/inventory";

export default function EditarInventarioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
  });

  useEffect(() => {
    getInventoryItemById(id).then((data) => {
      if (!data) { router.push("/inventario"); return; }
      setItem(data);
      form.reset({
        sku: data.sku ?? "",
        name: data.name,
        description: data.description ?? "",
        category: data.category,
        itemType: data.itemType,
        unit: data.unit,
        averageCost: data.averageCost,
        lastPurchaseCost: data.lastPurchaseCost,
        salePrice: data.salePrice,
        supplierId: data.supplierId,
        notes: data.notes ?? "",
      });
      setLoading(false);
    });
  }, [id, router, form]);

  async function onSubmit(values: InventoryItemFormValues) {
    setSubmitting(true); setError(null);
    try {
      await updateInventoryItem(id, values);
      router.push("/inventario/" + id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-500">Cargando...</div>;
  if (!item) return null;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6 md:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link href={"/inventario/" + id}>
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Editar articulo</h1>
          <p className="text-sm text-zinc-400">{item.name}</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">{error}</div>}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Identificacion</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">SKU / Codigo</FormLabel>
                  <FormControl><Input {...field} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Nombre *</FormLabel>
                  <FormControl><Input {...field} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Descripcion</FormLabel>
                <FormControl><Textarea {...field} rows={2} className="bg-zinc-800 border-zinc-700 text-white resize-none" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {Object.entries(INVENTORY_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="itemType" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {Object.entries(INVENTORY_ITEM_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Unidad *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {Object.entries(INVENTORY_UNIT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Costos y precios</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField control={form.control} name="averageCost" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Costo promedio *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min={0} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastPurchaseCost" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Ult. costo compra</FormLabel>
                  <FormControl><Input type="number" step="0.01" min={0} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="salePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Precio de venta</FormLabel>
                  <FormControl><Input type="number" step="0.01" min={0} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Notas</h2>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormControl><Textarea {...field} rows={3} className="bg-zinc-800 border-zinc-700 text-white resize-none" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-end gap-3">
            <Link href={"/inventario/" + id}>
              <Button type="button" variant="outline" className="border-zinc-700 text-zinc-300">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold gap-1.5">
              <Save className="h-4 w-4" />
              {submitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
