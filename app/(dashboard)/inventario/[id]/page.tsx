"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, Edit, Loader2, AlertTriangle, Package, TrendingUp,
  TrendingDown, Plus, Minus, ArrowRightLeft, X, CheckCircle2,
} from "lucide-react";
import {
  getInventoryItemById,
  updateInventoryItem,
  listInventoryMovementsByItem,
  listInventoryLocations,
  listInventoryItems,
  adjustInventoryStock,
  transferInventoryStock,
} from "@/lib/firestore/inventory";
import type { InventoryItem, InventoryLocation, InventoryMovement } from "@/types/inventory";
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_ITEM_TYPE_LABELS,
  INVENTORY_UNIT_LABELS,
  INVENTORY_MOVEMENT_TYPE_LABELS,
  STOCK_STATUS_LABELS,
  getStockStatus,
} from "@/types/inventory";
import { adjustStockSchema, transferStockSchema } from "@/lib/schemas/inventory";
import type { AdjustStockFormValues, TransferStockFormValues } from "@/lib/schemas/inventory";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCurrency } from "@/context/currency-context";

type BadgeVariant = BadgeProps["variant"];

const STOCK_STATUS_VARIANT: Record<string, BadgeVariant> = {
  ok: "green",
  bajo_minimo: "amber",
  sin_stock: "red",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Movement badge ────────────────────────────────────────
const MOVEMENT_VARIANT: Record<string, BadgeVariant> = {
  purchase_in: "green",
  production_out: "purple",
  transfer_in: "blue",
  transfer_out: "blue",
  adjustment_in: "amber",
  adjustment_out: "amber",
  sale_out: "default",
  return_in: "green",
};

// ── Modals ────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div ref={ref} className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────

export default function InventarioDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { formatCurrency } = useCurrency();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [location, setLocation] = useState<InventoryLocation | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // All items for transfer target selection
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [allLocations, setAllLocations] = useState<InventoryLocation[]>([]);
  const [locMap, setLocMap] = useState<Record<string, InventoryLocation>>({});
  const [transferTargetLocationId, setTransferTargetLocationId] = useState<string>("");

  // Modal state
  type ModalType = "adjust" | "transfer" | null;
  const [modal, setModal] = useState<ModalType>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // ── Load data ─────────────────────────────────────────
  async function load() {
    try {
      const [it, mvs, locs, its] = await Promise.all([
        getInventoryItemById(id),
        listInventoryMovementsByItem(id),
        listInventoryLocations(),
        listInventoryItems(),
      ]);
      setItem(it);
      setMovements(mvs);
      const lm = Object.fromEntries(locs.map((l) => [l.id, l]));
      if (it) setLocation(lm[it.locationId] ?? null);
      setAllItems(its.filter((i) => i.id !== id));
      setAllLocations(locs);
      setLocMap(lm);
    } catch {
      setLoadError("Error al cargar el artículo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Adjust form ───────────────────────────────────────
  const adjustForm = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: { type: "adjustment_in", quantity: 1 },
  });

  async function onAdjust(values: AdjustStockFormValues) {
    setModalError(null);
    try {
      await adjustInventoryStock(id, values.type, values.quantity, {
        unitCost: values.unitCost,
        notes: values.notes,
        referenceType: "manual_adjustment",
      });
      const newItem = await getInventoryItemById(id);
      const newMovs = await listInventoryMovementsByItem(id);
      setItem(newItem);
      setMovements(newMovs);
      setModalSuccess("Stock actualizado correctamente.");
      adjustForm.reset({ type: "adjustment_in", quantity: 1 });
      setTimeout(() => { setModal(null); setModalSuccess(null); }, 1500);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error al ajustar stock.");
    }
  }

  // ── Transfer form ─────────────────────────────────────
  const transferForm = useForm<TransferStockFormValues>({
    resolver: zodResolver(transferStockSchema),
    defaultValues: { quantity: 1 },
  });

  async function onTransfer(values: TransferStockFormValues) {
    setModalError(null);
    try {
      if (!item) return;
      // Resolve target item: same name in destination location
      const itemsInLoc = allItems.filter((i) => i.locationId === transferTargetLocationId);
      const targetItem =
        itemsInLoc.find((i) => i.name.toLowerCase() === item.name.toLowerCase()) ??
        (itemsInLoc.length === 1 ? itemsInLoc[0] : null);
      if (!targetItem) {
        setModalError("No se encontró el artículo en la ubicación destino. Créalo primero.");
        return;
      }
      const targetLocationName = locMap[targetItem.locationId]?.name;
      await transferInventoryStock(id, targetItem.id, values.quantity, {
        notes: values.notes,
        sourceLocationName: location?.name,
        targetLocationName,
      });
      const newItem = await getInventoryItemById(id);
      const newMovs = await listInventoryMovementsByItem(id);
      setItem(newItem);
      setMovements(newMovs);
      setModalSuccess("Transferencia realizada.");
      transferForm.reset({ quantity: 1 });
      setTransferTargetLocationId("");
      setTimeout(() => { setModal(null); setModalSuccess(null); }, 1500);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error al transferir.");
    }
  }

  // ── Quick operations (entrada / salida) ───────────────
  const [quickType, setQuickType] = useState<"purchase_in" | "sale_out">("purchase_in");

  function openAdjust(type: AdjustStockFormValues["type"]) {
    adjustForm.reset({ type, quantity: 1 });
    setModalError(null);
    setModalSuccess(null);
    setModal("adjust");
  }

  // ── Render ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (loadError || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertTriangle size={24} className="text-red-400" />
        <p className="text-zinc-400">{loadError ?? "Artículo no encontrado"}</p>
        <Link href="/inventario" className="text-sm text-amber-500 hover:text-amber-400">
          Volver al inventario
        </Link>
      </div>
    );
  }

  const status = getStockStatus(item);
  const inventoryValue = item.currentStock * item.averageCost;

  return (
    <>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link
            href="/inventario"
            className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0 mt-0.5"
          >
            <ArrowLeft size={15} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-100 truncate" style={{ fontFamily: "var(--font-heading)" }}>
                {item.name}
              </h1>
              <Badge variant={STOCK_STATUS_VARIANT[status]}>{STOCK_STATUS_LABELS[status]}</Badge>
              {status !== "ok" && (
                <Badge variant="red">
                  <AlertTriangle size={10} className="mr-1" />
                  {status === "sin_stock" ? "Sin stock" : "Bajo mínimo"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {item.sku && <span className="text-xs text-zinc-500 font-mono">{item.sku}</span>}
              <span className="text-xs text-zinc-500">{INVENTORY_CATEGORY_LABELS[item.category]}</span>
              <span className="text-xs text-zinc-500">{INVENTORY_ITEM_TYPE_LABELS[item.itemType]}</span>
            </div>
          </div>
          <Link
            href={`/inventario/${id}/editar`}
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
          >
            <Edit size={14} />
            Editar
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Item info */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-zinc-300">Información general</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <InfoCell label="Categoría" value={INVENTORY_CATEGORY_LABELS[item.category]} />
                <InfoCell label="Tipo" value={INVENTORY_ITEM_TYPE_LABELS[item.itemType]} />
                <InfoCell label="Unidad" value={INVENTORY_UNIT_LABELS[item.unit]} />
                <InfoCell label="Ubicación" value={location?.name ?? item.locationId} />
                {item.sku && <InfoCell label="SKU" value={item.sku} mono />}
              </div>
              {item.description && (
                <div className="rounded-lg bg-zinc-800/50 px-3 py-2.5">
                  <p className="text-xs text-zinc-500 mb-1">Descripción</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{item.description}</p>
                </div>
              )}
              {item.notes && (
                <div className="rounded-lg bg-zinc-800/50 px-3 py-2.5">
                  <p className="text-xs text-zinc-500 mb-1">Notas</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}
            </div>

            {/* Movement history */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-300">Historial de movimientos</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{movements.length} movimientos</p>
              </div>
              {movements.length === 0 ? (
                <div className="px-5 py-8 text-center text-zinc-600 text-sm">
                  Sin movimientos registrados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tipo</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cantidad</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Costo unit.</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Total</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Referencia</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {movements.map((mv) => {
                        const isIn = ["purchase_in", "transfer_in", "adjustment_in", "return_in"].includes(mv.type);
                        return (
                          <tr key={mv.id} className="hover:bg-zinc-800/30">
                            <td className="px-4 py-2.5">
                              <Badge variant={MOVEMENT_VARIANT[mv.type] ?? "default"}>
                                {INVENTORY_MOVEMENT_TYPE_LABELS[mv.type]}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`font-medium ${isIn ? "text-emerald-400" : "text-red-400"}`}>
                                {isIn ? "+" : "-"}{mv.quantity} {INVENTORY_UNIT_LABELS[item.unit]}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right hidden sm:table-cell text-zinc-400">
                              {mv.unitCost !== undefined ? formatCurrency(mv.unitCost) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right hidden sm:table-cell text-zinc-300">
                              {mv.totalCost !== undefined ? formatCurrency(mv.totalCost) : "—"}
                            </td>
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              {mv.notes ? (
                                <span className="text-xs text-zinc-500 truncate max-w-32 block">{mv.notes}</span>
                              ) : mv.referenceId ? (
                                <span className="text-xs text-zinc-600 font-mono truncate max-w-32 block">{mv.referenceId}</span>
                              ) : (
                                <span className="text-xs text-zinc-700">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs text-zinc-500 whitespace-nowrap">
                              {formatDate(mv.createdAt)}
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

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">
            {/* Stock summary */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-zinc-300">Stock</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">Stock actual</p>
                    <p className={`text-3xl font-bold mt-0.5 ${item.currentStock <= 0 ? "text-red-400" : item.currentStock <= item.minimumStock ? "text-amber-400" : "text-zinc-100"}`}>
                      {item.currentStock}
                      <span className="text-base font-normal text-zinc-500 ml-1.5">{INVENTORY_UNIT_LABELS[item.unit]}</span>
                    </p>
                  </div>
                </div>
                {item.minimumStock > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                    <span className="text-xs text-zinc-500">Stock mínimo</span>
                    <span className="text-sm font-medium text-zinc-300">{item.minimumStock} {INVENTORY_UNIT_LABELS[item.unit]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Value summary */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-zinc-300">Valor en inventario</h2>
              <ValueRow label="Costo promedio" value={formatCurrency(item.averageCost)} />
              {item.lastPurchaseCost !== undefined && (
                <ValueRow label="Último costo compra" value={formatCurrency(item.lastPurchaseCost)} />
              )}
              {item.salePrice !== undefined && (
                <ValueRow label="Precio de venta" value={formatCurrency(item.salePrice)} highlight />
              )}
              <div className="border-t border-zinc-800 pt-3 mt-1">
                <ValueRow
                  label="Valor total inventario"
                  value={formatCurrency(inventoryValue)}
                  large
                  highlight
                />
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-zinc-300 mb-1">Acciones</h2>
              <ActionBtn
                icon={<Plus size={14} />}
                label="Registrar entrada"
                color="green"
                onClick={() => openAdjust("purchase_in")}
              />
              <ActionBtn
                icon={<Minus size={14} />}
                label="Registrar salida"
                color="red"
                onClick={() => openAdjust("sale_out")}
              />
              <ActionBtn
                icon={<TrendingUp size={14} />}
                label="Ajuste (entrada)"
                color="amber"
                onClick={() => openAdjust("adjustment_in")}
              />
              <ActionBtn
                icon={<TrendingDown size={14} />}
                label="Ajuste (salida)"
                color="amber"
                onClick={() => openAdjust("adjustment_out")}
              />
              <ActionBtn
                icon={<ArrowRightLeft size={14} />}
                label="Transferir stock"
                color="blue"
                onClick={() => { transferForm.reset({ quantity: 1 }); setTransferTargetLocationId(""); setModalError(null); setModalSuccess(null); setModal("transfer"); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Adjust modal ── */}
      {modal === "adjust" && (
        <Modal title="Ajustar stock" onClose={() => setModal(null)}>
          <form onSubmit={adjustForm.handleSubmit(onAdjust)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-zinc-400 text-xs">Tipo de movimiento</Label>
              <Select {...adjustForm.register("type")}>
                <option value="purchase_in">Compra (entrada)</option>
                <option value="adjustment_in">Ajuste (entrada)</option>
                <option value="adjustment_out">Ajuste (salida)</option>
                <option value="sale_out">Venta (salida)</option>
                <option value="return_in">Devolución (entrada)</option>
              </Select>
              {adjustForm.formState.errors.type && (
                <p className="text-xs text-red-400">{adjustForm.formState.errors.type.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-zinc-400 text-xs">Cantidad *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...adjustForm.register("quantity", { valueAsNumber: true })}
                  placeholder="0"
                />
                {adjustForm.formState.errors.quantity && (
                  <p className="text-xs text-red-400">{adjustForm.formState.errors.quantity.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-zinc-400 text-xs">Costo unitario</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...adjustForm.register("unitCost", { valueAsNumber: true, setValueAs: (v) => (v === "" || isNaN(Number(v)) ? undefined : Number(v)) })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-zinc-400 text-xs">Notas</Label>
              <Input {...adjustForm.register("notes")} placeholder="Motivo del ajuste…" />
            </div>
            {modalError && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                {modalError}
              </p>
            )}
            {modalSuccess && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {modalSuccess}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 h-9 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adjustForm.formState.isSubmitting}
                className="flex-1 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                {adjustForm.formState.isSubmitting && <Loader2 size={13} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Transfer modal ── */}
      {modal === "transfer" && (
        <Modal title="Transferir stock" onClose={() => { setModal(null); setTransferTargetLocationId(""); }}>
          <form onSubmit={transferForm.handleSubmit(onTransfer)} className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              Transfiere <span className="text-zinc-300 font-medium">{item.name}</span>{" "}
              desde <span className="text-amber-400 font-medium">{location?.name ?? "esta ubicación"}</span>.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label className="text-zinc-400 text-xs">Ubicación destino *</Label>
              <Select
                value={transferTargetLocationId}
                onChange={(e) => setTransferTargetLocationId(e.target.value)}
              >
                <option value="">Seleccionar ubicación…</option>
                {allLocations
                  .filter((l) => l.id !== item.locationId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-zinc-400 text-xs">Cantidad a transferir *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...transferForm.register("quantity", { valueAsNumber: true })}
                placeholder="0"
              />
              {transferForm.formState.errors.quantity && (
                <p className="text-xs text-red-400">{transferForm.formState.errors.quantity.message}</p>
              )}
              <p className="text-xs text-zinc-600">Disponible: {item.currentStock} {INVENTORY_UNIT_LABELS[item.unit]}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-zinc-400 text-xs">Notas</Label>
              <Input {...transferForm.register("notes")} placeholder="Motivo de la transferencia…" />
            </div>
            {modalError && (
              <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                {modalError}
              </p>
            )}
            {modalSuccess && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={12} /> {modalSuccess}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 h-9 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={transferForm.formState.isSubmitting}
                className="flex-1 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                {transferForm.formState.isSubmitting && <Loader2 size={13} className="animate-spin" />}
                Transferir
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────

function InfoCell({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-sm font-medium text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function ValueRow({
  label,
  value,
  large,
  highlight,
}: {
  label: string;
  value: string;
  large?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`font-medium ${large ? "text-base" : "text-sm"} ${highlight ? "text-amber-400" : "text-zinc-300"}`}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: "green" | "red" | "amber" | "blue";
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    green: "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10",
    red: "border-red-500/20 text-red-400 hover:bg-red-500/10",
    amber: "border-amber-500/20 text-amber-400 hover:bg-amber-500/10",
    blue: "border-blue-500/20 text-blue-400 hover:bg-blue-500/10",
  };
  return (
    <button
      onClick={onClick}
      className={`w-full h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors ${colorMap[color]}`}
    >
      {icon}
      {label}
    </button>
  );
}
