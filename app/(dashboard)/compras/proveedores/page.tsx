"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Eye,
  Pencil,
  Phone,
  Mail,
  Users,
  UserCheck,
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
      (s.contactName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.rtn ?? "").toLowerCase().includes(search.toLowerCase());
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

  const totalActive = suppliers.filter((s) => s.isActive).length;
  const totalWithContact = suppliers.filter((s) => s.contactName).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Truck className="size-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Gestión de Proveedores</h1>
            <p className="text-xs text-zinc-400">Administra todos tus proveedores y contactos</p>
          </div>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shrink-0">
          <Link href="/compras/proveedores/nuevo">
            <Plus className="size-4 mr-1.5" />
            Nuevo Proveedor
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Proveedores", value: suppliers.length, icon: Truck },
          { label: "Con Contacto", value: totalWithContact, icon: UserCheck },
          { label: "Activos", value: totalActive, icon: Users },
          { label: "Categorías", value: Object.keys(SUPPLIER_CATEGORY_LABELS).length, icon: Filter },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Icon className="size-3.5" />{label}
            </div>
            <p className="text-2xl font-bold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nombre, RTN, contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-800 text-zinc-300">
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

      {/* List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="text-center text-zinc-500 text-sm py-12">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12">
            No hay proveedores{search || categoryFilter !== "all" ? " con los filtros aplicados" : ""}
          </div>
        ) : (
          <>
            {filtered.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/50 transition-colors cursor-pointer ${i !== 0 ? "border-t border-zinc-800" : ""} ${!s.isActive ? "opacity-50" : ""}`}
                onClick={() => router.push(`/compras/proveedores/${s.id}`)}
              >
                {/* Icon */}
                <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Truck className="size-4 text-zinc-400" />
                </div>

                {/* Name + category + RTN */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-100 truncate">{s.name}</span>
                    {s.rtn && <span className="text-xs text-zinc-500 font-mono">{s.rtn}</span>}
                    <span className="text-xs bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5 shrink-0">
                      {SUPPLIER_CATEGORY_LABELS[s.category]}
                    </span>
                    {!s.isActive && (
                      <span className="text-xs text-zinc-600 italic">Inactivo</span>
                    )}
                  </div>
                  {s.contactName && (
                    <p className="text-xs text-zinc-500 mt-0.5">{s.contactName}</p>
                  )}
                </div>

                {/* Contact info */}
                <div className="hidden sm:flex flex-col gap-1 items-end shrink-0">
                  {s.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Phone className="size-3" />{s.phone}
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Mail className="size-3" /><span className="truncate max-w-[160px]">{s.email}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {openMenuId === s.id && (
                    <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                      <button
                        onClick={() => { router.push(`/compras/proveedores/${s.id}`); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        <Eye className="size-4" /> Ver detalle
                      </button>
                      <button
                        onClick={() => { router.push(`/compras/proveedores/${s.id}/editar`); setOpenMenuId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        <Pencil className="size-4" /> Editar
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
            ))}
            {/* Footer */}
            <div className="border-t border-zinc-800 px-5 py-3 text-xs text-zinc-500 text-center">
              Mostrando {filtered.length} de {suppliers.length} proveedores
            </div>
          </>
        )}
      </div>
    </div>
  );
}
