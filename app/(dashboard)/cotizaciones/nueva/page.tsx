"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Trash2, Search, X } from "lucide-react";
import Link from "next/link";
import { quotationSchema, type QuotationFormValues } from "@/lib/schemas/quotation";
import { createQuotation } from "@/lib/firestore/quotations";
import { listClients } from "@/lib/firestore/clients";
import type { Client } from "@/types/client";
import {
  QUOTATION_SOURCE_LABELS,
  QUOTATION_PROJECT_TYPE_LABELS,
  QUOTATION_ITEM_CATEGORY_LABELS,
} from "@/types/quotation";
import type { QuotationSource, QuotationProjectType, QuotationItemCategory } from "@/types/quotation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/context/currency-context";

const clean = (v?: string) => (v?.trim() === "" ? undefined : v?.trim());

const UNITS = ["und", "m²", "m³", "m", "kg", "hr", "gl", "kit"];

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [serverError, setServerError] = useState<string | null>(null);

  // ── Client search ──
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listClients().then(setClients);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredClients = clientSearch.trim().length > 0
    ? clients.filter((c) =>
        c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.documentId?.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients.slice(0, 8);

  function pickClient(c: Client) {
    setSelectedClient(c);
    setClientSearch(c.fullName);
    setShowDropdown(false);
    setValue("clientName", c.fullName, { shouldValidate: true });
    setValue("clientPhone", c.phone ?? "", { shouldValidate: true });
    setValue("clientId", c.id);
  }

  function clearClient() {
    setSelectedClient(null);
    setClientSearch("");
    setValue("clientName", "");
    setValue("clientPhone", "");
    setValue("clientId", "");
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      source: "direct",
      projectType: "cabin",
      status: "draft",
      discountAmount: 0,
      taxPercent: 0,
      items: [{ description: "", quantity: 1, unit: "und", unitPrice: 0, category: "materials" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchItems = watch("items");
  const watchDiscount = watch("discountAmount") ?? 0;
  const watchTaxPct = watch("taxPercent") ?? 0;
  const watchDepositPct = watch("depositPercentage");

  const subtotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0) ?? 0;
  const taxAmount = subtotal * (Number(watchTaxPct) || 0) / 100;
  const total = subtotal - (Number(watchDiscount) || 0) + taxAmount;
  const depositAmount = watchDepositPct ? (total * Number(watchDepositPct)) / 100 : 0;

  const onItemChange = useCallback(
    (idx: number, field: "quantity" | "unitPrice", value: number) => {
      const items = watchItems ?? [];
      const qty = field === "quantity" ? value : Number(items[idx]?.quantity) || 0;
      const price = field === "unitPrice" ? value : Number(items[idx]?.unitPrice) || 0;
      setValue(`items.${idx}.${field}`, value as never);
      // total is computed on the fly, no need to store separately
    },
    [watchItems, setValue]
  );

  async function onSubmit(values: QuotationFormValues) {
    setServerError(null);
    try {
      const items = values.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: clean(item.notes),
      }));

      const id = await createQuotation({
        clientName: values.clientName.trim(),
        clientPhone: values.clientPhone.trim(),
        leadId: clean(values.leadId),
        clientId: clean(values.clientId),
        source: values.source,
        projectType: values.projectType,
        title: values.title.trim(),
        description: clean(values.description),
        status: values.status,
        validUntil: values.validUntil ? new Date(values.validUntil) : undefined,
        subtotal,
        discountAmount: Number(values.discountAmount) || 0,
        taxPercent: Number(values.taxPercent) || 0,
        taxAmount,
        total,
        depositPercentage: values.depositPercentage ? Number(values.depositPercentage) : undefined,
        depositAmount: depositAmount || undefined,
        estimatedDeliveryDays: values.estimatedDeliveryDays ? Number(values.estimatedDeliveryDays) : undefined,
        notes: clean(values.notes),
        internalNotes: clean(values.internalNotes),
        items,
      });
      router.push(`/cotizaciones/${id}`);
    } catch {
      setServerError("Error al crear la cotización. Intenta de nuevo.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cotizaciones"
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Nueva cotización
          </h1>
          <p className="text-xs text-zinc-500">Completa la información para generar la cotización</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Client info */}
        <Section title="Información del cliente">
          {/* Client search combobox */}
          <div ref={searchRef} className="relative">
            <Label>Buscar cliente existente</Label>
            <div className="relative mt-1.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true); setSelectedClient(null); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Buscar por nombre, teléfono o ID…"
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
                      <span className="text-xs text-zinc-500">{c.phone}{c.documentId ? ` · ${c.documentId}` : ""}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && clientSearch.trim().length > 0 && filteredClients.length === 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-xs text-zinc-500">
                Sin resultados. Completa los datos manualmente abajo.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del cliente *" error={errors.clientName?.message}>
              <Input {...register("clientName")} placeholder="Ej. Juan Pérez" />
            </Field>
            <Field label="Teléfono *" error={errors.clientPhone?.message}>
              <Input {...register("clientPhone")} placeholder="+57 300 000 0000" />
            </Field>
            <Field label="ID de lead (opcional)">
              <Input {...register("leadId")} placeholder="ID del CRM" />
            </Field>
            <Field label="ID de cliente (opcional)">
              <Input {...register("clientId")} placeholder="ID de Clientes" />
            </Field>
          </div>
        </Section>

        {/* Project info */}
        <Section title="Información del proyecto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Canal *" error={errors.source?.message}>
              <Select {...register("source")}>
                {(Object.keys(QUOTATION_SOURCE_LABELS) as QuotationSource[]).map((s) => (
                  <option key={s} value={s}>{QUOTATION_SOURCE_LABELS[s]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo de proyecto *" error={errors.projectType?.message}>
              <Select {...register("projectType")}>
                {(Object.keys(QUOTATION_PROJECT_TYPE_LABELS) as QuotationProjectType[]).map((t) => (
                  <option key={t} value={t}>{QUOTATION_PROJECT_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Estado inicial">
              <Select {...register("status")}>
                <option value="draft">Borrador</option>
                <option value="sent">Enviada</option>
              </Select>
            </Field>
            <Field label="Título *" error={errors.title?.message} className="sm:col-span-3">
              <Input {...register("title")} placeholder="Ej. Construcción de cabaña 4x6m" />
            </Field>
            <Field label="Descripción" className="sm:col-span-3">
              <Textarea {...register("description")} placeholder="Descripción detallada del proyecto..." rows={2} />
            </Field>
          </div>
        </Section>

        {/* Terms */}
        <Section title="Términos y condiciones">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Válida hasta">
              <Input type="date" {...register("validUntil")} />
            </Field>
            <Field label="Días de entrega estimados">
              <Input
                type="number"
                min={1}
                {...register("estimatedDeliveryDays", { valueAsNumber: true })}
                placeholder="Ej. 30"
              />
            </Field>
            <Field label="Descuento (COP)">
              <Input
                type="number"
                min={0}
                {...register("discountAmount", { valueAsNumber: true })}
                placeholder="0"
              />
            </Field>
            <Field label="ISV / Impuestos (%)">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                {...register("taxPercent", { valueAsNumber: true })}
                placeholder="0"
              />
            </Field>
            <Field label="% Anticipo">
              <Input
                type="number"
                min={0}
                max={100}
                {...register("depositPercentage", { valueAsNumber: true })}
                placeholder="50"
              />
            </Field>
          </div>
        </Section>

        {/* Items */}
        <Section title="Ítems de la cotización">
          {errors.items?.root && (
            <p className="text-xs text-red-400 -mt-2">{errors.items.root.message}</p>
          )}
          {typeof errors.items?.message === "string" && (
            <p className="text-xs text-red-400 -mt-2">{errors.items.message}</p>
          )}

          <div className="flex flex-col gap-2">
            {/* Header row (desktop) */}
            <div className="hidden md:grid grid-cols-[1fr_80px_90px_120px_130px_auto] gap-2 text-xs text-zinc-500 px-1">
              <span>Descripción *</span>
              <span>Cant. *</span>
              <span>Unidad *</span>
              <span>Precio unit. *</span>
              <span>Categoría</span>
              <span />
            </div>

            {fields.map((field, idx) => {
              const qty = Number(watchItems?.[idx]?.quantity) || 0;
              const price = Number(watchItems?.[idx]?.unitPrice) || 0;
              const lineTotal = qty * price;

              return (
                <div key={field.id} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 flex flex-col gap-2 md:border-0 md:bg-transparent md:p-0">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_90px_120px_130px_auto] gap-2 items-start">
                    <div>
                      <Input
                        {...register(`items.${idx}.description`)}
                        placeholder="Descripción del ítem"
                      />
                      {errors.items?.[idx]?.description && (
                        <p className="text-xs text-red-400 mt-0.5">{errors.items[idx]?.description?.message}</p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                      placeholder="1"
                    />
                    <Controller
                      control={control}
                      name={`items.${idx}.unit`}
                      render={({ field: f }) => (
                        <select
                          {...f}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      )}
                    />
                    <Input
                      type="number"
                      min={0}
                      {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <Controller
                      control={control}
                      name={`items.${idx}.category`}
                      render={({ field: f }) => (
                        <select
                          {...f}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
                        >
                          {(Object.keys(QUOTATION_ITEM_CATEGORY_LABELS) as QuotationItemCategory[]).map((c) => (
                            <option key={c} value={c}>{QUOTATION_ITEM_CATEGORY_LABELS[c]}</option>
                          ))}
                        </select>
                      )}
                    />
                    <div className="flex items-center justify-between md:justify-end gap-2">
                      <span className="text-xs font-medium text-zinc-300 md:hidden">{formatCurrency(lineTotal)}</span>
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                        className="size-7 flex items-center justify-center rounded-lg border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {/* Line total (desktop) */}
                  <div className="hidden md:flex justify-end">
                    <span className="text-xs text-zinc-400">{formatCurrency(lineTotal)}</span>
                  </div>
                  {/* Notes */}
                  <textarea
                    {...register(`items.${idx}.notes`)}
                    placeholder="Notas del ítem (opcional)"
                    rows={2}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-y min-h-[2.5rem]"
                  />
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => append({ description: "", quantity: 1, unit: "und", unitPrice: 0, category: "materials" })}
              className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-xs text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
            >
              <Plus size={13} /> Agregar ítem
            </button>
          </div>
        </Section>

        {/* Totals */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex justify-end">
            <div className="flex flex-col gap-2 min-w-64">
              <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
              {Number(watchDiscount) > 0 && (
                <TotalRow label="Descuento" value={`-${formatCurrency(Number(watchDiscount))}`} />
              )}
              {taxAmount > 0 && (
                <TotalRow label={`ISV (${Number(watchTaxPct)}%)`} value={formatCurrency(taxAmount)} />
              )}
              <div className="border-t border-zinc-700 pt-2 mt-1">
                <TotalRow label="Total" value={formatCurrency(total)} bold />
              </div>
              {depositAmount > 0 && (
                <TotalRow label={`Anticipo (${watchDepositPct}%)`} value={formatCurrency(depositAmount)} accent />
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <Section title="Notas">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Notas para el cliente">
              <Textarea {...register("notes")} placeholder="Condiciones, observaciones..." rows={3} />
            </Field>
            <Field label="Notas internas">
              <Textarea {...register("internalNotes")} placeholder="Solo visible internamente..." rows={3} />
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
            href="/cotizaciones"
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
            {isSubmitting ? "Guardando…" : "Crear cotización"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

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
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 [&>option]:bg-zinc-900"
    >
      {children}
    </select>
  );
}

function TotalRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${bold ? "font-semibold text-zinc-100" : "text-zinc-500"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-zinc-100" : accent ? "font-medium text-amber-400" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}
