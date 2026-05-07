"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { orderSchema, type OrderFormValues } from "@/lib/schemas/order";
import { getOrderById, listOrderItems, updateOrder, addOrderItem, deleteOrderItem } from "@/lib/firestore/orders";
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

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: "deposit_pending",
      priority: "medium",
      source: "direct",
      projectType: "custom",
      installationRequired: true,
      finalSalePrice: 0,
      depositRequired: 0,
      depositPaid: 0,
      items: [{ description: "", quantity: 1, unit: "und", unitPrice: 0, category: "product" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch("items");
  const watchFinalSalePrice = watch("finalSalePrice");
  const watchDepositPaid = watch("depositPaid");

  const subtotal = (watchItems ?? []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);
  const balanceDue = (Number(watchFinalSalePrice) || 0) - (Number(watchDepositPaid) || 0);

  // Auto-sync finalSalePrice with subtotal when items are modified
  useEffect(() => {
    if (!dirtyFields.items) return;
    setValue("finalSalePrice", subtotal, { shouldDirty: false });
  }, [subtotal, dirtyFields.items, setValue]);

  useEffect(() => {
    Promise.all([getOrderById(orderId), listOrderItems(orderId)])
      .then(([order, items]) => {
        if (!order) { setNotFound(true); return; }
        setExistingItemIds(items.map((i) => i.id));
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
                description: i.description,
                quantity: i.quantity,
                unit: i.unit,
                unitPrice: i.unitPrice,
                category: i.category,
                notes: i.notes ?? "",
              }))
            : [{ description: "", quantity: 1, unit: "und", unitPrice: 0, category: "product" }],
        });
      })
      .catch((err) => {
        console.error("Error loading order:", err);
        setLoadError("Error al cargar el pedido. Verifica tu conexión e intenta de nuevo.");
      })
      .finally(() => setLoading(false));
  }, [orderId, reset]);

  async function onSubmit(values: OrderFormValues) {
    setServerError(null);
    try {
      await updateOrder(orderId, {
        clientName: values.clientName.trim(),
        clientPhone: values.clientPhone.trim(),
        quotationId: clean(values.quotationId),
        leadId: clean(values.leadId),
        clientId: clean(values.clientId),
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
      });
      // Replace all items: delete existing, add new
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
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del cliente *" error={errors.clientName?.message}>
              <Input {...register("clientName")} placeholder="Nombre completo" />
            </Field>
            <Field label="Telefono *" error={errors.clientPhone?.message}>
              <Input {...register("clientPhone")} placeholder="+504 9999-9999" />
            </Field>
            <Field label="ID de lead (opcional)">
              <Input {...register("leadId")} placeholder="ID del lead en CRM" />
            </Field>
            <Field label="ID de cliente (opcional)">
              <Input {...register("clientId")} placeholder="ID del cliente" />
            </Field>
          </div>
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
            <Field label="Titulo del pedido *" error={errors.title?.message} className="sm:col-span-2">
              <Input {...register("title")} placeholder="Ej. Cabana 3 habitaciones - Finca La Esperanza" />
            </Field>
            <Field label="Descripcion" className="sm:col-span-2">
              <Textarea {...register("description")} rows={2} placeholder="Detalles adicionales del proyecto..." />
            </Field>
            <Field label="ID de cotizacion (opcional)">
              <Input {...register("quotationId")} placeholder="C20260001" />
            </Field>
            <Field label="ID de tienda (opcional)">
              <Input {...register("storeId")} placeholder="ID de tienda de origen" />
            </Field>
          </div>
        </Section>

        {/* Financial */}
        <Section title="Terminos financieros">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Precio de venta *" error={errors.finalSalePrice?.message} className="col-span-2 sm:col-span-2">
              <Input type="number" min={0} {...register("finalSalePrice", { valueAsNumber: true })} placeholder="0" />
            </Field>
            <Field label="Anticipo requerido" error={errors.depositRequired?.message}>
              <Input type="number" min={0} {...register("depositRequired", { valueAsNumber: true })} placeholder="0" />
            </Field>
            <Field label="Anticipo recibido" error={errors.depositPaid?.message}>
              <Input type="number" min={0} {...register("depositPaid", { valueAsNumber: true })} placeholder="0" />
            </Field>
          </div>
          <div className="rounded-lg bg-zinc-800/50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Saldo pendiente</span>
            <span className={`text-sm font-bold ${balanceDue > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {formatCurrency(Math.max(0, balanceDue))}
            </span>
          </div>
        </Section>

        {/* Delivery */}
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
            <Field label="Direccion de entrega" className="sm:col-span-2">
              <Input {...register("deliveryAddress")} placeholder="Direccion completa" />
            </Field>
            <Field label="Link Google Maps" className="sm:col-span-2">
              <Input {...register("googleMapsUrl")} placeholder="https://maps.google.com/..." />
            </Field>
          </div>
        </Section>

        {/* Items */}
        <Section title="Items del pedido">
          {typeof errors.items?.message === "string" && (
            <p className="text-xs text-red-400 -mt-2">{errors.items.message}</p>
          )}
          <div className="flex flex-col gap-2">
            <div className="hidden md:grid grid-cols-[1fr_80px_120px_100px_auto] gap-2 text-xs text-zinc-500 px-1">
              <span>Descripcion *</span>
              <span>Cant. *</span>
              <span>PVP *</span>
              <span>Subtotal</span>
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
                      <Input {...register(`items.${idx}.description`)} placeholder="Descripcion del item" />
                      {errors.items?.[idx]?.description && (
                        <p className="text-xs text-red-400 mt-0.5">{errors.items[idx]?.description?.message}</p>
                      )}
                    </div>
                    <Input type="number" min={0} step="0.01" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} placeholder="1" />
                    <Input type="number" min={0} {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })} placeholder="0" />
                    <div className="flex items-center">
                      <span className="text-sm text-zinc-300">{formatCurrency(lineTotal)}</span>
                    </div>
                    <div className="flex items-center justify-end">
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
                    placeholder="Notas del item (opcional)"
                    rows={2}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-y min-h-[2.5rem]"
                  />
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => append({ description: "", quantity: 1, unit: "und", unitPrice: 0, category: "product" })}
              className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-xs text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
            >
              <Plus size={13} /> Agregar item
            </button>
          </div>
        </Section>

        {/* Totals */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex justify-end">
            <div className="flex flex-col gap-2 min-w-64">
              <TotalRow label="Subtotal items" value={formatCurrency(subtotal)} />
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
