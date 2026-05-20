"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { listEmployees } from "@/lib/firestore/hr";
import type { Employee, EmployeeRole, EmployeeDepartment, EmployeeStatus } from "@/types/hr";
import {
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_DEPARTMENT_LABELS,
  EMPLOYEE_PAYMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/types/hr";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<EmployeeStatus, BadgeVariant> = {
  active: "green",
  inactive: "default",
};

function salaryLabel(emp: Employee): string {
  if (emp.hourlyRate != null) return `L ${emp.hourlyRate.toFixed(2)}/h`;
  if (emp.weeklySalary != null) return `L ${emp.weeklySalary.toLocaleString("es-HN")} / sem`;
  if (emp.monthlySalary != null) return `L ${emp.monthlySalary.toLocaleString("es-HN")} / mes`;
  return "—";
}

export default function EmpleadosPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<EmployeeRole | "all">("all");
  const [filterDept, setFilterDept] = useState<EmployeeDepartment | "all">("all");
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | "all">("all");

  useEffect(() => {
    listEmployees()
      .then(setEmployees)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return employees.filter((e) => {
      if (filterRole !== "all" && e.role !== filterRole) return false;
      if (filterDept !== "all" && e.department !== filterDept) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (q) {
        return (
          e.fullName.toLowerCase().includes(q) ||
          (e.phone?.toLowerCase().includes(q) ?? false) ||
          (e.documentId?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [employees, search, filterRole, filterDept, filterStatus]);

  const selectClass =
    "h-9 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold text-zinc-100"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Empleados
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {employees.filter((e) => e.status === "active").length} activos de {employees.length} total
          </p>
        </div>
        <Link
          href="/recursos-humanos/empleados/nuevo"
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 text-sm font-semibold transition-colors"
        >
          <Plus size={14} /> Nuevo empleado
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, DNI..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as EmployeeRole | "all")}
          className={selectClass}
        >
          <option value="all">Todos los roles</option>
          {(Object.entries(EMPLOYEE_ROLE_LABELS) as [EmployeeRole, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value as EmployeeDepartment | "all")}
          className={selectClass}
        >
          <option value="all">Todos los departamentos</option>
          {(Object.entries(EMPLOYEE_DEPARTMENT_LABELS) as [EmployeeDepartment, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as EmployeeStatus | "all")}
          className={selectClass}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-zinc-400">Sin empleados</p>
          <p className="text-xs text-zinc-600">
            {search || filterRole !== "all" || filterDept !== "all" || filterStatus !== "all"
              ? "Prueba cambiando los filtros"
              : "Crea el primer empleado para comenzar"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Nombre</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Rol</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Departamento</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Ubicación</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Tipo pago</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Salario</th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/recursos-humanos/empleados/${emp.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-100">{emp.fullName}</p>
                    {emp.phone && <p className="text-xs text-zinc-500">{emp.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">{EMPLOYEE_ROLE_LABELS[emp.role]}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{EMPLOYEE_DEPARTMENT_LABELS[emp.department]}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{emp.locationName ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{EMPLOYEE_PAYMENT_TYPE_LABELS[emp.paymentType]}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs font-mono">{salaryLabel(emp)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[emp.status]}>
                      {EMPLOYEE_STATUS_LABELS[emp.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-zinc-800">
            {filtered.map((emp) => (
              <Link
                key={emp.id}
                href={`/recursos-humanos/empleados/${emp.id}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-zinc-100">{emp.fullName}</p>
                  <p className="text-xs text-zinc-500">
                    {EMPLOYEE_ROLE_LABELS[emp.role]} · {EMPLOYEE_DEPARTMENT_LABELS[emp.department]}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[emp.status]}>
                  {EMPLOYEE_STATUS_LABELS[emp.status]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
