"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { getSupplier, updateSupplier } from "@/lib/firestore/purchases";
import { supplierSchema, type SupplierFormValues } from "@/lib/schemas/purchases";
import { SUPPLIER_CATEGORY_LABELS } from "@/types/purchases";

export default function EditarProveedorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
  });

  useEffect(() => {
    getSupplier(id).then((s) => {
      if (s) {
        reset({
          name: s.name,
          contactName: s.contactName ?? "",
          phone: s.phone ?? "",
          email: s.email ?? "",
          address: s.address ?? "",
          category: s.category,
          notes: s.notes ?? "",
        });
      }
      setLoading(false);
    });
  }, [id, reset]);

  async function onSubmit(values: SupplierFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await updateSupplier(id, values);
      router.push(`/compras/proveedores/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar el proveedor");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-zinc-500 text-sm">Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/compras/proveedores/${id}`}
          className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Editar proveedor</h1>
          <p className="text-sm text-zinc-400">Actualiza la información del proveedor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Nombre *</Label>
              <Input {...register("name")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Contacto</Label>
              <Input {...register("contactName")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Categoría *</Label>
              <Select
                onValueChange={(v) => setValue("category", v as SupplierFormValues["category"])}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Teléfono</Label>
              <Input {...register("phone")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Correo</Label>
              <Input {...register("email")} type="email" className="bg-zinc-950 border-zinc-800 text-zinc-200" />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Dirección</Label>
              <Input {...register("address")} className="bg-zinc-950 border-zinc-800 text-zinc-200" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea {...register("notes")} rows={3} className="resize-y bg-zinc-950 border-zinc-800 text-zinc-200" />
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
            <Link href={`/compras/proveedores/${id}`}>Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold"
          >
            {submitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
