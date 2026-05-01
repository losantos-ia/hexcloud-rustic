"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Package, AlertTriangle, Warehouse, MoreVertical,
  TrendingDown, ShoppingBag,
} from "lucide-react";
import { listInventoryItems, listInventoryLocations } from "@/lib/firestore/inventory";
import type { InventoryItem, InventoryLocation, InventoryCategory, InventoryItemType } from "@/types/inventory";
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_ITEM_TYPE_LABELS,
  INVENTORY_UNIT_LABELS,
  STOCK_STATUS_LABELS,
  getStockStatus,
} from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency-context";

type BadgeVariant = BadgeProps["variant"];

const STOCK_STATUS_VARIANT: Record<string, BadgeVariant> = {
  ok: "green",
  bajo_minimo: "amber",
  sin_stock: "red",
};

const CATEGORY_VARIANT: Record<InventoryCategory, BadgeVariant> = {
  wood: "amber",
  hardware: "default",
  roofing: "blue",
  paint_sealer: "purple",
  consumable: "default",
  tool: "default",
  finished_product: "green",
  other: "default",
};

export default function InventarioPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<InventoryCategory | "">("");
  const [filterItemType, setFilterItemType] = useState<InventoryItemType | "">("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Context menu
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listInventoryItems(), listInventoryLocations()])
      .then(([its, locs]) => {
        setItems(its);
        setLocations(locs);
      })
      .finally(() => setLoading(false));
  }, []);

  const locationMap = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations]
  );

  // ── Summary stats ─────────────────────────────────────
  const stats = useMemo(() => {
    const totalValue = items.reduce((s, i) => s + i.currentStock * i.averageCost, 0);
    const belowMin = items.filter(
      (i) => i.currentStock > 0 && i.currentStock <= i.minimumStock
    ).length;
    const sinStock = items.filter((i) => i.currentStock <= 0).length;
    const finished = items.filter((i) => i.itemType === "finished_product").length;

    const workshopIds = new Set(
      locations.filter((l) => l.type === "workshop").map((l) => l.id)
    );
    const storeIds = new Set(
      locations.filter((l) => l.type === "store").map((l) => l.id)
    );

    const tallerItems = items.filter((i) => workshopIds.has(i.locationId)).length;
    const tiendaItems = items.filter((i) => storeIds.has(i.locationId)).length;

    return { totalValue, belowMin, sinStock, finished, tallerItems, tiendaItems };
  }, [items, locations]);

  // ── Filtered items ────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q) && !(item.sku ?? "").toLowerCase().includes(q)) return false;
      if (filterCategory && item.category !== filterCategory) return false;
      if (filterItemType && item.itemType !== filterItemType) return false;
      if (filterLocation && item.locationId !== filterLocation) return false;
      if (filterLowStock) {
        const s = getStockStatus(item);
        if (s === "ok") return false;
      }
      return true;
    });
  }, [items, search, filterCategory, filterItemType, filterLocation, filterLowStock]);

  return (
    <div className="flex flex-col gap-6" onClick={() => setOpenMenu(null)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-zinc-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Inventario
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? "Cargando…" : `${items.length} artículos · ${locations.length} ubicaciones`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventario/ubicaciones"
            className="flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <Warehouse size={14} />
            <span className="hidden sm:inline">Ubicaciones</span>
          </Link>
          <Link
            href="/inventario/nuevo"
            className="flex items-center gap-2 h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Nuevo artículo</span>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Valor total"
          value={formatCurrency(stats.totalValue)}
          icon={<Package size={16} className="text-amber-400" />}
          accent="amber"
        />
        <SummaryCard
          label="Bajo mínimo"
          value={String(stats.belowMin + stats.sinStock)}
          icon={<AlertTriangle size={16} className="text-red-400" />}
          accent="red"
          sub={`${stats.sinStock} sin stock`}
        />
        <SummaryCard
          label="Prod. terminados"
          value={String(stats.finished)}
          icon={<ShoppingBag size={16} className="text-green-400" />}
          accent="green"
        />
        <SummaryCard
          label="Artíc. en taller"
          value={String(stats.tallerItems)}
          icon={<Warehouse size={16} className="text-blue-400" />}
          accent="blue"
        />
        <SummaryCard
          label="Artíc. en tiendas"
          value={String(stats.tiendaItems)}
          icon={<TrendingDown size={16} className="text-purple-400" />}
          accent="purple"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as InventoryCategory | "")}
          className="h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 [&>option]:bg-zinc-900"
        >
          <option value="">Todas las categorías</option>
          {(Object.entries(INVENTORY_CATEGORY_LABELS) as [InventoryCategory, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterItemType}
          onChange={(e) => setFilterItemType(e.target.value as InventoryItemType | "")}
          className="h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 [&>option]:bg-zinc-900"
        >
          <option value="">Todos los tipos</option>
          {(Object.entries(INVENTORY_ITEM_TYPE_LABELS) as [InventoryItemType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40 [&>option]:bg-zinc-900"
        >
          <option value="">Todas las ubicaciones</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <button
          onClick={(e) => { e.stopPropagation(); setFilterLowStock(!filterLowStock); }}
          className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
            filterLowStock
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          }`}
        >
          <AlertTriangle size={13} className="inline mr-1.5" />
          Bajo mínimo
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-5 border-2 border-zinc-600 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-zinc-600">
          <Package size={32} />
          <p className="text-sm">No hay artículos</p>
          {(search || filterCategory || filterItemType || filterLocation || filterLowStock) ? (
            <button
              onClick={() => { setSearch(""); setFilterCategory(""); setFilterItemType(""); setFilterLocation(""); setFilterLowStock(false); }}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              Limpiar filtros
            </button>
          ) : (
            <Link href="/inventario/nuevo" className="text-xs text-amber-500 hover:text-amber-400">
              Agregar primer artículo
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Artículo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Costo prom.</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Valor total</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Ubicación</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((item) => {
                  const status = getStockStatus(item);
                  const loc = locationMap[item.locationId];
                  const totalValue = item.currentStock * item.averageCost;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/inventario/${item.id}`)}
                      className="hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-100 group-hover:text-amber-400 transition-colors">{item.name}</p>
                        {item.sku && <p className="text-xs text-zinc-500 mt-0.5">{item.sku}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant={CATEGORY_VARIANT[item.category]}>
                          {INVENTORY_CATEGORY_LABELS[item.category]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-zinc-400">
                        {INVENTORY_ITEM_TYPE_LABELS[item.itemType]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${item.currentStock <= 0 ? "text-red-400" : item.currentStock <= item.minimumStock ? "text-amber-400" : "text-zinc-200"}`}>
                          {item.currentStock}
                        </span>
                        <span className="text-xs text-zinc-600 ml-1">{INVENTORY_UNIT_LABELS[item.unit]}</span>
                        {item.minimumStock > 0 && (
                          <p className="text-xs text-zinc-600">mín. {item.minimumStock}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-zinc-400">
                        {formatCurrency(item.averageCost)}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-zinc-300 font-medium">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {loc ? (
                          <span className="text-xs text-zinc-400">{loc.name}</span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STOCK_STATUS_VARIANT[status]}>
                          {STOCK_STATUS_LABELS[status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                            className="size-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>
                          {openMenu === item.id && (
                            <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
                              <button
                                onClick={() => { setOpenMenu(null); router.push(`/inventario/${item.id}`); }}
                                className="w-full text-left px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                              >
                                Ver detalle
                              </button>
                              <button
                                onClick={() => { setOpenMenu(null); router.push(`/inventario/${item.id}/editar`); }}
                                className="w-full text-left px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                              >
                                Editar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              {filtered.length} de {items.length} artículos
            </p>
            <p className="text-xs text-zinc-600">
              Valor filtrado: <span className="text-zinc-400 font-medium">{formatCurrency(filtered.reduce((s, i) => s + i.currentStock * i.averageCost, 0))}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "amber" | "red" | "green" | "blue" | "purple";
  sub?: string;
}) {
  const ringMap: Record<string, string> = {
    amber: "ring-amber-500/20",
    red: "ring-red-500/20",
    green: "ring-emerald-500/20",
    blue: "ring-blue-500/20",
    purple: "ring-purple-500/20",
  };
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex flex-col gap-2 ring-1 ${ringMap[accent]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{label}</p>
        {icon}
      </div>
      <p className="text-xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-600 -mt-1">{sub}</p>}
    </div>
  );
}
