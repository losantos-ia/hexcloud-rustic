"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Receipt, Search, TrendingDown, MoreHorizontal, Pencil, Trash2,
  Calendar, ChevronLeft, ChevronRight, X, SlidersHorizontal, ChevronDown,
} from "lucide-react";
import { listExpenses, deleteExpense } from "@/lib/firestore/expenses";
import { listInventoryLocations } from "@/lib/firestore/inventory";
import { listAllExpensePayments } from "@/lib/firestore/expense-payments";
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from "@/types/expenses";
import type { InventoryLocation } from "@/types/inventory";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
} from "@/types/expenses";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency-context";
import { useSidebar } from "@/context/sidebar-context";

type BadgeVariant = BadgeProps["variant"];

const CATEGORY_VARIANT: Record<ExpenseCategory, BadgeVariant> = {
  electricity: "amber",
  water: "blue",
  rent: "purple",
  salaries: "green",
  fuel: "amber",
  internet: "blue",
  advertising: "pink",
  maintenance: "default",
  tools: "default",
  transport: "default",
  other: "default",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

type ExpenseStatus = "pagado" | "parcial" | "vencido" | "pendiente";

function getExpenseStatus(amount: number, paid: number, dueDate?: Date): ExpenseStatus {
  if (paid >= amount && amount > 0) return "pagado";
  if (paid > 0) return "parcial";
  if (dueDate && dueDate < new Date()) return "vencido";
  return "pendiente";
}

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  pagado: "Pagado",
  parcial: "Pago parcial",
  vencido: "Vencido",
  pendiente: "Pendiente",
};

const STATUS_CLASS: Record<ExpenseStatus, string> = {
  pagado: "bg-green-500/15 text-green-400 border border-green-500/25",
  parcial: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  vencido: "bg-red-500/15 text-red-400 border border-red-500/25",
  pendiente: "bg-zinc-700/50 text-zinc-400 border border-zinc-700",
};

function StatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function isThisMonth(date: Date): boolean {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function SummaryCard({
  icon, label, value, color, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "default" | "amber" | "red" | "blue" | "green" | "purple";
  sub?: string;
}) {
  const colorClass = {
    default: "text-zinc-400", amber: "text-amber-400", red: "text-red-400",
    blue: "text-blue-400", green: "text-green-400", purple: "text-purple-400",
  }[color];
  const bgClass = {
    default: "bg-zinc-800/50", amber: "bg-amber-500/10", red: "bg-red-500/10",
    blue: "bg-blue-500/10", green: "bg-green-500/10", purple: "bg-purple-500/10",
  }[color];
  return (
    <div className={`rounded-xl border border-zinc-800 ${bgClass} p-4 flex items-center gap-3`}>
      <div className={colorClass}>{icon}</div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Date range preset helpers ─────────────────────────────────────────────
function startOf(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

const DATE_PRESETS = [
  { label: "Año actual", getRange: () => { const y = new Date().getFullYear(); return { from: `${y}-01-01`, to: `${y}-12-31` }; } },
  { label: "Año anterior", getRange: () => { const y = new Date().getFullYear() - 1; return { from: `${y}-01-01`, to: `${y}-12-31` }; } },
  { label: "Últimos 12 meses", getRange: () => { const to = new Date(); const from = new Date(to); from.setFullYear(from.getFullYear() - 1); return { from: isoDate(from), to: isoDate(to) }; } },
  { label: "Últimos 7 días", getRange: () => { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 6); return { from: isoDate(from), to: isoDate(to) }; } },
  { label: "Mes actual", getRange: () => { const n = new Date(); return { from: isoDate(new Date(n.getFullYear(), n.getMonth(), 1)), to: isoDate(new Date(n.getFullYear(), n.getMonth() + 1, 0)) }; } },
  { label: "Mes anterior", getRange: () => { const n = new Date(); return { from: isoDate(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: isoDate(new Date(n.getFullYear(), n.getMonth(), 0)) }; } },
  { label: "1 trimestre", getRange: () => { const y = new Date().getFullYear(); return { from: `${y}-01-01`, to: `${y}-03-31` }; } },
  { label: "2 trimestre", getRange: () => { const y = new Date().getFullYear(); return { from: `${y}-04-01`, to: `${y}-06-30` }; } },
  { label: "3 trimestre", getRange: () => { const y = new Date().getFullYear(); return { from: `${y}-07-01`, to: `${y}-09-30` }; } },
  { label: "4 trimestre", getRange: () => { const y = new Date().getFullYear(); return { from: `${y}-10-01`, to: `${y}-12-31` }; } },
];

const MONTH_NAMES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES_ES = ["L","M","X","J","V","S","D"];

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0 offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DateRangeFilter({
  from, to, onChange, onClear,
}: {
  from: string; to: string;
  onChange: (f: string, t: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [picking, setPicking] = useState<"from" | "to">("from");

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const cells = buildCalendar(calYear, calMonth);

  function labelForRange() {
    if (!from && !to) return "Selecciona un rango";
    const fmt = (s: string) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    return from ? `Desde ${fmt(from)}` : `Hasta ${fmt(to)}`;
  }

  function pickDay(day: number) {
    const d = isoDate(new Date(calYear, calMonth, day));
    if (picking === "from") {
      onChange(d, to && d > to ? "" : to);
      setPicking("to");
    } else {
      if (from && d < from) { onChange(d, from); }
      else { onChange(from, d); }
      setPicking("from");
    }
  }

  function inRange(day: number) {
    const d = isoDate(new Date(calYear, calMonth, day));
    return !!from && !!to && d >= from && d <= to;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-1.5 transition-colors focus:outline-none ${
          (from || to)
            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
        }`}
      >
        <Calendar size={14} />
        <span className="max-w-[180px] truncate">{labelForRange()}</span>
        {(from || to) && (
          <span onClick={(e) => { e.stopPropagation(); onClear(); }} className="ml-1 text-zinc-500 hover:text-zinc-200">
            <X size={12} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 flex rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden min-w-max">
          {/* Presets */}
          <div className="w-44 border-r border-zinc-800 py-2 flex flex-col">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { const r = p.getRange(); onChange(r.from, r.to); setOpen(false); }}
                className="text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {p.label}
              </button>
            ))}
            <div className="mt-auto border-t border-zinc-800 pt-1">
              <button
                type="button"
                onClick={() => { onClear(); setOpen(false); }}
                className="w-full text-center px-4 py-2 text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Limpiar filtro
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="p-4 w-64">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => { let m = calMonth - 1; let y = calYear; if (m < 0) { m = 11; y--; } setCalMonth(m); setCalYear(y); }} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-semibold text-zinc-200">{MONTH_NAMES_ES[calMonth]} {calYear}</span>
              <button type="button" onClick={() => { let m = calMonth + 1; let y = calYear; if (m > 11) { m = 0; y++; } setCalMonth(m); setCalYear(y); }} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES_ES.map((d) => (<span key={d} className="text-center text-[10px] text-zinc-600 pb-1">{d}</span>))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (!day) return <span key={i} />;
                const d = isoDate(new Date(calYear, calMonth, day));
                const isFrom = d === from;
                const isTo = d === to;
                const inR = inRange(day);
                const isToday = d === isoDate(today);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickDay(day)}
                    className={`text-xs h-7 rounded transition-colors ${
                      isFrom || isTo
                        ? "bg-amber-500 text-zinc-950 font-bold"
                        : inR
                        ? "bg-amber-500/20 text-amber-200"
                        : isToday
                        ? "text-amber-400 hover:bg-zinc-800"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-zinc-600 text-center">
              {picking === "from" ? "Selecciona fecha inicio" : "Selecciona fecha fin"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  filterCategory, setFilterCategory,
  filterLocation, setFilterLocation,
  filterPayment, setFilterPayment,
  filterStatus, setFilterStatus,
  locations,
}: {
  filterCategory: ExpenseCategory | ""; setFilterCategory: (v: ExpenseCategory | "") => void;
  filterLocation: string; setFilterLocation: (v: string) => void;
  filterPayment: ExpensePaymentMethod | ""; setFilterPayment: (v: ExpensePaymentMethod | "") => void;
  filterStatus: ExpenseStatus | ""; setFilterStatus: (v: ExpenseStatus | "") => void;
  locations: import("@/types/inventory").InventoryLocation[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const activeCount = [filterCategory, filterLocation, filterPayment, filterStatus]
    .filter(Boolean).length;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors focus:outline-none ${
          activeCount > 0
            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
            : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
        }`}
      >
        <SlidersHorizontal size={14} />
        Filtros
        {activeCount > 0 && (
          <span className="size-4 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4 flex flex-col gap-4">

          {/* Estado */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Estado</p>
            <div className="flex flex-wrap gap-1.5">
              {(["", "pendiente", "vencido", "parcial", "pagado"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s as ExpenseStatus | "")}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterStatus === s
                      ? s === "" ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                        : s === "pagado" ? "bg-green-500/20 border-green-500/50 text-green-300"
                        : s === "parcial" ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : s === "vencido" ? "bg-red-500/20 border-red-500/50 text-red-300"
                        : "bg-zinc-700 border-zinc-500 text-zinc-100"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {s === "" ? "Todos" : STATUS_LABEL[s as ExpenseStatus]}
                </button>
              ))}
            </div>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Categoría</p>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | "")}
              className="text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="">Todas las categorías</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Ubicación */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Ubicación</p>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="">Todas las ubicaciones</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Método de pago */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Método de pago</p>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value as ExpensePaymentMethod | "")}
              className="text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="">Todos los métodos</option>
              {EXPENSE_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{EXPENSE_PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>

          {/* Footer */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilterCategory(""); setFilterLocation(""); setFilterPayment("");
                setFilterStatus("");
                setOpen(false);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg py-1.5 transition-colors"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RowMenu({ expenseId, onDelete }: { expenseId: string; onDelete: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="size-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
            onClick={() => { router.push(`/compras/${expenseId}/editar`); setOpen(false); }}
          >
            <Pencil size={13} /> Editar
          </button>
          {!confirming ? (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          ) : (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              onClick={() => { onDelete(); setOpen(false); }}
            >
              <Trash2 size={13} /> ¿Confirmar?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComprasPage() {
  const { formatCurrency } = useCurrency();
  const { collapsed } = useSidebar();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);  const [paidMap, setPaidMap] = useState<Record<string, number>>({});  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "">("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterPayment, setFilterPayment] = useState<ExpensePaymentMethod | "">("");
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([listExpenses(), listInventoryLocations(), listAllExpensePayments().catch(() => [])])
      .then(([exp, locs, payments]) => {
        setExpenses(exp);
        setLocations(locs);
        const map: Record<string, number> = {};
        for (const p of payments) {
          map[p.expenseId] = (map[p.expenseId] ?? 0) + p.amount;
        }
        setPaidMap(map);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  // Summary data
  const thisMonthExpenses = useMemo(
    () => expenses.filter((e) => isThisMonth(e.date)),
    [expenses]
  );
  const thisMonthTotal = useMemo(
    () => thisMonthExpenses.reduce((s, e) => s + e.amount, 0),
    [thisMonthExpenses]
  );
  const allTimeTotal = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const locationTotals = useMemo(() => {
    return locations.map((loc) => ({
      loc,
      total: thisMonthExpenses.filter((e) => e.locationId === loc.id).reduce((s, e) => s + e.amount, 0),
    }));
  }, [locations, thisMonthExpenses]);

  // Filtered list
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory && e.category !== filterCategory) return false;
      if (filterLocation && e.locationId !== filterLocation) return false;
      if (filterPayment && e.paymentMethod !== filterPayment) return false;
      if (filterFrom && e.date < new Date(`${filterFrom}T00:00:00`)) return false;
      if (filterTo && e.date > new Date(`${filterTo}T23:59:59`)) return false;
      if (filterStatus) {
        const s = getExpenseStatus(e.amount, paidMap[e.id] ?? 0, e.dueDate);
        if (s !== filterStatus) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          (e.description?.toLowerCase().includes(q) ?? false) ||
          (e.supplierName?.toLowerCase().includes(q) ?? false) ||
          (e.invoiceNumber?.toLowerCase().includes(q) ?? false) ||
          (e.expenseNumber?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [expenses, filterCategory, filterLocation, filterPayment, filterFrom, filterTo, filterStatus, search, paidMap]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const someSelected = !allSelected && filtered.some((e) => selectedIds.has(e.id));
  const selectedTotal = useMemo(
    () => filtered.filter((e) => selectedIds.has(e.id)).reduce((s, e) => s + e.amount, 0),
    [filtered, selectedIds]
  );

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Compras</h1>
          <p className="text-sm text-zinc-500">Control de compras operacionales por ubicación</p>
        </div>
        <Link href="/compras/nuevo">
          <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> Registrar compra
          </button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<TrendingDown size={20} />}
          label="Este mes"
          value={formatCurrency(thisMonthTotal)}
          color="amber"
        />
        {locationTotals.map(({ loc, total }) => (
          <SummaryCard
            key={loc.id}
            icon={<Receipt size={20} />}
            label={loc.name}
            value={formatCurrency(total)}
            color="blue"
            sub="este mes"
          />
        ))}
        <SummaryCard
          icon={<TrendingDown size={20} />}
          label="Total acumulado"
          value={formatCurrency(allTimeTotal)}
          color="default"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar gasto o proveedor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <FilterPanel
          filterCategory={filterCategory} setFilterCategory={setFilterCategory}
          filterLocation={filterLocation} setFilterLocation={setFilterLocation}
          filterPayment={filterPayment} setFilterPayment={setFilterPayment}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          locations={locations}
        />
        <DateRangeFilter
          from={filterFrom}
          to={filterTo}
          onChange={(f, t) => { setFilterFrom(f); setFilterTo(t); }}
          onClear={() => { setFilterFrom(""); setFilterTo(""); }}
        />
        {(filterCategory || filterLocation || filterPayment || filterStatus || filterFrom || filterTo || search) && (
          <button
            onClick={() => {
              setSearch(""); setFilterCategory(""); setFilterLocation("");
              setFilterPayment(""); setFilterStatus(""); setFilterFrom(""); setFilterTo("");
            }}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Cargando compras…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500">
          <Receipt size={40} className="text-zinc-700" />
          <p className="text-sm">Sin compras registradas</p>
          <Link href="/compras/nuevo" className="text-xs text-amber-400 hover:text-amber-300">
            + Registrar primer gasto
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-zinc-800 overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="size-3.5 rounded accent-amber-500 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Número</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Vencimiento</th>
                  <th className="text-left px-4 py-3 font-medium">Proveedor</th>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium">Método</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => toggleRow(expense.id)}
                    className={`border-b border-zinc-800/60 cursor-pointer transition-colors ${
                      selectedIds.has(expense.id) ? "bg-amber-500/5 hover:bg-amber-500/10" : "hover:bg-zinc-900/60"
                    }`}
                  >
                    <td className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(expense.id)}
                        onChange={() => toggleRow(expense.id)}
                        className="size-3.5 rounded accent-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-amber-400" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/compras/${expense.id}`} className="hover:underline">
                        {expense.invoiceNumber || expense.expenseNumber || <span className="text-zinc-600">—</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap text-xs">
                      {expense.dueDate ? formatDate(expense.dueDate) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 text-sm">
                      {expense.supplierName || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs text-xs">
                      {(() => {
                        const raw = expense.lineItems?.[0]?.description || expense.description || "";
                        return raw
                          ? <span className="truncate block" title={raw}>{raw.length > 45 ? raw.slice(0, 45) + "…" : raw}</span>
                          : <span className="text-zinc-600">—</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={CATEGORY_VARIANT[expense.category]}>
                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {EXPENSE_PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={getExpenseStatus(expense.amount, paidMap[expense.id] ?? 0, expense.dueDate)} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-100">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3 overflow-visible" onClick={(e) => e.stopPropagation()}>
                      <RowMenu expenseId={expense.id} onDelete={() => handleDelete(expense.id)} />
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-700">
                  <td />
                  <td colSpan={8} className="px-4 py-3 text-xs text-zinc-500 font-medium">
                    Total ({filtered.length} compras)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">
                    {formatCurrency(filteredTotal)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-2">
            {filtered.map((expense) => (
              <Link
                key={expense.id}
                href={`/compras/${expense.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] text-amber-400">{expense.invoiceNumber || expense.expenseNumber || '—'}</span>
                    <span className="text-sm font-semibold text-zinc-100">
                      {expense.lineItems?.[0]?.description || expense.description || EXPENSE_CATEGORY_LABELS[expense.category]}
                    </span>
                    {expense.supplierName && (
                      <span className="text-xs text-zinc-500">{expense.supplierName}</span>
                    )}
                  </div>
                  <span className="text-base font-bold text-zinc-100 shrink-0">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={CATEGORY_VARIANT[expense.category]} className="text-[10px]">
                    {EXPENSE_CATEGORY_LABELS[expense.category]}
                  </Badge>
                  <StatusBadge status={getExpenseStatus(expense.amount, paidMap[expense.id] ?? 0, expense.dueDate)} />
                  <span className="text-[10px] text-zinc-500">{formatDate(expense.date)}</span>
                  <span className="text-[10px] text-zinc-500">{expense.locationName ?? expense.locationId}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Fixed selection bar */}
      {selectedIds.size > 0 && (
        <div
          className={`fixed bottom-0 right-0 z-50 flex items-center justify-between gap-4 px-6 py-3.5 bg-zinc-900/95 backdrop-blur border-t border-zinc-700 shadow-2xl transition-all duration-300 ${
            collapsed ? "lg:left-16" : "lg:left-64"
          } left-0`}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-zinc-100">
              {selectedIds.size} {selectedIds.size === 1 ? "seleccionada" : "seleccionadas"}
            </span>
            <span className="h-4 w-px bg-zinc-700" />
            <span className="text-sm text-zinc-400">
              Total: <span className="font-bold text-amber-400">{formatCurrency(selectedTotal)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            <X size={13} /> Deseleccionar
          </button>
        </div>
      )}
    </div>
  );
}

