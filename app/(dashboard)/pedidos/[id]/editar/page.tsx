"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Trash2, Search, X, Package } from "lucide-react";
import Link from "next/link";
import { orderSchema, type OrderFormValues } from "@/lib/schemas/order";
import { getOrderById, listOrderItems, updateOrder, addOrderItem, deleteOrderItem } from "@/lib/firestore/orders";
import { listClients, getClientById } from "@/lib/firestore/clients";
import { listInventoryItems } from "@/lib/firestore/inventory";
import type { Client } from "@/types/client";
import type { InventoryItem } from "@/types/inventory";
import {
  ORDER_SOURCE_LABELS,
  ORDER_PROJECT_TYPE_LABELS,
  ORDER_PRIORITY_LABELS,
  ORDER_STATUS_LABELS,
} from "@/types/order";
import type { OrderSource, OrderProjectType, OrderPriority, OrderStatus } from "@/types/order";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useCurrency } from "@/context/currency-context";

const clean = (v?: string) => (v?.trim() === "" ? undefined : v?.trim());

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

function TotalRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${bold ? "font-semibold text-zinc-100" : "text-zinc-400"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-zinc-100" : accent ? "text-amber-400 font-medium" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}

export default function EditOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [existingItemIds, setExistingItemIds] = useState<string[]>([]);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchPopupIndex, setSearchPopupIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [depositPercent, setDepositPercent] = useState(0);

  useEffect(() => {
    listClients().then(setClients);
    listInventoryItems().then(setInventoryItems);
  }, []);

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
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: "deposit_pending",
      priority: "medium",
      source: "direct",
      projectType: "custom",
      installationRequired: false,
      finalSalePrice: 0,
      taxRate: 0,
      depositRequired: 0,
      depositPaid: 0,
      items: [{ sku: "", inventoryItemId: "", description: "", quantity: 1, unit: "und", unitPrice: 0, category: "product" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const watchFinalSalePrice = watch("finalSalePrice");
  const watchDepositPaid = watch("depositPaid");
  const watchTaxRate = watch("taxRate") ?? 0;
  const watchInstallation = watch("installationRequired");
  const watchProjectType = watch("projectType");
  const isMaintenance = watchProjectType === "maintenance";
  const [maintInstallationDate, setMaintInstallationDate] = useState<string>("");
  const [maintMaintenanceDate, setMaintMaintenanceDate] = useState<string>("");

  const subtotal = (watchItems ?? []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);
  const taxAmount = subtotal * (Number(watchTaxRate) || 0) / 100;
  const totalFinal = subtotal + taxAmount;
  const balanceDue = (Number(watchFinalSalePrice) || 0) - (Number(watchDepositPaid) || 0);

  // Auto-update finalSalePrice and depositRequired when subtotal/rates change
  useEffect(() => {
    if (loading) return;
    setValue("finalSalePrice", totalFinal, { shouldValidate: false });
    setValue("depositRequired", Math.round(totalFinal * (depositPercent || 0) / 100), { shouldValidate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFinal, depositPercent]);

  // Load order
  useEffect(() => {
    Promise.all([getOrderById(orderId), listOrderItems(orderId)])
      .then(([order, items]) => {
        if (!order) { setNotFound(true); return; }
        setExistingItemIds(items.map((i) => i.id));
        setClientSearch(order.clientName);

        // Try to find matching client in list
        listClients().then((cls) => {
          const found = order.clientId ? cls.find((c) => c.id === order.clientId) : undefined;
          if (found) setSelectedClient(found);
        });

        // Derive deposit % from stored values if possible
        if (order.depositRequired && order.finalSalePrice) {
          setDepositPercent(Math.round((order.depositRequired / order.finalSalePrice) * 100));
        }

        if (order.projectType === "maintenance" && order.promisedDeliveryDate) {
          setMaintMaintenanceDate(order.promisedDeliveryDate.toISOString().split("T")[0]);
        }
        reset({
          clientName: order.clientName,
          clientPhone: order.clientPhone,
          quotationId: order.quotationId ?? "",
          leadId: order.leadId ?? "",
          clientId: order.clientId ?? "",
          clientDocumentId: order.clientDocumentId ?? "",
          clientAddress: order.clientAddress ?? "",
          clientCity: order.clientCity ?? "",
          clientDepartment: order.clientDepartment ?? "",
          source: order.source,
          storeId: order.storeId ?? "",
          projectType: order.projectType,
          title: order.title,
          description: order.description ?? "",
          status: order.status,
          priority: order.priority,
          finalSalePrice: order.finalSalePrice,
          taxRate: 0,
          depositRequired: order.depositRequired,
          depositPaid: order.depositPaid,
          promisedDeliveryDate: order.promisedDeliveryDate
            ? order.promisedDeliveryDate.toISOString().split("T")[0]
            : "",
          installationRequired: order.installationRequired,
          deliveryAddress: order.deliveryAddress ?? "",
          googleMapsUrl: order.googleMapsUrl ?? "",
          notes: order.notes ?? "",
          internalNotes: order.internalNotes ?? "",
          items: items.length > 0
            ? items.map((i) => ({
                sku: i.sku ?? "",
                inventoryItemId: i.inventoryItemId ?? "",
                description: i.description,
                quantity: i.quantity,
                unit: i.unit,
                unitPrice: i.unitPrice,
                category: i.category,
                notes: i.notes ?? "",
              }))
            : [{ sku: "", inventoryItemId: "", description: "", quantity: 1, unit: "und", unitPrice: 0, category: "product" }],
        });
      })
      .catch((err) => {
        console.error("Error loading order:", err);
        setLoadError("Error al cargar el pedido.");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  function pickInventoryItem(index: number, item: InventoryItem) {
    setValue(`items.${index}.sku`, item.sku ?? "");
    setValue(`items.${index}.inventoryItemId`, item.id);
    setValue(`items.${index}.description`, item.name);
    if (!(Number(watchItems?.[index]?.unitPrice) > 0)) {
      setValue(`items.${index}.unitPrice`, item.salePrice ?? item.lastPurchaseCost ?? item.averageCost);
    }
    setSearchPopupIndex(null);
    setSearchQuery("");
  }

  function handleSkuBlur(index: number, sku: string) {
    const trimmed = sku.trim().toUpperCase();
    if (!trimmed) { setValue(`items.${index}.inventoryItemId`, ""); return; }
    const found = inventoryItems.find((it) => (it.sku ?? "").toUpperCase() === trimmed);
    if (found) {
      setValue(`items.${index}.inventoryItemId`, found.id);
      if (!watchItems?.[index]?.description) setValue(`items.${index}.description`, found.name);
      if (!(Number(watchItems?.[index]?.unitPrice) > 0))
        setValue(`items.${index}.unitPrice`, found.salePrice ?? found.lastPurchaseCost ?? found.averageCost);
    } else {
      setValue(`items.${index}.inventoryItemId`, "");
    }
  }

  function pickClient(c: Client) {
    setSelectedClient(c);
    setClientSearch(c.fullName);
    setShowDropdown(false);
    setValue("clientName", c.fullName);
    setValue("clientPhone", c.phone);
    setValue("clientId", c.id);
    setValue("clientDocumentId", c.documentId ?? "");
    setValue("clientAddress", c.address ?? "");
    setValue("clientCity", c.city ?? "");
    setValue("clientDepartment", c.department ?? "");
  }

  function clearClient() {
    setSelectedClient(null);
    setClientSearch("");
    setValue("clientName", "");
    setValue("clientPhone", "");
    setValue("clientId", "");
    setValue("clientDocumentId", "");
    setValue("clientAddress", "");
    setValue("clientCity", "");
    setValue("clientDepartment", "");
  }

  async function onSubmit(values: OrderFormValues) {
    setServerError(null);
    try {
      await updateOrder(orderId, {
        clientName: values.clientName.trim(),
        clientPhone: values.clientPhone.trim(),
        quotationId: clean(values.quotationId),
        leadId: clean(values.leadId),
        clientId: selectedClient?.id ?? clean(values.clientId),
        clientDocumentId: clean(values.clientDocumentId),
        clientAddress: clean(values.clientAddress),
        clientCity: clean(values.clientCity),
        clientDepartment: clean(values.clientDepartment),
        source: values.source,
        storeId: clean(values.storeId),
        projectType: values.projectType,
        title: clean(values.title),
        description: clean(values.description),
        status: values.status,
        priority: values.priority,
        finalSalePrice: values.finalSalePrice,
        depositRequired: values.depositRequired,
        depositPaid: values.depositPaid,
        promisedDeliveryDate: isMaintenance
          ? (maintMaintenanceDate ? new Date(maintMaintenanceDate) : undefined)
          : (values.promisedDeliveryDate ? new Date(values.promisedDeliveryDate) : undefined),
        installationRequired: values.installationRequired,
        deliveryAddress: clean(values.deliveryAddress),
        googleMapsUrl: clean(values.googleMapsUrl),
        notes: clean(values.notes),
        internalNotes: clean(values.internalNotes),
      });
      await Promise.all(existingItemIds.map((id) => deleteOrderItem(id)));
      for (const item of values.items) {
        await addOrderItem(orderId, item);
      }
      router.push(`/pedidos/${orderId}`);
    } catch {
      setServerError("Error al guardar los cambios. Intenta de nuevo.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-zinc-400">Pedido no encontrado</p>
        <Link href="/pedidos" className="text-xs text-amber-400 hover:underline">Volver a pedidos</Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-red-400">{loadError}</p>
        <Link href={`/pedidos/${orderId}`} className="text-xs text-amber-400 hover:underline">Volver al pedido</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Inventory search popup */}
      {searchPopupIndex !== null && (() => {
        const q = searchQuery.toLowerCase();
        const results = q.length > 0
          ? inventoryItems.filter((it) => it.name.toLowerCase().includes(q) || (it.sku ?? "").toLowerCase().includes(q))
          : inventoryItems;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) { setSearchPopupIndex(null); setSearchQuery(""); } }}
          >
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                <Search size={15} className="text-zinc-500 shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o codigo (SKU)..."
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
                <button type="button" onClick={() => { setSearchPopupIndex(null); setSearchQuery(""); }} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <X size={15} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                {results.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-zinc-600">Sin resultados</p>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => pickInventoryItem(searchPopupIndex, item)}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800 border-b border-zinc-800/60 last:border-0 transition-colors flex items-start gap-3"
                    >
                      <Package size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {item.sku && <span className="text-xs text-zinc-500 font-mono">{item.sku}</span>}
                          {item.salePrice != null && <span className="text-xs text-zinc-600">PVP: L {item.salePrice.toFixed(2)}</span>}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/pedidos/${orderId}`}
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Editar pedido
          </h1>
          <p className="text-xs text-zinc-500">Actualiza los datos del pedido</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Client info */}
        <Section title="Informacion del cliente">
          <div ref={searchRef} className="relative">
            <Label>Buscar cliente</Label>
            <div className="relative mt-1.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); setSelectedClient(null); setValue("clientName", e.target.value); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar por nombre o telefono..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-8 pr-8 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {clientSearch && (
                <button type="button" onClick={clearClient} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors">
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
                    onMouseDown={() => pickClient(c)}
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
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl px-3 py-3 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Sin resultados</span>
                <Link
                  href={`/clientes/nuevo?returnTo=/pedidos/${orderId}/editar`}
                  className="text-xs text-amber-400 hover:underline font-medium"
                >
                  + Crear cliente
                </Link>
              </div>
            )}
          </div>

          {selectedClient && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              <span className="font-medium">Cliente seleccionado:</span>
              <span>{selectedClient.fullName}</span>
              <span className="text-zinc-500">({selectedClient.phone})</span>
            </div>
          )}
        </Section>

        {/* Order header */}
        <Section title="Encabezado del pedido">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Canal *">
              <select {...register("source")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                {(Object.keys(ORDER_SOURCE_LABELS) as OrderSource[]).map((s) => (
                  <option key={s} value={s}>{ORDER_SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de proyecto *">
              <select {...register("projectType")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                {(Object.keys(ORDER_PROJECT_TYPE_LABELS) as OrderProjectType[]).map((t) => (
                  <option key={t} value={t}>{ORDER_PROJECT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado *">
              <select {...register("status")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad *">
              <select {...register("priority")} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900">
                {(Object.keys(ORDER_PRIORITY_LABELS) as OrderPriority[]).map((p) => (
                  <option key={p} value={p}>{ORDER_PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </Field>
            <Field label="N de cotizacion (opcional)">
              <Input {...register("quotationId")} placeholder="C20260001" />
            </Field>
            <Field label="ID de tienda (opcional)">
              <Input {...register("storeId")} placeholder="ID de tienda de origen" />
            </Field>
          </div>
        </Section>

        {/* Delivery */}
        {isMaintenance ? (
          <Section title="Fechas del mantenimiento">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Fecha de instalación">
                <DatePicker value={maintInstallationDate} onChange={(v) => setMaintInstallationDate(v ?? "")} />
              </Field>
              <Field label="Fecha de mantenimiento">
                <DatePicker value={maintMaintenanceDate} onChange={(v) => setMaintMaintenanceDate(v ?? "")} />
              </Field>
              <Field label="Dirección" className="sm:col-span-2">
                <Input {...register("deliveryAddress")} placeholder="Dirección de instalación" />
              </Field>
              <Field label="Link Google Maps" className="sm:col-span-2">
                <Input {...register("googleMapsUrl")} placeholder="https://maps.google.com/..." />
              </Field>
            </div>
          </Section>
        ) : (
          <Section title="Entrega e instalacion">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha de entrega prometida">
              <DatePicker value={watch("promisedDeliveryDate")} onChange={(v) => setValue("promisedDeliveryDate", v || undefined)} />
            </Field>
            <Field label="Requiere instalacion?">
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="installationRequired"
                  {...register("installationRequired")}
                  className="size-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="installationRequired" className="text-sm text-zinc-300">Si, requiere instalacion</label>
              </div>
            </Field>
            {watchInstallation && (
              <>
                <Field label="Direccion de entrega" className="sm:col-span-2">
                  <Input {...register("deliveryAddress")} placeholder="Direccion completa" />
                </Field>
                <Field label="Link Google Maps" className="sm:col-span-2">
                  <Input {...register("googleMapsUrl")} placeholder="https://maps.google.com/..." />
                </Field>
              </>
            )}
          </div>
        </Section>
        )}

        {/* Items */}
        <Section title="Items del pedido">
          {typeof errors.items?.message === "string" && (
            <p className="text-xs text-red-400 -mt-2">{errors.items.message}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left text-xs text-zinc-500 font-normal pb-2 pr-3 w-36">Codigo</th>
                  <th className="text-left text-xs text-zinc-500 font-normal pb-2 pr-3">Descripcion *</th>
                  <th className="text-right text-xs text-zinc-500 font-normal pb-2 px-3 w-24">Cant. *</th>
                  <th className="text-right text-xs text-zinc-500 font-normal pb-2 px-3 w-32">PVP *</th>
                  <th className="text-right text-xs text-zinc-500 font-normal pb-2 pl-3 w-28">Subtotal</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => {
                  const qty = Number(watchItems?.[idx]?.quantity) || 0;
                  const price = Number(watchItems?.[idx]?.unitPrice) || 0;
                  const lineTotal = qty * price;
                  const cellCls = "w-full bg-transparent border-b border-zinc-700/50 focus:border-amber-500 focus:outline-none text-sm text-zinc-100 placeholder:text-zinc-600 py-1.5 px-1 transition-colors";
                  return (
                    <tr key={field.id} className="border-b border-zinc-800/60 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setSearchPopupIndex(idx); setSearchQuery(""); }}
                            className="text-zinc-500 hover:text-amber-400 transition-colors shrink-0"
                            title="Buscar en inventario"
                          >
                            <Search size={13} />
                          </button>
                          <div className="relative flex-1">
                            <input
                              {...register(`items.${idx}.sku`)}
                              placeholder="SKU..."
                              onBlur={(e) => handleSkuBlur(idx, e.target.value)}
                              className={`${cellCls} uppercase pr-5`}
                            />
                            {watchItems?.[idx]?.inventoryItemId && (
                              <Package size={11} className="absolute right-1 top-1/2 -translate-y-1/2 text-amber-400" />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <textarea
                          {...register(`items.${idx}.description`)}
                          placeholder="Descripcion del item..."
                          rows={Math.max(2, (watchItems?.[idx]?.description ?? "").split("\n").length)}
                          className={`${cellCls} resize-y min-h-[2rem]`}
                        />
                        {errors.items?.[idx]?.description && (
                          <p className="text-xs text-red-400 mt-0.5">{errors.items[idx]?.description?.message}</p>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number" step="0.01" min="0"
                          {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                          className={`${cellCls} text-right`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number" step="0.01" min="0"
                          {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                          className={`${cellCls} text-right`}
                        />
                      </td>
                      <td className="py-2 pl-3 text-right text-sm text-zinc-200 font-mono tabular-nums whitespace-nowrap">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                          className="text-zinc-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right text-xs text-zinc-500 pr-3">Subtotal</td>
                  <td className="pt-3 text-right text-zinc-100 font-semibold font-mono tabular-nums">{formatCurrency(subtotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <button
            type="button"
            onClick={() => append({ sku: "", inventoryItemId: "", description: "", quantity: 1, unit: "und", unitPrice: 0, category: "product" })}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 rounded-md px-2.5 py-1.5 transition-colors"
          >
            <Plus size={12} /> Agregar item
          </button>
        </Section>

        {/* Totals */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col sm:flex-row gap-6 justify-between items-start">
          <div className="flex flex-col gap-3 min-w-[180px]">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Impuesto (%)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={100} step="0.1"
                  {...register("taxRate", { valueAsNumber: true })}
                  className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 text-right focus:border-amber-500 focus:outline-none"
                />
                <span className="text-xs text-zinc-500">%</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Anticipo requerido (%)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={100} step="1"
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value) || 0)}
                  className="w-20 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 text-right focus:border-amber-500 focus:outline-none"
                />
                <span className="text-xs text-zinc-500">%</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-64">
            <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
            <TotalRow label={`ISV (${Number(watchTaxRate) || 0}%)`} value={formatCurrency(taxAmount)} />
            <TotalRow label="Total" value={formatCurrency(totalFinal)} bold />
            <div className="border-t border-zinc-700 pt-2 mt-1">
              <TotalRow label={`Anticipo requerido (${depositPercent}%)`} value={formatCurrency(Math.round(totalFinal * depositPercent / 100))} />
              <TotalRow label="Saldo pendiente" value={formatCurrency(Math.max(0, balanceDue))} accent />
            </div>
          </div>
        </div>

        {/* Notes */}
        <Section title="Notas">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Notas para el cliente">
              <Textarea {...register("notes")} rows={3} />
            </Field>
            <Field label="Notas internas">
              <Textarea {...register("internalNotes")} rows={3} />
            </Field>
          </div>
        </Section>

        {serverError && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href={`/pedidos/${orderId}`}
            className="flex-1 flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
