"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useCurrency } from "@/context/currency-context";
import Link from "next/link";
import {
  Package,
  Plus,
  MapPin,
  TrendingDown,
  DollarSign,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listInventoryItems,
  listAllStock,
  listInventoryLocations,
} from "@/lib/firestore/inventory";
import type { InventoryItem, InventoryStockByLocation, InventoryLocation } from "@/types/inventory";
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_ITEM_TYPE_LABELS,
  INVENTORY_UNIT_LABELS,
  STOCK_STATUS_LABELS,
  getAggregateStockStatus,
  getStockStatusForEntry,
} from "@/types/inventory";

// ── Helpers ──────────────────────────────────────────────

function stockBadgeClass(status: "ok" | "bajo_minimo" | "sin_stock") {
  if (status === "ok") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (status === "bajo_minimo") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

// ── Page ─────────────────────────────────────────────────

export default function InventarioPage() {
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allStock, setAllStock] = useState<InventoryStockByLocation[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    Promise.all([listInventoryItems(), listAllStock(), listInventoryLocations()])
      .then(([i, s, l]) => {
        setItems(i);
        setAllStock(s);
        setLocations(l);
      })
      .finally(() => setLoading(false));
  }, []);

  // Stock map: itemId -> InventoryStockByLocation[]
  const stockByItem = useMemo(() => {
    const map = new Map<string, InventoryStockByLocation[]>();
    for (const s of allStock) {
      const arr = map.get(s.itemId) ?? [];
      arr.push(s);
      map.set(s.itemId, arr);
    }
    return map;
  }, [allStock]);

  // Summary cards
  const totalValue = useMemo(
    () => allStock.reduce((s, e) => s + e.totalValue, 0),
    [allStock]
  );

  const locationValues = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allStock) {
      map.set(s.locationId, (map.get(s.locationId) ?? 0) + s.totalValue);
    }
    return map;
  }, [allStock]);

  const lowStockCount = useMemo(() => {
    return items.filter((item) => {
      const entries = stockByItem.get(item.id) ?? [];
      const status = getAggregateStockStatus(entries);
      return status !== "ok";
    }).length;
  }, [items, stockByItem]);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const entries = stockByItem.get(item.id) ?? [];
      const status = getAggregateStockStatus(entries);
      const totalStock = entries.reduce((s, e) => s + e.currentStock, 0);

      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) &&
          !(item.sku?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (filterCategory !== "all" && item.category !== filterCategory) return false;
      if (filterType !== "all" && item.itemType !== filterType) return false;
      if (filterStatus === "sin_stock" && totalStock > 0) return false;
      if (filterStatus === "bajo_minimo" && status !== "bajo_minimo") return false;
      if (filterStatus === "ok" && status !== "ok") return false;

      if (filterLocation !== "all") {
        const hasEntry = entries.some((e) => e.locationId === filterLocation);
        if (!hasEntry) return false;
      }

      return true;
    });
  }, [items, stockByItem, search, filterLocation, filterCategory, filterType, filterStatus]);

  return (
    <div className="w-full max-w-full px-4 py-6 space-y-6 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Cat&aacute;logo de art&iacute;culos y stock por ubicaci&oacute;n</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventario/ubicaciones">
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:text-white gap-1.5">
              <MapPin className="h-4 w-4" />
              Ubicaciones
            </Button>
          </Link>
          <Link href="/inventario/nuevo">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo art&iacute;culo
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-zinc-400">Valor total</span>
            </div>
            <p className="text-xl font-bold text-white">{formatCurrency(totalValue)}</p>
          </div>
          {locations.slice(0, 3).map((loc) => (
            <div key={loc.id} className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-zinc-400 truncate">{loc.name}</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatCurrency(locationValues.get(loc.id) ?? 0)}
              </p>
            </div>
          ))}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs text-zinc-400">Bajo m&iacute;nimo</span>
            </div>
            <p className="text-xl font-bold text-white">{lowStockCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar art&iacute;culo..."
            className="pl-9 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-700 text-zinc-300">
            <MapPin className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Ubicaci&oacute;n" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">Todas las ubicaciones</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px] bg-zinc-900 border-zinc-700 text-zinc-300">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Categor&iacute;a" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">Todas las categor&iacute;as</SelectItem>
            {Object.entries(INVENTORY_CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-700 text-zinc-300">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="bajo_minimo">Bajo m&iacute;nimo</SelectItem>
            <SelectItem value="sin_stock">Sin stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-zinc-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-500">
          <Package className="h-10 w-10" />
          <p className="text-sm">No se encontraron art&iacute;culos</p>
          <Link href="/inventario/nuevo">
            <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
              Agregar art&iacute;culo
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-zinc-400">Art&iacute;culo</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-400 hidden sm:table-cell">Tipo / Unidad</th>
                  <th className="text-right py-3 px-4 font-medium text-zinc-400">Stock total</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-400 hidden lg:table-cell">Por ubicaci&oacute;n</th>
                  <th className="text-right py-3 px-4 font-medium text-zinc-400 hidden md:table-cell">Valor</th>
                  <th className="text-center py-3 px-4 font-medium text-zinc-400">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((item) => {
                  const entries = stockByItem.get(item.id) ?? [];
                  const totalStock = entries.reduce((s, e) => s + e.currentStock, 0);
                  const totalVal = entries.reduce((s, e) => s + e.totalValue, 0);
                  const status = getAggregateStockStatus(entries);
                  const displayEntries = filterLocation !== "all"
                    ? entries.filter((e) => e.locationId === filterLocation)
                    : entries;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/inventario/${item.id}`} className="hover:text-amber-400 transition-colors">
                          <p className="font-medium text-white">{item.name}</p>
                          {item.sku && <p className="text-xs text-zinc-500">{item.sku}</p>}
                          <p className="text-xs text-zinc-500 sm:hidden">
                            {INVENTORY_ITEM_TYPE_LABELS[item.itemType]}
                          </p>
                        </Link>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <p className="text-zinc-300">{INVENTORY_ITEM_TYPE_LABELS[item.itemType]}</p>
                        <p className="text-xs text-zinc-500">{INVENTORY_UNIT_LABELS[item.unit]}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-white">
                          {totalStock.toLocaleString("es-PA")}
                        </span>
                        <span className="text-xs text-zinc-500 ml-1">
                          {INVENTORY_UNIT_LABELS[item.unit]}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {displayEntries.map((e) => {
                            const loc = locations.find((l) => l.id === e.locationId);
                            const s = getStockStatusForEntry(e);
                            return (
                              <span
                                key={e.locationId}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs border ${stockBadgeClass(s)}`}
                              >
                                {loc?.name ?? e.locationId}: {e.currentStock}
                              </span>
                            );
                          })}
                          {displayEntries.length === 0 && (
                            <span className="text-xs text-zinc-600">Sin stock registrado</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        <span className="text-zinc-300">{formatCurrency(totalVal)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium border ${stockBadgeClass(status)}`}>
                          {STOCK_STATUS_LABELS[status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
            {filtered.length} art&iacute;culo{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== items.length && ` (de ${items.length})`}
          </div>
        </div>
      )}
    </div>
  );
}
