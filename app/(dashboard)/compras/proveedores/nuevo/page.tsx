"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupplier } from "@/lib/firestore/purchases";
import { supplierSchema, type SupplierFormValues } from "@/lib/schemas/purchases";
import { SUPPLIER_CATEGORY_LABELS } from "@/types/purchases";

export default function NuevoProveedorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const supplierNameParam = searchParams.get("supplierName") ?? "";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { category: "general", name: supplierNameParam },
  });

  useEffect(() => {
    if (supplierNameParam) setValue("name", supplierNameParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: SupplierFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const id = await createSupplier(values);
      if (returnTo) {
        router.push(`${returnTo}?supplierId=${id}&supplierName=${encodeURIComponent(values.name)}`);
      } else {
        router.push(`/compras/proveedores/${id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear el proveedor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={returnTo ?? "/compras/proveedores"}
          className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Nuevo proveedor</h1>
          <p className="text-sm text-zinc-400">
            {returnTo ? "Crear y volver al formulario" : "Agrega un proveedor al directorio"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Información del proveedor</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Nombre de la empresa *</Label>
              <Input
                {...register("name")}
                placeholder="Ej. Maderería Nacional"
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Nombre del contacto</Label>
              <Input
                {...register("contactName")}
                placeholder="Nombre de la persona de contacto"
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Categoría *</Label>
              <Select
                defaultValue="general"
                onValueChange={(v) => setValue("category", v as SupplierFormValues["category"])}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Teléfono</Label>
              <Input
                {...register("phone")}
                placeholder="+504 0000-0000"
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Correo electrónico</Label>
              <Input
                {...register("email")}
                type="email"
                placeholder="correo@proveedor.com"
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Dirección</Label>
              <Input
                {...register("address")}
                placeholder="Dirección física"
                className="bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea
                {...register("notes")}
                placeholder="Condiciones de pago, tiempos de entrega, etc."
                rows={3}
                className="resize-y bg-zinc-950 border-zinc-800 text-zinc-200"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button asChild variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
            <Link href={returnTo ?? "/compras/proveedores"}>Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          >
            {submitting ? "Guardando..." : returnTo ? "Guardar y volver" : "Crear proveedor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
