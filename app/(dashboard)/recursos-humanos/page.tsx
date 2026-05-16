"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Clock, Plus, ArrowRight, LogIn } from "lucide-react";
import {
  listActiveEmployees,
  listTimeClockEntriesByDateRange,
} from "@/lib/firestore/hr";
import type { Employee, TimeClockEntry } from "@/types/hr";
import { EMPLOYEE_ROLE_LABELS } from "@/types/hr";
import { Badge } from "@/components/ui/badge";

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

export default function RecursosHumanosDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayEntries, setTodayEntries] = useState<TimeClockEntry[]>([]);
  const [weekEntries, setWeekEntries] = useState<TimeClockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

    Promise.all([
      listActiveEmployees(),
      listTimeClockEntriesByDateRange(todayStart, todayEnd),
      listTimeClockEntriesByDateRange(weekStart, todayEnd),
    ])
      .then(([emps, today, week]) => {
        setEmployees(emps);
        setTodayEntries(today);
        setWeekEntries(week);
      })
      .finally(() => setLoading(false));
  }, []);

  const openEntries = todayEntries.filter((e) => e.status === "open");
  const todayHours = todayEntries.reduce((s, e) => s + (e.totalHours ?? 0), 0);
  const weekHours = weekEntries.reduce((s, e) => s + (e.totalHours ?? 0), 0);

  const recentEntries = todayEntries.slice(0, 8);

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
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-zinc-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Recursos Humanos
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Control de empleados y fichajes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/recursos-humanos/fichajes"
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 text-sm font-semibold transition-colors"
          >
            <LogIn size={14} /> Fichajes
          </Link>
          <Link
            href="/recursos-humanos/empleados/nuevo"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 px-3 py-2 text-sm transition-colors"
          >
            <Plus size={14} /> Nuevo empleado
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <Users size={14} />
            <span className="text-xs">Empleados activos</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">{employees.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock size={14} />
            <span className="text-xs text-zinc-500">Fichajes abiertos</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{openEntries.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clock size={14} />
            <span className="text-xs">Horas hoy</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">{formatHours(todayHours)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-500">
            <Clock size={14} />
            <span className="text-xs">Horas esta semana</span>
          </div>
          <p className="text-2xl font-bold text-zinc-100">{formatHours(weekHours)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick access — employees */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Empleados activos</h2>
            <Link
              href="/recursos-humanos/empleados"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {employees.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">
              Sin empleados activos.{" "}
              <Link href="/recursos-humanos/empleados/nuevo" className="text-amber-400 hover:underline">
                Crear el primero
              </Link>
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-800">
              {employees.slice(0, 6).map((emp) => (
                <Link
                  key={emp.id}
                  href={`/recursos-humanos/empleados/${emp.id}`}
                  className="flex items-center justify-between py-2.5 hover:text-amber-400 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-amber-400">
                      {emp.fullName}
                    </p>
                    <p className="text-xs text-zinc-500">{EMPLOYEE_ROLE_LABELS[emp.role]}</p>
                  </div>
                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-amber-400" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent clock entries today */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Fichajes de hoy</h2>
            <Link
              href="/recursos-humanos/fichajes"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              Ir a fichajes <ArrowRight size={12} />
            </Link>
          </div>
          {recentEntries.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">Sin fichajes hoy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                    <th className="pb-2 font-medium">Empleado</th>
                    <th className="pb-2 pl-4 font-medium">Entrada</th>
                    <th className="pb-2 pl-4 font-medium">Salida</th>
                    <th className="pb-2 pl-4 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="text-xs">
                      <td className="py-2 text-zinc-200 font-medium">{entry.employeeName}</td>
                      <td className="py-2 pl-4 text-zinc-400 font-mono">{formatTime(entry.clockInAt)}</td>
                      <td className="py-2 pl-4 text-zinc-400 font-mono">{formatTime(entry.clockOutAt)}</td>
                      <td className="py-2 pl-4">
                        <Badge variant={entry.status === "open" ? "amber" : "green"}>
                          {entry.status === "open" ? "Trabajando" : "Completado"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
