"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listSuppliers, deleteSupplier, toggleSupplierActive } from "@/lib/firestore/purchases";
import type { Supplier } from "@/types/purchases";
import { SUPPLIER_CATEGORY_LABELS } from "@/types/purchases";

export default function ProveedoresPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    listSuppliers()
      .then(setSuppliers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchActive = showInactive || s.isActive;
    return matchSearch && matchCategory && matchActive;
  });

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await deleteSupplier(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setOpenMenuId(null);
  }

  async function handleToggleActive(s: Supplier) {
    await toggleSupplierActive(s.id, !s.isActive);
    setSuppliers((prev) => prev.map((sup) => sup.id === s.id ? { ...sup, isActive: !s.isActive } : sup));
    setOpenMenuId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/compras" className="text-zinc-400 hover:text-white transition-colors">
            <Users className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Proveedores</h1>
            <p className="text-sm text-zinc-400">Directorio de proveedores</p>
          </div>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold">
          <Link href="/compras/proveedores/nuevo">
            <Plus className="size-4 mr-1.5" />
            Nuevo proveedor
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-zinc-300">
            <Filter className="size-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(SUPPLIER_CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${showInactive ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}
        >
          {showInactive ? "Mostrando inactivos" : "Ocultar inactivos"}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-zinc-500 text-sm py-8">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-500 text-sm py-8">
          No hay proveedores{search || categoryFilter !== "all" ? " con los filtros aplicados" : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border bg-zinc-900 p-5 flex flex-col gap-3 transition-colors ${s.isActive ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-800/50 opacity-60"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{s.name}</p>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                    {SUPPLIER_CATEGORY_LABELS[s.category]}
                  </span>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {openMenuId === s.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                      <button
                        onClick={() => { router.push(`/compras/proveedores/${s.id}`); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        <Eye className="size-4" /> Ver detalle
                      </button>
                      <button
                        onClick={() => handleToggleActive(s)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        {s.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800"
                      >
                        <Trash2 className="size-4" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {s.contactName && (
                <p className="text-sm text-zinc-400">{s.contactName}</p>
              )}

              <div className="flex flex-col gap-1.5">
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Phone className="size-3 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
              </div>

              {!s.isActive && (
                <span className="text-xs text-zinc-600 italic">Inactivo</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
