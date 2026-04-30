"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Factory, AlertTriangle, Clock, CheckCircle2, Hammer, MoreVertical,
} from "lucide-react";
import { listProductionOrders } from "@/lib/firestore/production";
import type { ProductionOrder, ProductionStatus, ProductionPriority, ProductionProjectType } from "@/types/production";
import {
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_PROJECT_TYPE_LABELS,
  KANBAN_COLUMNS,
} from "@/types/production";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<ProductionStatus, BadgeVariant> = {
  pending: "default",
  design_measurements: "blue",
  materials_pending: "amber",
  materials_ready: "green",
  cutting: "purple",
  assembly: "purple",
  sanding: "purple",
  painting_sealing: "purple",
  roofing_details: "purple",
  quality_control: "blue",
  ready_for_delivery: "green",
  delivered_to_store: "green",
  installed: "green",
  closed: "default",
  cancelled: "red",
};

const PRIORITY_VARIANT: Record<ProductionPriority, BadgeVariant> = {
  low: "default",
  medium: "default",
  high: "amber",
  urgent: "red",
};

function isOverdue(date?: Date, status?: ProductionStatus): boolean {
  if (!date || !status) return false;
  const terminal: ProductionStatus[] = ["closed", "cancelled", "installed", "delivered_to_store"];
  if (terminal.includes(status)) return false;
  return date < new Date();
}

function formatDateShort(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function SummaryCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "default" | "amber" | "blue" | "red" | "purple";
}) {
  const colorClass = { default: "text-zinc-400", amber: "text-amber-400", blue: "text-blue-400", red: "text-red-400", purple: "text-purple-400" }[color];
  const bgClass = { default: "bg-zinc-800/50", amber: "bg-amber-500/10", blue: "bg-blue-500/10", red: "bg-red-500/10", purple: "bg-purple-500/10" }[color];
  return (
    <div className={`rounded-xl border border-zinc-800 ${bgClass} p-4 flex items-center gap-3`}>
      <div className={colorClass}>{icon}</div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
    </div>
  );
}

function ProductionCard({ order, onMenuOpen }: { order: ProductionOrder; onMenuOpen: (id: string, e: React.MouseEvent) => void }) {
  const overdue = isOverdue(order.promisedDeliveryDate, order.status);
  const urgent = order.priority === "urgent";
  return (
    <Link
      href={`/produccion/${order.id}`}
      className={`block rounded-lg border bg-zinc-900 p-3 hover:border-zinc-600 transition-colors group cursor-pointer ${urgent ? "border-red-500/50" : overdue ? "border-amber-500/40" : "border-zinc-800"}`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <span className="text-[10px] font-mono text-amber-400">{order.productionNumber}</span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onMenuOpen(order.id, e); }}
          className="size-5 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={12} />
        </button>
      </div>
      <p className="text-sm font-semibold text-zinc-100 leading-snug mb-1 line-clamp-2">{order.title}</p>
      <p className="text-xs text-zinc-500 mb-2">{order.clientName}</p>
      <div className="flex items-center gap-1 flex-wrap mb-2">
        {(order.priority === "high" || order.priority === "urgent") && (
          <Badge variant={PRIORITY_VARIANT[order.priority]} className="text-[10px]">
            {PRODUCTION_PRIORITY_LABELS[order.priority]}
          </Badge>
        )}
        <Badge variant="default" className="text-[10px]">
          {PRODUCTION_PROJECT_TYPE_LABELS[order.projectType]}
        </Badge>
      </div>
      {order.promisedDeliveryDate && (
        <div className={`flex items-center gap-1 text-[10px] ${overdue ? "text-red-400" : "text-zinc-500"}`}>
          {overdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
          {overdue ? "Vencido · " : "Entrega: "}
          {formatDateShort(order.promisedDeliveryDate)}
        </div>
      )}
      {order.responsiblePerson && (
        <p className="text-[10px] text-zinc-600 mt-1 truncate">{order.responsiblePerson}</p>
      )}
      {(order.estimatedLaborHours !== undefined || order.actualLaborHours !== undefined) && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
          <Hammer size={9} />
          {order.actualLaborHours !== undefined ? `${order.actualLaborHours}h real` : ""}
          {order.actualLaborHours !== undefined && order.estimatedLaborHours !== undefined ? " / " : ""}
          {order.estimatedLaborHours !== undefined ? `${order.estimatedLaborHours}h est.` : ""}
        </div>
      )}
    </Link>
  );
}

export default function ProduccionPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ProductionProjectType | "">("");
  const [filterPriority, setFilterPriority] = useState<ProductionPriority | "">("");
  const [filterPerson, setFilterPerson] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listProductionOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  function openMenu(id: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(id);
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!showClosed && (o.status === "closed" || o.status === "cancelled")) return false;
      if (filterType && o.projectType !== filterType) return false;
      if (filterPriority && o.priority !== filterPriority) return false;
      if (filterPerson && !o.responsiblePerson?.toLowerCase().includes(filterPerson.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        return o.productionNumber.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q) || o.title.toLowerCase().includes(q);
      }
      return true;
    });
  }, [orders, search, filterType, filterPriority, filterPerson, showClosed]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "closed" && o.status !== "cancelled");
    return {
      inProduction: active.filter((o) => ["cutting", "assembly", "sanding", "painting_sealing", "roofing_details"].includes(o.status)).length,
      materialsPending: active.filter((o) => o.status === "materials_pending").length,
      qualityControl: active.filter((o) => o.status === "quality_control").length,
      overdue: active.filter((o) => isOverdue(o.promisedDeliveryDate, o.status)).length,
    };
  }, [orders]);

  const responsiblePersons = useMemo(() => {
    const set = new Set(orders.map((o) => o.responsiblePerson).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [orders]);

  const kanbanData = useMemo(() => {
    const map = new Map<ProductionStatus, ProductionOrder[]>();
    KANBAN_COLUMNS.forEach(({ status }) => map.set(status, []));
    filtered.forEach((o) => { const col = map.get(o.status); if (col) col.push(o); });
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Producción
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Tablero de órdenes de fabricación</p>
        </div>
        <Link
          href="/produccion/nueva"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors shrink-0"
        >
          <Plus size={16} /> Nueva orden
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={<Factory size={18} />} label="En producción" value={stats.inProduction} color="purple" />
        <SummaryCard icon={<Clock size={18} />} label="Mat. pendientes" value={stats.materialsPending} color="amber" />
        <SummaryCard icon={<CheckCircle2 size={18} />} label="Control calidad" value={stats.qualityControl} color="blue" />
        <SummaryCard icon={<AlertTriangle size={18} />} label="Retrasadas" value={stats.overdue} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número, cliente o título…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ProductionProjectType | "")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(PRODUCTION_PROJECT_TYPE_LABELS) as ProductionProjectType[]).map((t) => (
            <option key={t} value={t}>{PRODUCTION_PROJECT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as ProductionPriority | "")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
        >
          <option value="">Todas las prioridades</option>
          {(Object.keys(PRODUCTION_PRIORITY_LABELS) as ProductionPriority[]).map((p) => (
            <option key={p} value={p}>{PRODUCTION_PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        {responsiblePersons.length > 0 && (
          <select
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
          >
            <option value="">Todos los responsables</option>
            {responsiblePersons.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
          />
          Ver cerradas / canceladas
        </label>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Cargando órdenes…</div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-4 -mx-4 md:-mx-6 px-4 md:px-6"
          style={{ scrollbarWidth: "thin" }}
        >
          {KANBAN_COLUMNS.map(({ status, label }) => {
            const col = kanbanData.get(status) ?? [];
            return (
              <div key={status} className="flex-shrink-0 w-60 flex flex-col gap-2">
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs font-semibold text-zinc-300 truncate">{label}</span>
                  <span className="text-[10px] text-zinc-600 tabular-nums bg-zinc-800 rounded-full px-1.5 py-0.5 ml-1">
                    {col.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 min-h-16">
                  {col.length === 0 && (
                    <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-4 text-center text-[10px] text-zinc-700">
                      Sin órdenes
                    </div>
                  )}
                  {col.map((order) => (
                    <ProductionCard key={order.id} order={order} onMenuOpen={openMenu} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Context menu */}
      {openMenuId && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-44 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl py-1"
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            onClick={() => { router.push(`/produccion/${openMenuId}`); setOpenMenuId(null); }}
          >Ver detalle</button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            onClick={() => { router.push(`/produccion/${openMenuId}/editar`); setOpenMenuId(null); }}
          >Editar</button>
        </div>
      )}
    </div>
  );
}
