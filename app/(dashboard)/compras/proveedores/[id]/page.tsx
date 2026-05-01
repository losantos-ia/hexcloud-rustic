"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupplier, deleteSupplier, toggleSupplierActive } from "@/lib/firestore/purchases";
import type { Supplier } from "@/types/purchases";
import { SUPPLIER_CATEGORY_LABELS } from "@/types/purchases";

export default function ProveedorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupplier(id)
      .then(setSupplier)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await deleteSupplier(id);
    router.push("/compras/proveedores");
  }

  async function handleToggle() {
    if (!supplier) return;
    await toggleSupplierActive(id, !supplier.isActive);
    setSupplier((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
  }

  if (loading) return <div className="p-8 text-center text-zinc-500 text-sm">Cargando...</div>;
  if (!supplier) return <div className="p-8 text-center text-zinc-500 text-sm">Proveedor no encontrado.</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/compras/proveedores"
            className="size-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{supplier.name}</h1>
              {!supplier.isActive && (
                <span className="text-xs text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">Inactivo</span>
              )}
            </div>
            <p className="text-sm text-zinc-400">{SUPPLIER_CATEGORY_LABELS[supplier.category]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleToggle}
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:text-white"
          >
            {supplier.isActive ? "Desactivar" : "Activar"}
          </Button>
          <Button asChild size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
            <Link href={`/compras/proveedores/${id}/editar`}>
              <Pencil className="size-4 mr-1.5" /> Editar
            </Link>
          </Button>
          <Button
            onClick={handleDelete}
            size="sm"
            variant="outline"
            className="border-zinc-700 text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="size-4 mr-1.5" /> Eliminar
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
        {supplier.contactName && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Contacto</p>
            <p className="text-sm text-zinc-200">{supplier.contactName}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {supplier.phone && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Phone className="size-4 text-zinc-500 shrink-0" />
              {supplier.phone}
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Mail className="size-4 text-zinc-500 shrink-0" />
              {supplier.email}
            </div>
          )}
          {supplier.address && (
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <MapPin className="size-4 text-zinc-500 shrink-0" />
              {supplier.address}
            </div>
          )}
        </div>
        {supplier.notes && (
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Notas</p>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{supplier.notes}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Creado</p>
          <p className="text-sm text-zinc-400">{supplier.createdAt.toLocaleDateString("es-HN")}</p>
        </div>
      </div>
    </div>
  );
}
