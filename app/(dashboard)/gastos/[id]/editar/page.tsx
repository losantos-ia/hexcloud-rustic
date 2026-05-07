"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { expenseSchema, type ExpenseFormValues } from "@/lib/schemas/expenses";
import { getExpenseById, updateExpense } from "@/lib/firestore/expenses";
import { listInventoryLocations } from "@/lib/firestore/inventory";
import type { InventoryLocation } from "@/types/inventory";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
} from "@/types/expenses";

const selectCls =
  "h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500";

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
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function EditarGastoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  useEffect(() => {
    Promise.all([getExpenseById(id), listInventoryLocations()])
      .then(([expense, locs]) => {
        setLocations(locs);
        if (!expense) { setLoadError("Gasto no encontrado."); return; }
        reset({
          date: expense.date.toISOString().split("T")[0],
          dueDate: expense.dueDate ? expense.dueDate.toISOString().split("T")[0] : "",
          invoiceNumber: expense.invoiceNumber ?? "",
          category: expense.category,
          amount: expense.amount,
          locationId: expense.locationId,
          locationName: expense.locationName,
          description: expense.description ?? "",
          paymentMethod: expense.paymentMethod,
          supplierName: expense.supplierName ?? "",
          receiptUrl: expense.receiptUrl ?? "",
          notes: expense.notes ?? "",
        });
      })
      .catch(() => setLoadError("Error al cargar el gasto."))
      .finally(() => setLoading(false));
  }, [id, reset]);

  const locationId = watch("locationId");
  useEffect(() => {
    const loc = locations.find((l) => l.id === locationId);
    if (loc) setValue("locationName", loc.name);
  }, [locationId, locations, setValue]);

  async function onSubmit(values: ExpenseFormValues) {
    setServerError(null);
    try {
      await updateExpense(id, values);
      router.push(`/gastos/${id}`);
    } catch {
      setServerError("Error al actualizar el gasto. Inténtalo de nuevo.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-500 text-sm">
        Cargando…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-500">
        <p className="text-sm">{loadError}</p>
        <Link href="/gastos" className="text-xs text-amber-400 hover:text-amber-300">
          ← Volver a gastos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/gastos/${id}`} className="text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Editar gasto</h1>
          <p className="text-xs text-zinc-500">Modifica los datos del gasto</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start"
      >
        {/* ── Left: document card ── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">

          {/* Proveedor */}
          <div className="px-6 py-5">
            <label className="block text-xs text-zinc-400 mb-1.5">Proveedor / Pagado a</label>
            <input
              {...register("supplierName")}
              placeholder="Ej. ENEE, propietario, arrendador…"
              className="w-full bg-transparent text-lg text-zinc-100 placeholder-zinc-600 border-b border-zinc-700 focus:border-amber-500 focus:outline-none pb-1 transition-colors"
            />
            {errors.supplierName && (
              <p className="text-xs text-red-400 mt-1">{errors.supplierName.message}</p>
            )}
          </div>

          {/* Nº factura + fechas */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Nº de factura / referencia" error={errors.invoiceNumber?.message}>
              <Input placeholder="FAC-001, RF-2026…" {...register("invoiceNumber")} />
            </Field>
            <Field label="Fecha de emisión *" error={errors.date?.message}>
              <Input type="date" {...register("date")} />
            </Field>
            <Field label="Fecha de vencimiento" error={errors.dueDate?.message}>
              <Input type="date" {...register("dueDate")} />
            </Field>
          </div>

          {/* Categoría + Método de pago */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoría *" error={errors.category?.message}>
              <select {...register("category")} className={selectCls}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </Field>
            <Field label="Método de pago *" error={errors.paymentMethod?.message}>
              <select {...register("paymentMethod")} className={selectCls}>
                {EXPENSE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{EXPENSE_PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Ubicación */}
          <div className="px-6 py-5">
            <Field label="Ubicación *" error={errors.locationId?.message}>
              <select {...register("locationId")} className={selectCls}>
                <option value="">Selecciona una ubicación…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Descripción + Notas */}
          <div className="px-6 py-5 flex flex-col gap-4">
            <Field label="Descripción" error={errors.description?.message}>
              <Input placeholder="Ej. Pago mensual de luz del taller" {...register("description")} />
            </Field>
            <Field label="Notas" error={errors.notes?.message}>
              <Textarea
                placeholder="Observaciones adicionales…"
                rows={3}
                {...register("notes")}
              />
            </Field>
          </div>
        </div>

        {/* ── Right: sidebar ── */}
        <div className="flex flex-col gap-4">
          {/* Amount card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs text-zinc-500 mb-3">Monto total *</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-light text-zinc-500">L</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
                className="w-full bg-transparent text-3xl font-bold text-zinc-100 placeholder-zinc-700 focus:outline-none"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-400 mt-2">{errors.amount.message}</p>
            )}
          </div>

          {/* Comprobante */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <Field label="URL del comprobante / recibo" error={errors.receiptUrl?.message}>
              <Input type="url" placeholder="https://…" {...register("receiptUrl")} />
            </Field>
          </div>

          {/* Error */}
          {serverError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {serverError}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Link href={`/gastos/${id}`} className="w-full">
              <Button type="button" variant="outline" className="w-full">
                Cancelar
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
