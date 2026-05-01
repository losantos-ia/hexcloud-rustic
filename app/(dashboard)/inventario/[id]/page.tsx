"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Edit, ArrowLeftRight, Plus, Minus, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getInventoryItemById, getStockByItem, listInventoryLocations,
  listInventoryMovementsByItem, adjustInventoryStock, transferInventoryStock,
  upsertStockEntry,
} from "@/lib/firestore/inventory";
import {
  adjustStockSchema, transferByLocationSchema, stockByLocationSchema,
  type AdjustStockFormValues, type TransferByLocationFormValues,
  type StockByLocationFormValues,
} from "@/lib/schemas/inventory";
import type {
  InventoryItem, InventoryStockByLocation, InventoryLocation, InventoryMovement,
} from "@/types/inventory";
import {
  INVENTORY_CATEGORY_LABELS, INVENTORY_ITEM_TYPE_LABELS, INVENTORY_UNIT_LABELS,
  INVENTORY_MOVEMENT_TYPE_LABELS, INVENTORY_LOCATION_TYPE_LABELS,
  STOCK_STATUS_LABELS, getStockStatusForEntry, getAggregateStockStatus,
  IN_MOVEMENT_TYPES,
} from "@/types/inventory";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
function formatDate(d: Date) {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
function stockBadgeClass(status: "ok" | "bajo_minimo" | "sin_stock") {
  if (status === "ok") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (status === "bajo_minimo") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}
function movementBadgeClass(type: string) {
  return IN_MOVEMENT_TYPES.includes(type as never) ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";
}

// ── Add Stock Modal ──────────────────────────────────────
function AddStockModal({ item, locations, open, onClose, onDone }: {
  item: InventoryItem; locations: InventoryLocation[];
  open: boolean; onClose: () => void; onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<StockByLocationFormValues>({
    resolver: zodResolver(stockByLocationSchema),
    defaultValues: { currentStock: 0, minimumStock: 0 },
  });
  async function onSubmit(values: StockByLocationFormValues) {
    setSubmitting(true); setError(null);
    try {
      await upsertStockEntry(item.id, values.locationId, values.currentStock, values.minimumStock, item.averageCost, values.averageCost);
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSubmitting(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar stock en ubicacion</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {item.name}
          </DialogDescription>
        </DialogHeader>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="locationId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Ubicacion</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="currentStock" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Stock inicial</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="minimumStock" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Stock minimo</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancelar</Button>
              <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">{submitting ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Adjust Stock Modal ───────────────────────────────────
function AdjustStockModal({ item, stockEntries, locations, open, onClose, onDone }: {
  item: InventoryItem; stockEntries: InventoryStockByLocation[]; locations: InventoryLocation[];
  open: boolean; onClose: () => void; onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { type: "adjustment_in", quantity: 1 },
  });
  const ADJUST_TYPES = [
    { value: "adjustment_in", label: "Ajuste entrada" },
    { value: "adjustment_out", label: "Ajuste salida" },
    { value: "purchase_in", label: "Compra (entrada)" },
    { value: "sale_out", label: "Venta (salida)" },
    { value: "return_in", label: "Devolucion (entrada)" },
  ];
  async function onSubmit(values: AdjustStockFormValues) {
    setSubmitting(true); setError(null);
    try {
      await adjustInventoryStock(item.id, values.locationId, values.type, values.quantity, {
        unitCost: values.unitCost, notes: values.notes,
        minimumStock: stockEntries.find((e) => e.locationId === values.locationId)?.minimumStock ?? 0,
      });
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al ajustar stock"); }
    finally { setSubmitting(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription className="text-zinc-400">{item.name}</DialogDescription>
        </DialogHeader>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="locationId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Ubicacion</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {(stockEntries.length > 0 ? stockEntries.map((e) => { const loc = locations.find((l) => l.id === e.locationId); return <SelectItem key={e.locationId} value={e.locationId}>{loc?.name ?? e.locationId} ({e.currentStock})</SelectItem>; }) : locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Tipo de movimiento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-700">{ADJUST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Cantidad</FormLabel>
                  <FormControl><Input type="number" step="0.01" min={0.01} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unitCost" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-zinc-300">Costo unitario</FormLabel>
                  <FormControl><Input type="number" step="0.01" min={0} {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Notas</FormLabel>
                <FormControl><Textarea {...field} rows={2} className="bg-zinc-800 border-zinc-700 text-white resize-none" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancelar</Button>
              <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">{submitting ? "Guardando..." : "Aplicar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Transfer Modal ───────────────────────────────────────
function TransferModal({ item, stockEntries, locations, open, onClose, onDone }: {
  item: InventoryItem; stockEntries: InventoryStockByLocation[]; locations: InventoryLocation[];
  open: boolean; onClose: () => void; onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<TransferByLocationFormValues>({
    resolver: zodResolver(transferByLocationSchema),
    defaultValues: { quantity: 1 },
  });
  const fromId = form.watch("fromLocationId");
  const sourceEntry = stockEntries.find((e) => e.locationId === fromId);
  async function onSubmit(values: TransferByLocationFormValues) {
    if (values.fromLocationId === values.toLocationId) {
      form.setError("toLocationId", { message: "La ubicacion destino debe ser diferente a la origen" });
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const fromLoc = locations.find((l) => l.id === values.fromLocationId);
      const toLoc = locations.find((l) => l.id === values.toLocationId);
      await transferInventoryStock(item.id, values.fromLocationId, values.toLocationId, values.quantity, {
        notes: values.notes, fromLocationName: fromLoc?.name, toLocationName: toLoc?.name,
      });
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al transferir stock"); }
    finally { setSubmitting(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir stock</DialogTitle>
          <DialogDescription className="text-zinc-400">{item.name}</DialogDescription>
        </DialogHeader>
        {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</div>}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="fromLocationId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Desde</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Ubicacion origen..." /></SelectTrigger></FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {stockEntries.filter((e) => e.currentStock > 0).map((e) => {
                      const loc = locations.find((l) => l.id === e.locationId);
                      return <SelectItem key={e.locationId} value={e.locationId}>{loc?.name ?? e.locationId} ({e.currentStock} disp.)</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {sourceEntry && <p className="text-xs text-zinc-500">Disponible: <span className="text-white font-medium">{sourceEntry.currentStock}</span> {INVENTORY_UNIT_LABELS[item.unit]}</p>}
            <FormField control={form.control} name="toLocationId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Hacia</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Ubicacion destino..." /></SelectTrigger></FormControl>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {locations.filter((l) => l.id !== fromId).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="quantity" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Cantidad</FormLabel>
                <FormControl><Input type="number" step="0.01" min={0.01} max={sourceEntry?.currentStock} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="bg-zinc-800 border-zinc-700 text-white" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-zinc-300">Notas</FormLabel>
                <FormControl><Textarea {...field} rows={2} className="bg-zinc-800 border-zinc-700 text-white resize-none" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">Cancelar</Button>
              <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold gap-1.5">
                <ArrowLeftRight className="h-4 w-4" />
                {submitting ? "Transfiriendo..." : "Transferir"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function InventarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [stockEntries, setStockEntries] = useState<InventoryStockByLocation[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "adjust" | "transfer" | null>(null);

  const load = useCallback(async () => {
    const [itemData, stock, locs, movs] = await Promise.all([
      getInventoryItemById(id), getStockByItem(id), listInventoryLocations(), listInventoryMovementsByItem(id),
    ]);
    if (!itemData) { router.push("/inventario"); return; }
    setItem(itemData); setStockEntries(stock); setLocations(locs); setMovements(movs);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function handleModalDone() { setModal(null); setLoading(true); await load(); }

  if (loading) return <div className="flex items-center justify-center h-64 text-zinc-500">Cargando...</div>;
  if (!item) return null;

  const totalStock = stockEntries.reduce((s, e) => s + e.currentStock, 0);
  const totalValue = stockEntries.reduce((s, e) => s + e.totalValue, 0);
  const overallStatus = getAggregateStockStatus(stockEntries);

  return (
    <div className="w-full max-w-full px-4 py-6 space-y-6 md:px-6 lg:px-8">
      {modal === "add" && <AddStockModal item={item} locations={locations} open onClose={() => setModal(null)} onDone={handleModalDone} />}
      {modal === "adjust" && <AdjustStockModal item={item} stockEntries={stockEntries} locations={locations} open onClose={() => setModal(null)} onDone={handleModalDone} />}
      {modal === "transfer" && <TransferModal item={item} stockEntries={stockEntries} locations={locations} open onClose={() => setModal(null)} onDone={handleModalDone} />}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/inventario">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white mt-0.5"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{item.name}</h1>
              {item.sku && <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{item.sku}</span>}
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium border ${stockBadgeClass(overallStatus)}`}>{STOCK_STATUS_LABELS[overallStatus]}</span>
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">
              {INVENTORY_CATEGORY_LABELS[item.category]} &bull; {INVENTORY_ITEM_TYPE_LABELS[item.itemType]} &bull; {INVENTORY_UNIT_LABELS[item.unit]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-12 sm:ml-0">
          <Button size="sm" variant="outline" onClick={() => setModal("add")} className="border-zinc-700 text-zinc-300 hover:text-white gap-1.5"><Plus className="h-4 w-4" />Agregar stock</Button>
          <Button size="sm" variant="outline" onClick={() => setModal("adjust")} className="border-zinc-700 text-zinc-300 hover:text-white gap-1.5"><Minus className="h-4 w-4" />Ajustar</Button>
          <Button size="sm" variant="outline" onClick={() => setModal("transfer")} disabled={stockEntries.filter((e) => e.currentStock > 0).length === 0} className="border-zinc-700 text-zinc-300 hover:text-white gap-1.5"><ArrowLeftRight className="h-4 w-4" />Transferir</Button>
          <Link href={"/inventario/" + id + "/editar"}>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold gap-1.5"><Edit className="h-4 w-4" />Editar</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <p className="text-xs text-zinc-400 mb-1">Stock total</p>
              <p className="text-2xl font-bold text-white">{totalStock.toLocaleString("es-PA")}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{INVENTORY_UNIT_LABELS[item.unit]}</p>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <p className="text-xs text-zinc-400 mb-1">Valor total</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">en {stockEntries.length} ubic.</p>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <p className="text-xs text-zinc-400 mb-1">Costo promedio</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(item.averageCost)}</p>
              {item.salePrice && <p className="text-xs text-zinc-500 mt-0.5">Venta: {formatCurrency(item.salePrice)}</p>}
            </div>
          </div>

          {/* Stock by location */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h2 className="font-semibold text-white text-sm">Stock por ubicacion</h2>
              <Button size="sm" variant="ghost" onClick={() => setModal("add")} className="text-zinc-400 hover:text-white h-7 gap-1"><Plus className="h-3.5 w-3.5" />Agregar</Button>
            </div>
            {stockEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-500">
                <MapPin className="h-8 w-8" />
                <p className="text-sm">No hay stock registrado en ninguna ubicacion</p>
                <Button size="sm" variant="outline" onClick={() => setModal("add")} className="border-zinc-700 text-zinc-300 mt-1">Agregar stock</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-800">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-medium text-zinc-400">Ubicacion</th>
                      <th className="text-right py-2.5 px-4 font-medium text-zinc-400">Stock</th>
                      <th className="text-right py-2.5 px-4 font-medium text-zinc-400 hidden sm:table-cell">Minimo</th>
                      <th className="text-right py-2.5 px-4 font-medium text-zinc-400 hidden sm:table-cell">Valor</th>
                      <th className="text-center py-2.5 px-4 font-medium text-zinc-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {stockEntries.map((entry) => {
                      const loc = locations.find((l) => l.id === entry.locationId);
                      const status = getStockStatusForEntry(entry);
                      return (
                        <tr key={entry.id}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                              <div>
                                <p className="text-white">{loc?.name ?? entry.locationId}</p>
                                {loc && <p className="text-xs text-zinc-500">{INVENTORY_LOCATION_TYPE_LABELS[loc.type]}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-white">{entry.currentStock.toLocaleString("es-PA")}</td>
                          <td className="py-3 px-4 text-right text-zinc-400 hidden sm:table-cell">{entry.minimumStock.toLocaleString("es-PA")}</td>
                          <td className="py-3 px-4 text-right text-zinc-300 hidden sm:table-cell">{formatCurrency(entry.totalValue)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium border ${stockBadgeClass(status)}`}>{STOCK_STATUS_LABELS[status]}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: catalog details */}
        <div className="space-y-5">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 space-y-3">
            <h2 className="font-semibold text-white text-sm">Detalles del articulo</h2>
            {item.description && <p className="text-sm text-zinc-400">{item.description}</p>}
            <div className="space-y-2 text-sm">
              {([
                ["Categoria", INVENTORY_CATEGORY_LABELS[item.category]],
                ["Tipo", INVENTORY_ITEM_TYPE_LABELS[item.itemType]],
                ["Unidad", INVENTORY_UNIT_LABELS[item.unit]],
                ["Costo promedio", formatCurrency(item.averageCost)],
                ...(item.lastPurchaseCost !== undefined ? [["Ult. costo compra", formatCurrency(item.lastPurchaseCost)]] : []),
                ...(item.salePrice !== undefined ? [["Precio venta", formatCurrency(item.salePrice)]] : []),
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-zinc-200">{value}</span>
                </div>
              ))}
            </div>
            {item.notes && <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-3">{item.notes}</p>}
          </div>
        </div>
      </div>

      {/* Movement history */}
      <div className="rounded-lg bg-zinc-900 border border-zinc-800">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="font-semibold text-white text-sm">Historial de movimientos</h2>
        </div>
        {movements.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-zinc-500 text-sm">Sin movimientos registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800">
                <tr>
                  <th className="text-left py-2.5 px-4 font-medium text-zinc-400">Tipo</th>
                  <th className="text-left py-2.5 px-4 font-medium text-zinc-400 hidden sm:table-cell">Ubicacion</th>
                  <th className="text-right py-2.5 px-4 font-medium text-zinc-400">Cantidad</th>
                  <th className="text-right py-2.5 px-4 font-medium text-zinc-400 hidden md:table-cell">Costo</th>
                  <th className="text-left py-2.5 px-4 font-medium text-zinc-400 hidden lg:table-cell">Notas</th>
                  <th className="text-right py-2.5 px-4 font-medium text-zinc-400">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {movements.map((m) => {
                  const isIn = IN_MOVEMENT_TYPES.includes(m.type);
                  const locationId = m.locationId ?? m.fromLocationId ?? m.toLocationId;
                  const loc = locations.find((l) => l.id === locationId);
                  return (
                    <tr key={m.id}>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${movementBadgeClass(m.type)}`}>{INVENTORY_MOVEMENT_TYPE_LABELS[m.type]}</span>
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400 hidden sm:table-cell text-xs">
                        {m.fromLocationId && m.toLocationId
                          ? `${locations.find((l) => l.id === m.fromLocationId)?.name ?? m.fromLocationId} -> ${locations.find((l) => l.id === m.toLocationId)?.name ?? m.toLocationId}`
                          : loc?.name ?? locationId ?? "-"}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-semibold ${isIn ? "text-green-400" : "text-red-400"}`}>
                        {isIn ? "+" : "-"}{m.quantity.toLocaleString("es-PA")}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400 hidden md:table-cell">{m.unitCost !== undefined ? formatCurrency(m.unitCost) : "-"}</td>
                      <td className="py-2.5 px-4 text-zinc-500 text-xs hidden lg:table-cell max-w-[200px] truncate">{m.notes ?? "-"}</td>
                      <td className="py-2.5 px-4 text-right text-zinc-500 text-xs whitespace-nowrap">{formatDate(m.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
