"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Factory, Loader2, Package, Users, Search, X } from "lucide-react";
import Link from "next/link";
import { productionOrderSchema, type ProductionOrderFormValues } from "@/lib/schemas/production";
import { createProductionOrder } from "@/lib/firestore/production";
import { getOrderById, updateOrder } from "@/lib/firestore/orders";
import { listInventoryItems } from "@/lib/firestore/inventory";
import { listInventoryLocations } from "@/lib/firestore/inventory";
import { listClients } from "@/lib/firestore/clients";
import type { Client } from "@/types/client";
import {
  PRODUCTION_PROJECT_TYPE_LABELS,
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
} from "@/types/production";
import type { ProductionProjectType, ProductionStatus, ProductionPriority } from "@/types/production";
import type { InventoryItem, InventoryLocation } from "@/types/inventory";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function NuevaOrdenProduccionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOrderId = searchParams.get("fromOrder");

  const [serverError, setServerError] = useState<string | null>(null);
  const [fromOrderNumber, setFromOrderNumber] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(!!fromOrderId);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listClients().then(setClients); }, []);

  useEffect(() => {
    if (!showDropdown) return;
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const filteredClients = clientSearch.trim().length > 0
    ? clients.filter((c) =>
        c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)
      ).slice(0, 8)
    : [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductionOrderFormValues>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: {
      productionType: fromOrderId ? "order_based" : undefined,
      status: "pending",
      priority: "medium",
      projectType: "custom",
    },
  });

  const productionType = useWatch({ control, name: "productionType" });

  // Load items + locations for stock type
  useEffect(() => {
    if (productionType !== "stock") return;
    if (inventoryItems.length === 0) {
      listInventoryItems().then((items) => setInventoryItems(items.filter((i) => i.isActive)));
    }
    if (locations.length === 0) {
      listInventoryLocations().then((locs) => setLocations(locs.filter((l) => l.isActive)));
    }
  }, [productionType, inventoryItems.length, locations.length]);

  useEffect(() => {
    if (!fromOrderId) return;
    getOrderById(fromOrderId)
      .then((order) => {
        if (!order) return;
        setFromOrderNumber(order.orderNumber);
        reset({
          productionType: "order_based",
          clientName: order.clientName,
          clientPhone: order.clientPhone ?? "",
          orderId: fromOrderId,
          projectType: order.projectType as ProductionProjectType,
          title: order.title,
          description: order.description ?? "",
          priority: order.priority as ProductionPriority,
          promisedDeliveryDate: order.promisedDeliveryDate
            ? order.promisedDeliveryDate.toISOString().split("T")[0]
            : "",
          notes: order.notes ?? "",
          internalNotes: order.internalNotes ?? "",
          workshopInternalPrice: order.finalSalePrice,
          status: "pending",
        });
      })
      .finally(() => setLoadingOrder(false));
  }, [fromOrderId, reset]);

  async function onSubmit(values: ProductionOrderFormValues) {
    setServerError(null);
    if (values.productionType === "order_based" && !selectedClient && !fromOrderId) {
      setServerError("Debes seleccionar un cliente existente.");
      return;
    }
    try {
      const id = await createProductionOrder(values);
      if (fromOrderId) {
        await updateOrder(fromOrderId, { status: "sent_to_workshop" });
      }
      router.push(`/produccion/${id}`);
    } catch {
      setServerError("Error al crear la orden. Intenta de nuevo.");
    }
  }

  if (loadingOrder) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={fromOrderId ? `/pedidos/${fromOrderId}` : "/produccion"}
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Nueva orden de producción
          </h1>
          <p className="text-xs text-zinc-500">
            {fromOrderNumber ? `Desde pedido ${fromOrderNumber}` : "Registra un proyecto para fabricación en taller"}
          </p>
        </div>
      </div>

      {/* From-order banner */}
      {fromOrderNumber && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          <Factory size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Datos precargados desde el pedido {fromOrderNumber}</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Completa los campos faltantes (responsable, equipo, fechas, costos internos) y guarda para crear la orden.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* ── Step 1: Production type selector ── */}
        {!fromOrderId && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Tipo de producción</h2>
            {errors.productionType && (
              <p className="text-xs text-red-400">{errors.productionType.message ?? "Selecciona un tipo de producción"}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue("productionType", "order_based", { shouldValidate: true })}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  productionType === "order_based"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600"
                }`}
              >
                <Users size={18} className={productionType === "order_based" ? "text-amber-400 shrink-0 mt-0.5" : "text-zinc-500 shrink-0 mt-0.5"} />
                <div>
                  <p className={`text-sm font-semibold ${productionType === "order_based" ? "text-amber-300" : "text-zinc-300"}`}>
                    Pedido de cliente
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Para fabricar un proyecto específico solicitado por un cliente.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setValue("productionType", "stock", { shouldValidate: true })}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  productionType === "stock"
                    ? "border-green-500 bg-green-500/10"
                    : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600"
                }`}
              >
                <Package size={18} className={productionType === "stock" ? "text-green-400 shrink-0 mt-0.5" : "text-zinc-500 shrink-0 mt-0.5"} />
                <div>
                  <p className={`text-sm font-semibold ${productionType === "stock" ? "text-green-300" : "text-zinc-300"}`}>
                    Para stock
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Para producir artículos y registrarlos en el inventario.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Hidden productionType input when coming from order (already set via reset) */}
        {fromOrderId && <input type="hidden" {...register("productionType")} />}

        {/* ── Order-based fields ── */}
        {productionType === "order_based" && (
          <Section title="Cliente y proyecto">
            {/* Client picker — not shown when pre-filled from an order */}
            {!fromOrderId && (
              <div ref={searchRef} className="relative">
                <Label>Buscar cliente *</Label>
                <div className="relative mt-1.5">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); setSelectedClient(null); setValue("clientName", ""); setValue("clientPhone", ""); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar por nombre o teléfono…"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-8 pr-8 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  {clientSearch && (
                    <button
                      type="button"
                      onClick={() => { setClientSearch(""); setSelectedClient(null); setValue("clientName", ""); setValue("clientPhone", ""); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {showDropdown && filteredClients.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl max-h-56 overflow-y-auto">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          setSelectedClient(c);
                          setClientSearch(c.fullName);
                          setShowDropdown(false);
                          setValue("clientName", c.fullName);
                          setValue("clientPhone", c.phone ?? "");
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-zinc-100 truncate">{c.fullName}</span>
                          <span className="text-xs text-zinc-500">{c.phone}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && clientSearch.trim().length > 0 && filteredClients.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-xs text-zinc-500">
                    No se encontró ningún cliente. <Link href="/clientes/nuevo" className="text-amber-400 hover:underline">Crear cliente</Link>
                  </div>
                )}
              </div>
            )}

            {selectedClient && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
                <span className="font-medium">Cliente seleccionado:</span>
                <span>{selectedClient.fullName}</span>
                <span className="text-zinc-500">({selectedClient.phone})</span>
              </div>
            )}

            {!selectedClient && !fromOrderId && (
              <p className="text-xs text-zinc-500">Escribe el nombre o teléfono para buscar un cliente registrado.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Hidden inputs carry the values to the form */}
              <input type="hidden" {...register("clientName")} />
              <input type="hidden" {...register("clientPhone")} />

              {fromOrderId && (
                <>
                  <Field label="Nombre del cliente">
                    <Input {...register("clientName")} readOnly className="opacity-60 cursor-not-allowed" />
                  </Field>
                  <Field label="Teléfono del cliente">
                    <Input {...register("clientPhone")} readOnly className="opacity-60 cursor-not-allowed" />
                  </Field>
                </>
              )}

              <Field label="ID del pedido (opcional)" className={fromOrderId ? "" : "sm:col-span-2"}>
                <Input
                  {...register("orderId")}
                  placeholder="ID del pedido relacionado"
                  readOnly={!!fromOrderId}
                  className={fromOrderId ? "opacity-60 cursor-not-allowed" : ""}
                />
              </Field>
            </div>
          </Section>
        )}

        {/* ── Stock production fields ── */}
        {productionType === "stock" && (
          <Section title="Artículo para producir">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Artículo del catálogo *" error={errors.inventoryItemId?.message} className="sm:col-span-2">
                <select
                  {...register("inventoryItemId")}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                >
                  <option value="">— Selecciona un artículo —</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.sku ? ` (${item.sku})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cantidad a producir *" error={errors.quantityToProduce?.message}>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  {...register("quantityToProduce", { valueAsNumber: true })}
                  placeholder="0"
                />
              </Field>
              <Field label="Ubicación de destino *" error={errors.destinationLocationId?.message}>
                <select
                  {...register("destinationLocationId")}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                >
                  <option value="">— Selecciona ubicación —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Costo por unidad (opcional)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register("unitCost", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </Field>
            </div>
          </Section>
        )}

        {/* ── Common: Production details (only show once type is selected) ── */}
        {productionType && (
          <>
            <Section title="Detalles de la orden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Tipo de proyecto *">
                  <select {...register("projectType")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                    {(Object.keys(PRODUCTION_PROJECT_TYPE_LABELS) as ProductionProjectType[]).map((t) => (
                      <option key={t} value={t}>{PRODUCTION_PROJECT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Prioridad *">
                  <select {...register("priority")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                    {(Object.keys(PRODUCTION_PRIORITY_LABELS) as ProductionPriority[]).map((p) => (
                      <option key={p} value={p}>{PRODUCTION_PRIORITY_LABELS[p]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Estado inicial *">
                  <select {...register("status")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                    {(Object.keys(PRODUCTION_STATUS_LABELS) as ProductionStatus[]).map((s) => (
                      <option key={s} value={s}>{PRODUCTION_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Responsable">
                  <Input {...register("responsiblePerson")} placeholder="Nombre del encargado" />
                </Field>
                <Field label="Título del proyecto *" error={errors.title?.message} className="sm:col-span-2">
                  <Input {...register("title")} placeholder="Ej. Cabaña 3 habitaciones – Finca La Esperanza" />
                </Field>
                <Field label="Descripción" className="sm:col-span-2">
                  <Textarea {...register("description")} rows={3} placeholder="Descripción del trabajo a realizar…" />
                </Field>
                <Field label="Equipo asignado" className="sm:col-span-2">
                  <Input {...register("assignedTeam")} placeholder="Ej. Equipo carpintería norte" />
                </Field>
              </div>
            </Section>

            <Section title="Fechas">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Fecha de inicio planificada">
                  <DatePicker value={watch("plannedStartDate")} onChange={(v) => setValue("plannedStartDate", v || undefined)} />
                </Field>
                <Field label="Fecha de entrega prometida">
                  <DatePicker value={watch("promisedDeliveryDate")} onChange={(v) => setValue("promisedDeliveryDate", v || undefined)} />
                </Field>
              </div>
            </Section>

            <Section title="Costos internos (taller)">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Precio interno (taller)">
                  <Input type="number" min={0} {...register("workshopInternalPrice", { valueAsNumber: true })} placeholder="0" />
                </Field>
                <Field label="Costo estimado de materiales">
                  <Input type="number" min={0} {...register("estimatedMaterialCost", { valueAsNumber: true })} placeholder="0" />
                </Field>
                <Field label="Horas estimadas de trabajo">
                  <Input type="number" min={0} step="0.5" {...register("estimatedLaborHours", { valueAsNumber: true })} placeholder="0" />
                </Field>
              </div>
            </Section>

            <Section title="Notas">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Notas generales">
                  <Textarea {...register("notes")} rows={3} placeholder="Notas visibles para el equipo…" />
                </Field>
                <Field label="Notas internas">
                  <Textarea {...register("internalNotes")} rows={3} placeholder="Notas internas de administración…" />
                </Field>
              </div>
            </Section>
          </>
        )}

        {serverError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{serverError}</p>
        )}

        <div className="flex gap-3">
          <Link
            href="/produccion"
            className="flex-1 flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !productionType}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? "Creando…" : fromOrderId ? "Crear orden desde pedido" : "Crear orden de producción"}
          </button>
        </div>
      </form>
    </div>
  );
}

