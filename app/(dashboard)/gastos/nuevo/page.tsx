"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { expenseSchema, type ExpenseFormValues } from "@/lib/schemas/expenses";
import { createExpense } from "@/lib/firestore/expenses";
import { listInventoryLocations } from "@/lib/firestore/inventory";
import type { InventoryLocation } from "@/types/inventory";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
} from "@/types/expenses";

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

export default function NuevoGastoPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  useEffect(() => {
    listInventoryLocations().then(setLocations);
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: today,
      category: "other",
      paymentMethod: "cash",
    },
  });

  // When location changes, store its name too
  const locationId = watch("locationId");
  useEffect(() => {
    const loc = locations.find((l) => l.id === locationId);
    if (loc) setValue("locationName", loc.name);
  }, [locationId, locations, setValue]);

  async function onSubmit(values: ExpenseFormValues) {
    setServerError(null);
    try {
      const id = await createExpense(values);
      router.push(`/gastos/${id}`);
    } catch {
      setServerError("Error al registrar el gasto. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/gastos" className="text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Registrar gasto</h1>
          <p className="text-xs text-zinc-500">Nuevo gasto operacional</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Main info */}
        <Section title="Información del gasto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha *" error={errors.date?.message}>
              <Input type="date" {...register("date")} />
            </Field>
            <Field label="Monto *" error={errors.amount?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoría *" error={errors.category?.message}>
              <select
                {...register("category")}
                className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </Field>
            <Field label="Método de pago *" error={errors.paymentMethod?.message}>
              <select
                {...register("paymentMethod")}
                className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                {EXPENSE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{EXPENSE_PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Ubicación *" error={errors.locationId?.message}>
            <select
              {...register("locationId")}
              className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">Selecciona una ubicación…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Descripción" error={errors.description?.message}>
            <Input
              placeholder="Ej. Pago mensual de luz del taller"
              {...register("description")}
            />
          </Field>
        </Section>

        {/* Optional details */}
        <Section title="Detalles adicionales (opcional)">
          <Field label="Proveedor / Pagado a" error={errors.supplierName?.message}>
            <Input placeholder="Ej. ENEE, propietario, etc." {...register("supplierName")} />
          </Field>
          <Field label="URL del recibo / comprobante" error={errors.receiptUrl?.message}>
            <Input
              type="url"
              placeholder="https://..."
              {...register("receiptUrl")}
            />
          </Field>
          <Field label="Notas" error={errors.notes?.message}>
            <Textarea
              placeholder="Observaciones adicionales…"
              rows={3}
              {...register("notes")}
            />
          </Field>
        </Section>

        {serverError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
            {serverError}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/gastos">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Registrar gasto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
