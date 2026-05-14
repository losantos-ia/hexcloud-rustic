"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Clock, CheckCircle2, Factory, Truck, DollarSign, MoreVertical, Download, X,
} from "lucide-react";
import { listOrders } from "@/lib/firestore/orders";
import type { Order, OrderStatus, OrderProjectType, OrderPriority, OrderSource } from "@/types/order";
import {
  ORDER_STATUS_LABELS,
  ORDER_PROJECT_TYPE_LABELS,
  ORDER_PRIORITY_LABELS,
  ORDER_SOURCE_LABELS,
  ACTIVE_ORDER_STATUSES,
} from "@/types/order";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency-context";
import { useSidebar } from "@/context/sidebar-context";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  deposit_pending: "amber",
  confirmed: "blue",
  sent_to_workshop: "purple",
  in_production: "purple",
  ready_for_delivery: "green",
  delivered: "green",
  installed: "green",
  paid: "green",
  closed: "default",
  cancelled: "red",
};

const PRIORITY_VARIANT: Record<OrderPriority, BadgeVariant> = {
  low: "default",
  medium: "amber",
  high: "red",
  urgent: "red",
};

function isOverdue(date?: Date, status?: OrderStatus): boolean {
  if (!date || !status) return false;
  const terminal: OrderStatus[] = ["delivered", "installed", "paid", "closed", "cancelled"];
  if (terminal.includes(status)) return false;
  return date < new Date();
}

function formatDateShort(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function PedidosPage() {
  const router = useRouter();
  const { formatCurrency, formatCompact } = useCurrency();
  const { collapsed } = useSidebar();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all" | "active">("active");
  const [filterType, setFilterType] = useState<OrderProjectType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<OrderPriority | "all">("all");
  const [filterSource, setFilterSource] = useState<OrderSource | "all">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  const openMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenuId(id);
  }, []);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  }

  const stats = useMemo(() => {
    const active = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));
    return {
      depositPending: orders.filter((o) => o.status === "deposit_pending").length,
      confirmed: orders.filter((o) => o.status === "confirmed" || o.status === "sent_to_workshop").length,
      inProduction: orders.filter((o) => o.status === "in_production").length,
      readyForDelivery: orders.filter((o) => o.status === "ready_for_delivery").length,
      balanceDue: active.reduce((sum, o) => sum + o.balanceDue, 0),
    };
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus === "active" && !ACTIVE_ORDER_STATUSES.includes(o.status)) return false;
      if (filterStatus !== "active" && filterStatus !== "all" && o.status !== filterStatus) return false;
      if (filterType !== "all" && o.projectType !== filterType) return false;
      if (filterPriority !== "all" && o.priority !== filterPriority) return false;
      if (filterSource !== "all" && o.source !== filterSource) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.clientName.toLowerCase().includes(q) ||
          o.clientPhone.includes(q) ||
          o.orderNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, filterStatus, filterType, filterPriority, filterSource, search]);

  const selectedOrders = useMemo(() => filtered.filter((o) => selectedIds.has(o.id)), [filtered, selectedIds]);
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.finalSalePrice, 0);
  const selectedBalance = selectedOrders.reduce((s, o) => s + o.balanceDue, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Pedidos
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{orders.length} pedidos en total</p>
        </div>
        <Link
          href="/pedidos/nuevo"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors shrink-0"
        >
          <Plus size={16} /> Nuevo pedido
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard icon={<Clock size={18} />} label="Anticipo pendiente" value={stats.depositPending} color="amber" />
        <SummaryCard icon={<CheckCircle2 size={18} />} label="Confirmados" value={stats.confirmed} color="blue" />
        <SummaryCard icon={<Factory size={18} />} label="En producción" value={stats.inProduction} color="purple" />
        <SummaryCard icon={<Truck size={18} />} label="Listo para entrega" value={stats.readyForDelivery} color="green" />
        <SummaryCard
          icon={<DollarSign size={18} />}
          label="Saldo por cobrar"
          value={formatCompact(stats.balanceDue)}
          color="red"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative sm:flex-1 sm:min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, número o teléfono..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:contents">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as OrderStatus | "all" | "active")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
          >
            <option value="active">Activos</option>
            <option value="all">Todos los estados</option>
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as OrderProjectType | "all")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
          >
            <option value="all">Todo tipo</option>
            {(Object.keys(ORDER_PROJECT_TYPE_LABELS) as OrderProjectType[]).map((t) => (
              <option key={t} value={t}>{ORDER_PROJECT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as OrderPriority | "all")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
          >
            <option value="all">Toda prioridad</option>
            {(Object.keys(ORDER_PRIORITY_LABELS) as OrderPriority[]).map((p) => (
              <option key={p} value={p}>{ORDER_PRIORITY_LABELS[p]}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as OrderSource | "all")}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
          >
            <option value="all">Todo origen</option>
            {(Object.keys(ORDER_SOURCE_LABELS) as OrderSource[]).map((s) => (
              <option key={s} value={s}>{ORDER_SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-zinc-800">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 w-36 rounded bg-zinc-800" />
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="h-5 w-20 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <Factory size={20} className="text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No hay pedidos</p>
            <p className="text-xs text-zinc-600">
              {search || filterStatus !== "active" || filterType !== "all"
                ? "Prueba cambiando los filtros"
                : "Crea el primer pedido para comenzar"}
            </p>
            {!search && filterStatus === "active" && filterType === "all" && (
              <Link
                href="/pedidos/nuevo"
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                <Plus size={12} /> Nuevo pedido
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Número</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Cliente</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Proyecto</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Prioridad</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 text-right">Saldo</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Entrega</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Creado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((order) => {
                  const overdue = isOverdue(order.promisedDeliveryDate, order.status);
                  const urgent = order.priority === "urgent";
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-zinc-800/50 transition-colors cursor-pointer ${urgent ? "border-l-2 border-l-red-500" : ""} ${selectedIds.has(order.id) ? "bg-amber-500/5" : ""}`}
                      onClick={() => router.push(`/pedidos/${order.id}`)}
                    >
                      <td
                        className="pl-4 py-3 w-10"
                        onClick={(e) => { e.stopPropagation(); toggleRow(order.id); }}
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={selectedIds.has(order.id)}
                          className="pointer-events-none accent-amber-500 size-3.5"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-amber-400">{order.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-100 truncate max-w-[160px]">{order.clientName}</p>
                        <p className="text-xs text-zinc-500">{order.clientPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{ORDER_PROJECT_TYPE_LABELS[order.projectType]}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={PRIORITY_VARIANT[order.priority]}>{ORDER_PRIORITY_LABELS[order.priority]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-zinc-200">
                        {formatCurrency(order.finalSalePrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {order.balanceDue > 0
                          ? <span className="text-amber-400">{formatCurrency(order.balanceDue)}</span>
                          : <span className="text-emerald-400 text-xs">Pagado</span>}
                      </td>
                      <td className="px-4 py-3">
                        {order.promisedDeliveryDate ? (
                          <span className={`text-xs ${overdue ? "text-red-400 font-medium" : "text-zinc-400"}`}>
                            {overdue ? "⚠ " : ""}{formatDateShort(order.promisedDeliveryDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{formatDateShort(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => openMenu(e, order.id)}
                          className="size-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-800">
              {filtered.map((order) => {
                const overdue = isOverdue(order.promisedDeliveryDate, order.status);
                const urgent = order.priority === "urgent";
                return (
                  <Link
                    key={order.id}
                    href={`/pedidos/${order.id}`}
                    className={`block px-4 py-3 hover:bg-zinc-800/50 transition-colors ${urgent ? "border-l-2 border-l-red-500" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="text-xs font-mono text-amber-400">{order.orderNumber}</span>
                        <p className="font-medium text-zinc-100 text-sm">{order.clientName}</p>
                      </div>
                      <Badge variant={STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{ORDER_PROJECT_TYPE_LABELS[order.projectType]} · {order.clientPhone}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={PRIORITY_VARIANT[order.priority]}>{ORDER_PRIORITY_LABELS[order.priority]}</Badge>
                        {overdue && <Badge variant="red">⚠ Vencido</Badge>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-zinc-200">{formatCurrency(order.finalSalePrice)}</p>
                        {order.balanceDue > 0 && (
                          <p className="text-[10px] text-amber-400">Saldo: {formatCurrency(order.balanceDue)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Dropdown menu */}
      {openMenuId && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-44 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl py-1"
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            onClick={() => { router.push(`/pedidos/${openMenuId}`); setOpenMenuId(null); }}
          >
            Ver detalle
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            onClick={() => { router.push(`/pedidos/${openMenuId}/editar`); setOpenMenuId(null); }}
          >
            Editar
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            onClick={() => { router.push(`/pedidos/${openMenuId}/pdf`); setOpenMenuId(null); }}
          >
            <Download size={13} className="text-zinc-400" /> Ver PDF
          </button>
        </div>
      )}

      {/* Selection bottom bar */}
      {selectedIds.size > 0 && (
        <div
          className={`fixed bottom-0 right-0 z-40 border-t border-zinc-700 bg-zinc-900/95 backdrop-blur-sm px-6 py-3 flex items-center gap-6 transition-all left-0 ${collapsed ? "lg:left-16" : "lg:left-64"}`}
        >
          <span className="text-sm text-zinc-400 shrink-0">
            <span className="font-semibold text-zinc-200">{selectedIds.size}</span> seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-6 flex-1 flex-wrap">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Total</span>
              <span className="text-sm font-semibold text-zinc-200">{formatCurrency(selectedTotal)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Saldo</span>
              <span className="text-sm font-semibold text-amber-400">{formatCurrency(selectedBalance)}</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-md px-3 py-1.5 transition-colors shrink-0"
          >
            <X size={12} /> Deseleccionar
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, value, color, className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "amber" | "blue" | "purple" | "green" | "red";
  className?: string;
}) {
  const colorMap = {
    amber: "text-amber-400 bg-amber-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    red: "text-red-400 bg-red-500/10",
  };
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-center gap-3 ${className ?? ""}`}>
      <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-zinc-100 leading-tight">{value}</p>
        <p className="text-xs text-zinc-500 truncate">{label}</p>
      </div>
    </div>
  );
}

