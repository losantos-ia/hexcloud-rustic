"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  getQuotationById,
  listQuotationItems,
  updateQuotation,
  addQuotationItem,
  deleteQuotationItem,
} from "@/lib/firestore/quotations";
import type { Quotation, QuotationItem, QuotationSource, QuotationProjectType } from "@/types/quotation";
import {
  QUOTATION_SOURCE_LABELS,
  QUOTATION_PROJECT_TYPE_LABELS,
} from "@/types/quotation";
import { quotationSchema, type QuotationFormValues } from "@/lib/schemas/quotation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/context/currency-context";

const clean = (v?: string) => (v?.trim() === "" ? undefined : v?.trim());

function toDateInputValue(date?: Date): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export default function EditQuotationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [existingItems, setExistingItems] = useState<QuotationItem[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
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

  useEffect(() => {
    Promise.all([getQuotationById(id), listQuotationItems(id)]).then(([q, items]) => {
      if (!q) return;
      setExistingItems(items);
      reset({
        clientName: q.clientName,
        clientPhone: q.clientPhone,
        leadId: q.leadId ?? "",
        clientId: q.clientId ?? "",
        source: q.source,
        projectType: q.projectType,
        title: q.title,
        description: q.description ?? "",
        status: q.status,
        validUntil: toDateInputValue(q.validUntil),
        discountAmount: q.discountAmount,
        taxPercent: q.taxPercent ?? 0,
        depositPercentage: q.depositPercentage,
        estimatedDeliveryDays: q.estimatedDeliveryDays,
        notes: q.notes ?? "",
        internalNotes: q.internalNotes ?? "",
        items: items.length > 0
          ? items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              category: item.category,
              notes: item.notes ?? "",
            }))
          : [{ description: "", quantity: 1, unit: "und", unitPrice: 0, category: "materials" }],
      });
    }).finally(() => setLoading(false));
  }, [id, reset]);

  async function onSubmit(values: QuotationFormValues) {
    setServerError(null);
    try {
      // Delete old items and recreate
      for (const item of existingItems) {
        await deleteQuotationItem(item.id);
      }
      for (const item of values.items) {
        await addQuotationItem(id, {
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          category: item.category,
          notes: clean(item.notes),
        });
      }

      await updateQuotation(id, {
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
      });

      router.push(`/cotizaciones/${id}/pdf`);
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
            Editar cotización
          </h1>
          <p className="text-xs text-zinc-500">Modifica los datos de la cotización</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Client info */}
        <Section title="Información del cliente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del cliente *" error={errors.clientName?.message}>
              <Input {...register("clientName")} />
            </Field>
            <Field label="Teléfono *" error={errors.clientPhone?.message}>
              <Input {...register("clientPhone")} />
            </Field>
            <Field label="ID de lead (opcional)">
              <Input {...register("leadId")} />
            </Field>
            <Field label="ID de cliente (opcional)">
              <Input {...register("clientId")} />
            </Field>
          </div>
        </Section>

        {/* Project info */}
        <Section title="Encabezado del presupuesto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Canal *">
              <SelectField {...register("source")}>
                {(Object.keys(QUOTATION_SOURCE_LABELS) as QuotationSource[]).map((s) => (
                  <option key={s} value={s}>{QUOTATION_SOURCE_LABELS[s]}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="Categoría *">
              <SelectField {...register("projectType")}>
                {(Object.keys(QUOTATION_PROJECT_TYPE_LABELS) as QuotationProjectType[]).map((t) => (
                  <option key={t} value={t}>{QUOTATION_PROJECT_TYPE_LABELS[t]}</option>
                ))}
              </SelectField>
            </Field>
            <Field label="Estado">
              <SelectField {...register("status")}>
                <option value="draft">Borrador</option>
                <option value="sent">Enviada</option>
                <option value="rejected">Rechazada</option>
                <option value="expired">Vencida</option>
              </SelectField>
            </Field>
            <Field label="Título del presupuesto *" error={errors.title?.message} className="sm:col-span-3">
              <Input {...register("title")} />
            </Field>
            <Field label="Subtítulo / texto adicional" className="sm:col-span-3">
              <Textarea {...register("description")} rows={2} />
            </Field>
          </div>
        </Section>

        {/* Terms */}
        <Section title="Términos">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Válida hasta">
              <Input type="date" {...register("validUntil")} />
            </Field>
            <Field label="Días de entrega">
              <Input type="number" min={1} {...register("estimatedDeliveryDays", { valueAsNumber: true })} />
            </Field>
            <Field label="Descuento (COP)">
              <Input type="number" min={0} {...register("discountAmount", { valueAsNumber: true })} />
            </Field>
            <Field label="ISV / Impuestos (%)">
              <Input type="number" min={0} max={100} step="0.5" {...register("taxPercent", { valueAsNumber: true })} />
            </Field>
            <Field label="% Anticipo">
              <Input type="number" min={0} max={100} {...register("depositPercentage", { valueAsNumber: true })} />
            </Field>
          </div>
        </Section>

        {/* Items */}
        <Section title="Ítems">
          {typeof errors.items?.message === "string" && (
            <p className="text-xs text-red-400 -mt-2">{errors.items.message}</p>
          )}
          <div className="flex flex-col gap-2">
            <div className="hidden md:grid grid-cols-[1fr_80px_120px_100px_auto] gap-2 text-xs text-zinc-500 px-1">
              <span>Descripción *</span>
              <span>Cant. *</span>
              <span>PVP *</span>
              <span>Subt.</span>
              <span />
            </div>

            {fields.map((field, idx) => {
              const qty = Number(watchItems?.[idx]?.quantity) || 0;
              const price = Number(watchItems?.[idx]?.unitPrice) || 0;
              const lineTotal = qty * price;

              return (
                <div key={field.id} className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 flex flex-col gap-2 md:border-0 md:bg-transparent md:p-0">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_100px_auto] gap-2 items-start">
                    <div>
                      <Input {...register(`items.${idx}.description`)} placeholder="Descripción del ítem" />
                      {errors.items?.[idx]?.description && (
                        <p className="text-xs text-red-400 mt-0.5">{errors.items[idx]?.description?.message}</p>
                      )}
                    </div>
                    <Input type="number" min={0} step="0.01" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} placeholder="1" />
                    <Input type="number" min={0} {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} placeholder="0" />
                    <div className="flex items-center">
                      <span className="text-sm text-zinc-300">{formatCurrency(lineTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-2">
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

        {/* Totals preview */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex justify-end">
            <div className="flex flex-col gap-2 min-w-64">
              <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
              {Number(watchDiscount) > 0 && <TotalRow label="Descuento" value={`-${formatCurrency(Number(watchDiscount))}`} />}
              {taxAmount > 0 && <TotalRow label={`ISV (${Number(watchTaxPct)}%)`} value={formatCurrency(taxAmount)} />}
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
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
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

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function SelectField({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 [&>option]:bg-zinc-900">
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
