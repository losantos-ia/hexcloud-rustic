"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Receipt, Search, TrendingDown, MoreHorizontal, Pencil, Trash2,
} from "lucide-react";
import { listExpenses, deleteExpense } from "@/lib/firestore/expenses";
import { listInventoryLocations } from "@/lib/firestore/inventory";
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
            onClick={() => { router.push(`/gastos/${expenseId}/editar`); setOpen(false); }}
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

export default function GastosPage() {
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "">("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterPayment, setFilterPayment] = useState<ExpensePaymentMethod | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    Promise.all([listExpenses(), listInventoryLocations()])
      .then(([exp, locs]) => {
        setExpenses(exp);
        setLocations(locs);
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
      if (search) {
        const q = search.toLowerCase();
        return (
          (e.description?.toLowerCase().includes(q) ?? false) ||
          (e.supplierName?.toLowerCase().includes(q) ?? false) ||
          e.expenseNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, filterCategory, filterLocation, filterPayment, filterFrom, filterTo, search]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Gastos</h1>
          <p className="text-sm text-zinc-500">Control de gastos operacionales por ubicación</p>
        </div>
        <Link href="/gastos/nuevo">
          <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> Registrar gasto
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
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar gasto o proveedor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-56"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | "")}
          className="text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500"
        >
          <option value="">Todas las categorías</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500"
        >
          <option value="">Todas las ubicaciones</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value as ExpensePaymentMethod | "")}
          className="text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500"
        >
          <option value="">Todos los métodos</option>
          {EXPENSE_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{EXPENSE_PAYMENT_METHOD_LABELS[m]}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          title="Desde"
          className="text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          title="Hasta"
          className="text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1.5 focus:outline-none focus:border-amber-500"
        />
        {(filterCategory || filterLocation || filterPayment || filterFrom || filterTo || search) && (
          <button
            onClick={() => {
              setSearch(""); setFilterCategory(""); setFilterLocation("");
              setFilterPayment(""); setFilterFrom(""); setFilterTo("");
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Cargando gastos…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-zinc-500">
          <Receipt size={40} className="text-zinc-700" />
          <p className="text-sm">Sin gastos registrados</p>
          <Link href="/gastos/nuevo" className="text-xs text-amber-400 hover:text-amber-300">
            + Registrar primer gasto
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="text-left px-4 py-3 font-medium">Número</th>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium">Ubicación</th>
                  <th className="text-left px-4 py-3 font-medium">Método</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => window.location.href = `/gastos/${expense.id}`}
                    className="border-b border-zinc-800/60 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-amber-400">{expense.expenseNumber}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(expense.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={CATEGORY_VARIANT[expense.category]}>
                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">
                      {expense.description || expense.supplierName || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {expense.locationName ?? expense.locationId}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {EXPENSE_PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-100">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <RowMenu expenseId={expense.id} onDelete={() => handleDelete(expense.id)} />
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-700">
                  <td colSpan={6} className="px-4 py-3 text-xs text-zinc-500 font-medium">
                    Total ({filtered.length} gastos)
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
                href={`/gastos/${expense.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] text-amber-400">{expense.expenseNumber}</span>
                    <span className="text-sm font-semibold text-zinc-100">
                      {expense.description || EXPENSE_CATEGORY_LABELS[expense.category]}
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
                  <span className="text-[10px] text-zinc-500">{formatDate(expense.date)}</span>
                  <span className="text-[10px] text-zinc-500">{expense.locationName ?? expense.locationId}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
