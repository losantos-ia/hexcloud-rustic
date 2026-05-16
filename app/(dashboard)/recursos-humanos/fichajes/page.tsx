"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { LogIn, LogOut, Clock, Search, RefreshCw } from "lucide-react";
import {
  listActiveEmployees,
  listTimeClockEntriesByDateRange,
  clockInEmployee,
  clockOutEmployee,
  getOpenClockEntryByEmployee,
} from "@/lib/firestore/hr";
import type { Employee, TimeClockEntry } from "@/types/hr";
import { EMPLOYEE_ROLE_LABELS, EMPLOYEE_DEPARTMENT_LABELS } from "@/types/hr";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function formatTime(d?: Date) {
  if (!d) return "—";
  return d.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
}

function formatHours(h?: number) {
  if (h == null) return "—";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h ${mm}m`;
}

function todayRange(): [Date, Date] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return [start, end];
}

function dateRangeFromStr(dateStr: string): [Date, Date] {
  const d = new Date(`${dateStr}T00:00:00`);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return [start, end];
}

interface EmployeeCardState {
  employee: Employee;
  openEntry: TimeClockEntry | null;
  loading: boolean;
  error: string | null;
}

export default function FichajesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cardStates, setCardStates] = useState<Map<string, EmployeeCardState>>(new Map());
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [filterEmployee, setFilterEmployee] = useState("all");

  const loadEntries = useCallback(async (dateStr: string) => {
    const [start, end] = dateRangeFromStr(dateStr);
    const result = await listTimeClockEntriesByDateRange(start, end);
    setEntries(result);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [emps, todayEntries] = await Promise.all([
      listActiveEmployees(),
      (async () => {
        const [s, e] = todayRange();
        return listTimeClockEntriesByDateRange(s, e);
      })(),
    ]);

    // Get open entries for all employees in parallel
    const openResults = await Promise.all(
      emps.map((emp) => getOpenClockEntryByEmployee(emp.id))
    );

    const stateMap = new Map<string, EmployeeCardState>();
    emps.forEach((emp, i) => {
      stateMap.set(emp.id, {
        employee: emp,
        openEntry: openResults[i],
        loading: false,
        error: null,
      });
    });

    setEmployees(emps);
    setCardStates(stateMap);
    setEntries(todayEntries);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    loadEntries(filterDate);
  }, [filterDate, loadEntries]);

  async function handleClockIn(emp: Employee) {
    setCardStates((prev) => {
      const next = new Map(prev);
      const s = next.get(emp.id);
      if (s) next.set(emp.id, { ...s, loading: true, error: null });
      return next;
    });
    try {
      await clockInEmployee(emp.id, emp.fullName, emp.locationId, emp.locationName);
      const open = await getOpenClockEntryByEmployee(emp.id);
      setCardStates((prev) => {
        const next = new Map(prev);
        next.set(emp.id, { employee: emp, openEntry: open, loading: false, error: null });
        return next;
      });
      // Refresh today entries if viewing today
      const today = new Date().toLocaleDateString("en-CA");
      if (filterDate === today) await loadEntries(today);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al fichar entrada.";
      setCardStates((prev) => {
        const next = new Map(prev);
        const s = next.get(emp.id);
        if (s) next.set(emp.id, { ...s, loading: false, error: msg });
        return next;
      });
    }
  }

  async function handleClockOut(emp: Employee, openEntry: TimeClockEntry) {
    setCardStates((prev) => {
      const next = new Map(prev);
      const s = next.get(emp.id);
      if (s) next.set(emp.id, { ...s, loading: true, error: null });
      return next;
    });
    try {
      await clockOutEmployee(openEntry.id);
      setCardStates((prev) => {
        const next = new Map(prev);
        next.set(emp.id, { employee: emp, openEntry: null, loading: false, error: null });
        return next;
      });
      const today = new Date().toLocaleDateString("en-CA");
      if (filterDate === today) await loadEntries(today);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al fichar salida.";
      setCardStates((prev) => {
        const next = new Map(prev);
        const s = next.get(emp.id);
        if (s) next.set(emp.id, { ...s, loading: false, error: msg });
        return next;
      });
    }
  }

  const filteredCards = useMemo(() => {
    const q = search.toLowerCase().trim();
    return employees.filter((emp) =>
      !q || emp.fullName.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const filteredEntries = useMemo(() => {
    if (filterEmployee === "all") return entries;
    return entries.filter((e) => e.employeeId === filterEmployee);
  }, [entries, filterEmployee]);

  const openCount = useMemo(
    () => [...cardStates.values()].filter((s) => s.openEntry !== null).length,
    [cardStates]
  );

  const todayStr = new Date().toLocaleDateString("en-CA");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold text-zinc-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Fichajes
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {openCount > 0 ? (
              <span className="text-amber-400">{openCount} empleado{openCount > 1 ? "s" : ""} trabajando ahora</span>
            ) : (
              "Sin fichajes activos"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 px-3 py-2 text-sm transition-colors"
          >
            <RefreshCw size={13} /> Actualizar
          </button>
          <Link
            href="/recursos-humanos/empleados/nuevo"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-3 py-2 text-sm transition-colors"
          >
            + Empleado
          </Link>
        </div>
      </div>

      {/* Employee search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empleado..."
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />
      </div>

      {/* Employee cards */}
      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-zinc-500">
            {employees.length === 0
              ? "No hay empleados activos."
              : "Sin coincidencias."}
          </p>
          {employees.length === 0 && (
            <Link
              href="/recursos-humanos/empleados/nuevo"
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Crear el primer empleado
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCards.map((emp) => {
            const state = cardStates.get(emp.id);
            const isWorking = !!state?.openEntry;
            const isLoading = state?.loading ?? false;
            const error = state?.error;

            return (
              <div
                key={emp.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                  isWorking
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100 leading-tight">
                      {emp.fullName}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {EMPLOYEE_ROLE_LABELS[emp.role]}
                    </p>
                    {emp.locationName && (
                      <p className="text-xs text-zinc-600">{emp.locationName}</p>
                    )}
                  </div>
                  {isWorking ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs text-amber-400">Trabajando</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600">No fichado</span>
                  )}
                </div>

                {isWorking && state?.openEntry && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300">
                    <Clock size={11} />
                    <span>Desde {formatTime(state.openEntry.clockInAt)}</span>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}

                <div className="mt-auto">
                  {isWorking && state?.openEntry ? (
                    <button
                      onClick={() => handleClockOut(emp, state.openEntry!)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <LogOut size={13} />
                      {isLoading ? "Registrando..." : "Fichar salida"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClockIn(emp)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <LogIn size={13} />
                      {isLoading ? "Registrando..." : "Fichar entrada"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Entries table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            Registro de fichajes
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="h-8 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="all">Todos los empleados</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
          </div>
        </div>

        {filterDate !== todayStr && (
          <p className="text-xs text-zinc-500">
            Mostrando fichajes del{" "}
            <span className="text-zinc-300">
              {new Date(`${filterDate}T12:00:00`).toLocaleDateString("es-HN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        )}

        {filteredEntries.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">Sin fichajes para este día.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 font-medium">Empleado</th>
                  <th className="pb-2 pl-4 font-medium">Entrada</th>
                  <th className="pb-2 pl-4 font-medium">Salida</th>
                  <th className="pb-2 pl-4 font-medium">Horas</th>
                  <th className="pb-2 pl-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="text-xs hover:bg-zinc-800/50 transition-colors">
                    <td className="py-2.5 text-zinc-200 font-medium">
                      <p>{entry.employeeName}</p>
                      {entry.locationName && (
                        <p className="text-zinc-600">{entry.locationName}</p>
                      )}
                    </td>
                    <td className="py-2.5 pl-4 text-zinc-300 font-mono">{formatTime(entry.clockInAt)}</td>
                    <td className="py-2.5 pl-4 text-zinc-300 font-mono">{formatTime(entry.clockOutAt)}</td>
                    <td className="py-2.5 pl-4 text-zinc-400">{formatHours(entry.totalHours)}</td>
                    <td className="py-2.5 pl-4">
                      <Badge variant={entry.status === "open" ? "amber" : entry.status === "corrected" ? "blue" : "green"}>
                        {entry.status === "open" ? "Trabajando" : entry.status === "corrected" ? "Corregido" : "Completado"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {filteredEntries.length > 0 && (
          <div className="flex items-center justify-between text-xs border-t border-zinc-800 pt-3">
            <span className="text-zinc-500">{filteredEntries.length} registro{filteredEntries.length > 1 ? "s" : ""}</span>
            <span className="text-zinc-400">
              Total horas:{" "}
              <span className="text-zinc-200 font-medium font-mono">
                {formatHours(filteredEntries.reduce((s, e) => s + (e.totalHours ?? 0), 0))}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
