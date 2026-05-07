"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Trash2, Search, X, ShoppingCart, Package } from "lucide-react";
import Link from "next/link";
import { orderSchema, type OrderFormValues } from "@/lib/schemas/order";
import { createOrder } from "@/lib/firestore/orders";
import { getQuotationById, listQuotationItems, updateQuotation } from "@/lib/firestore/quotations";
import { listClients, getClientById } from "@/lib/firestore/clients";
import { listInventoryItems } from "@/lib/firestore/inventory";
import type { InventoryItem } from "@/types/inventory";
import type { Client } from "@/types/client";
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

function Field({
  label, error, children, className,
}: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
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

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQuotationId = searchParams.get("fromQuotation");
  const returnClientId = searchParams.get("clientId");
  const { formatCurrency } = useCurrency();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fromQuotationNumber, setFromQuotationNumber] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchPopupIndex, setSearchPopupIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { listClients().then(setClients); listInventoryItems().then(setInventoryItems); }, []);

  // Auto-select client when returning from create-client flow
  useEffect(() => {
    if (!returnClientId) return;
    getClientById(returnClientId).then((c) => {
      if (!c) return;
      setSelectedClient(c);
      setClientSearch(c.fullName);
      setValue("clientName", c.fullName);
      setValue("clientPhone", c.phone);
      setValue("clientId", c.id);
      setValue("clientDocumentId", c.documentId ?? "");
      setValue("clientAddress", c.address ?? "");
      setValue("clientCity", c.city ?? "");
      setValue("clientDepartment", c.department ?? "");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnClientId]);

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
    control,
    watch,
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
      depositRequired: 0,
      depositPaid: 0,
      items: [{ description: "", quantity: 1, unit: "und", unitPrice: 0, category: "product" }],
    },
  });

  // Pre-fill form from quotation when converting
  useEffect(() => {
    if (!fromQuotationId) return;
    Promise.all([getQuotationById(fromQuotationId), listQuotationItems(fromQuotationId)]).then(
      ([q, qItems]) => {
        if (!q) return;
        setFromQuotationNumber(q.quotationNumber);
        setClientSearch(q.clientName);
        const mapCat = (cat: string) =>
          (cat === "materials" ? "material" : cat) as OrderFormValues["items"][number]["category"];
        const addressParts = [q.clientAddress, q.clientCity, q.clientDepartment].filter(Boolean);
        const deliveryAddress = addressParts.length > 0 ? addressParts.join(", ") : "";
        const depositRequired = q.depositAmount
          ? q.depositAmount
          : q.depositPercentage
          ? Math.round((q.total * q.depositPercentage) / 100)
          : 0;
        reset({
          clientName: q.clientName,
          clientPhone: q.clientPhone,
          clientId: q.clientId ?? "",
          clientDocumentId: q.clientDocumentId ?? "",
          clientAddress: q.clientAddress ?? "",
          clientCity: q.clientCity ?? "",
          clientDepartment: q.clientDepartment ?? "",
          quotationId: q.quotationNumber,
          source: "quotation",
          projectType: q.projectType as OrderFormValues["projectType"],
          title: q.title,
          description: q.description ?? "",
          status: "deposit_pending",
          priority: "medium",
          finalSalePrice: q.total,
          depositRequired,
          depositPaid: 0,
          installationRequired: true,
          deliveryAddress,
          notes: q.notes ?? "",
          internalNotes: q.internalNotes ?? "",
          items: qItems.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit: i.unit ?? "und",
            unitPrice: i.unitPrice,
            category: mapCat(i.category),
            notes: i.notes ?? "",
          })),
        });
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromQuotationId]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const watchFinalSalePrice = watch("finalSalePrice");
  const watchDepositPaid = watch("depositPaid");
  const watchInstallation = watch("installationRequired");

  const subtotal = (watchItems ?? []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);
  const balanceDue = (Number(watchFinalSalePrice) || 0) - (Number(watchDepositPaid) || 0);

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
      const id = await createOrder({
        clientName: values.clientName.trim(),
        clientPhone: values.clientPhone.trim(),
        quotationId: clean(values.quotationId),
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
        promisedDeliveryDate: values.promisedDeliveryDate ? new Date(values.promisedDeliveryDate) : undefined,
        installationRequired: values.installationRequired,
        deliveryAddress: clean(values.deliveryAddress),
        googleMapsUrl: clean(values.googleMapsUrl),
        notes: clean(values.notes),
        internalNotes: clean(values.internalNotes),
        items: values.items,
      });
      if (fromQuotationId) {
        await updateQuotation(fromQuotationId, { status: "converted_to_order" });
      }
      router.push(`/pedidos/${id}`);
    } catch {
      setServerError("Error al crear el pedido. Intenta de nuevo.");
    }
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
                  placeholder="Buscar por nombre o código (SKU)…"
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
          href="/pedidos"
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Nuevo pedido
          </h1>
          <p className="text-xs text-zinc-500">Registra un pedido confirmado o en proceso de anticipo</p>
        </div>
      </div>

      {fromQuotationNumber && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <ShoppingCart size={14} />
          Convirtiendo la cotización{" "}
          <span className="font-mono font-semibold">{fromQuotationNumber}</span>{" "}
          en pedido. Revisa y ajusta los datos antes de guardar.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Client info */}
        <Section title="Información del cliente">
          {/* Client search */}
          <div ref={searchRef} className="relative">
            <Label>Buscar cliente existente</Label>
            <div className="relative mt-1.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); setSelectedClient(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar por nombre o teléfono…"
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
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">No se encontró ningún cliente.</span>
                <Link
                  href={`/clientes/nuevo?returnTo=/pedidos/nuevo`}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                >
                  + Crear cliente
                </Link>
              </div>
            )}
          </div>

          {selectedClient ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              <span className="font-medium">Cliente seleccionado:</span>
              <span>{selectedClient.fullName}</span>
              <span className="text-zinc-500">({selectedClient.phone})</span>
            </div>
          ) : (
            errors.clientName && (
              <p className="text-xs text-red-400">Selecciona un cliente para continuar.</p>
            )
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
            <Field label="Nº de cotización (opcional)">
              <Input
                {...register("quotationId")}
                placeholder="C20260001"
                readOnly={!!fromQuotationId}
                className={fromQuotationId ? "opacity-60 cursor-default" : ""}
              />
            </Field>
            <Field label="ID de tienda (opcional)">
              <Input {...register("storeId")} placeholder="ID de tienda de origen" />
            </Field>
          </div>
        </Section>

        {/* Delivery */}
        <Section title="Entrega e instalación">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha de entrega prometida">
              <DatePicker value={watch("promisedDeliveryDate")} onChange={(v) => setValue("promisedDeliveryDate", v || undefined)} />
            </Field>
            <Field label="¿Requiere instalación?">
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="installationRequired"
                  {...register("installationRequired")}
                  className="size-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="installationRequired" className="text-sm text-zinc-300">Sí, requiere instalación</label>
              </div>
            </Field>
            {watchInstallation && (
              <>
                <Field label="Dirección de entrega" className="sm:col-span-2">
                  <Input {...register("deliveryAddress")} placeholder="Dirección completa" />
                </Field>
                <Field label="Link Google Maps" className="sm:col-span-2">
                  <Input {...register("googleMapsUrl")} placeholder="https://maps.google.com/..." />
                </Field>
              </>
            )}
          </div>
        </Section>

        {/* Items */}
        <Section title="Ítems del pedido">
          {typeof errors.items?.message === "string" && (
            <p className="text-xs text-red-400 -mt-2">{errors.items.message}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left text-xs text-zinc-500 font-normal pb-2 pr-3 w-36">Código</th>
                  <th className="text-left text-xs text-zinc-500 font-normal pb-2 pr-3">Descripción *</th>
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
                              placeholder="SKU…"
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
                        <input
                          {...register(`items.${idx}.description`)}
                          placeholder="Descripción del ítem…"
                          className={cellCls}
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
            <Plus size={12} /> Agregar ítem
          </button>
        </Section>

        {/* Totals */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex justify-end">
            <div className="flex flex-col gap-2 min-w-64">
              <TotalRow label="Subtotal ítems" value={formatCurrency(subtotal)} />
              <TotalRow label="Precio de venta final" value={formatCurrency(Number(watchFinalSalePrice) || 0)} bold />
              <div className="border-t border-zinc-700 pt-2 mt-1">
                <TotalRow label="Anticipo recibido" value={formatCurrency(Number(watchDepositPaid) || 0)} />
                <TotalRow label="Saldo pendiente" value={formatCurrency(Math.max(0, balanceDue))} accent />
              </div>
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
            href="/pedidos"
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
            {isSubmitting ? "Guardando..." : fromQuotationId ? "Crear pedido desde cotización" : "Crear pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
