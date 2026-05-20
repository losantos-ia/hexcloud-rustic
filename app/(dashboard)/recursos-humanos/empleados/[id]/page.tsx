"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Pencil, LogIn, LogOut, Clock, Users,
  Phone, Mail, FileText, ShieldCheck, ShieldOff, UserX, UserPlus, Eye, EyeOff,
} from "lucide-react";
import {
  getEmployeeById,
  updateEmployee,
  listTimeClockEntriesByEmployee,
  clockInEmployee,
  clockOutEmployee,
  getOpenClockEntryByEmployee,
  setEmployeeUserDisabled,
} from "@/lib/firestore/hr";
import type { UserRole } from "@/types/user";
import { USER_ROLE_LABELS } from "@/types/user";
import type { Employee, TimeClockEntry } from "@/types/hr";
import {
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_DEPARTMENT_LABELS,
  EMPLOYEE_PAYMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
} from "@/types/hr";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

function formatDateTime(d?: Date) {
  if (!d) return "—";
  return d.toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(d?: Date) {
  if (!d) return "—";
  return d.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(d?: Date) {
  if (!d) return "—";
  return d.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatHours(h?: number) {
  if (h == null) return "—";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h ${mm}m`;
}

function salaryLabel(emp: Employee): string {
  if (emp.hourlyRate != null) return `L ${emp.hourlyRate.toFixed(2)} / hora`;
  if (emp.weeklySalary != null) return `L ${emp.weeklySalary.toLocaleString("es-HN")} / semana`;
  if (emp.monthlySalary != null) return `L ${emp.monthlySalary.toLocaleString("es-HN")} / mes`;
  return "—";
}

export default function EmpleadoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [openEntry, setOpenEntry] = useState<TimeClockEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [clockError, setClockError] = useState<string | null>(null);

  // User account management
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountOk, setAccountOk] = useState<string | null>(null);

  // Create account form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("vendedor");
  const [showPwd, setShowPwd] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [emp, allEntries, open] = await Promise.all([
      getEmployeeById(id),
      listTimeClockEntriesByEmployee(id),
      getOpenClockEntryByEmployee(id),
    ]);
    if (!emp) { router.push("/recursos-humanos/empleados"); return; }
    setEmployee(emp);
    setEntries(allEntries);
    setOpenEntry(open);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function handleClockIn() {
    if (!employee) return;
    setClockLoading(true);
    setClockError(null);
    try {
      await clockInEmployee(
        employee.id,
        employee.fullName,
        employee.locationId,
        employee.locationName
      );
      await load();
    } catch (e: unknown) {
      setClockError(e instanceof Error ? e.message : "Error al registrar entrada.");
    } finally {
      setClockLoading(false);
    }
  }

  async function handleClockOut() {
    if (!openEntry) return;
    setClockLoading(true);
    setClockError(null);
    try {
      await clockOutEmployee(openEntry.id);
      await load();
    } catch (e: unknown) {
      setClockError(e instanceof Error ? e.message : "Error al registrar salida.");
    } finally {
      setClockLoading(false);
    }
  }

  async function toggleStatus() {
    if (!employee) return;
    const newStatus = employee.status === "active" ? "inactive" : "active";
    await updateEmployee(id, { status: newStatus });
    setEmployee({ ...employee, status: newStatus });
  }

  async function handleToggleUser(disabled: boolean) {
    if (!employee?.uid) return;
    setAccountLoading(true);
    setAccountError(null);
    setAccountOk(null);
    try {
      const res = await fetch(`/api/hr/users/${employee.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      if (!res.ok) {
        const body = await res.json();
        setAccountError(body.error ?? "Error al actualizar la cuenta.");
        return;
      }
      await setEmployeeUserDisabled(id, disabled);
      setEmployee({ ...employee, userDisabled: disabled });
      setAccountOk(disabled ? "Cuenta desactivada." : "Cuenta activada.");
      setTimeout(() => setAccountOk(null), 3000);
    } catch {
      setAccountError("Error de conexión.");
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (!employee?.uid) return;
    if (!confirm(`¿Eliminar la cuenta de acceso de ${employee.fullName}? Esta acción no se puede deshacer.`)) return;
    setAccountLoading(true);
    setAccountError(null);
    setAccountOk(null);
    try {
      const res = await fetch(`/api/hr/users/${employee.uid}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        setAccountError(body.error ?? "Error al eliminar la cuenta.");
        return;
      }
      setEmployee({ ...employee, uid: undefined, userDisabled: undefined });
      setAccountOk("Cuenta eliminada correctamente.");
      setTimeout(() => setAccountOk(null), 3000);
    } catch {
      setAccountError("Error de conexión.");
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    setCreateAccountError(null);
    if (newPassword.length < 6) {
      setCreateAccountError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setCreatingAccount(true);
    try {
      const res = await fetch("/api/hr/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          displayName: employee.fullName,
          role: newRole,
          employeeId: id,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setCreateAccountError(body.error ?? "Error al crear la cuenta.");
        return;
      }
      setEmployee({ ...employee, uid: body.uid, userDisabled: false });
      setShowCreateForm(false);
      setNewEmail(""); setNewPassword("");
      setAccountOk("Cuenta creada correctamente.");
      setTimeout(() => setAccountOk(null), 3000);
    } catch {
      setCreateAccountError("Error de conexión.");
    } finally {
      setCreatingAccount(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Cargando...
      </div>
    );
  }
  if (!employee) return null;

  // Hours this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEntries = entries.filter((e) => e.date >= monthStart);
  const monthHours = monthEntries.reduce((s, e) => s + (e.totalHours ?? 0), 0);

  const recentEntries = entries.slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/recursos-humanos/empleados"
            className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1
              className="text-xl font-bold text-zinc-100"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {employee.fullName}
            </h1>
            <p className="text-xs text-zinc-500">
              {EMPLOYEE_ROLE_LABELS[employee.role]} · {EMPLOYEE_DEPARTMENT_LABELS[employee.department]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clock actions */}
          {employee.status === "active" && (
            openEntry ? (
              <button
                onClick={handleClockOut}
                disabled={clockLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LogOut size={14} />
                {clockLoading ? "..." : "Fichar salida"}
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={clockLoading}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LogIn size={14} />
                {clockLoading ? "..." : "Fichar entrada"}
              </button>
            )
          )}
          <Link
            href={`/recursos-humanos/empleados/${id}/editar`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-3 py-2 text-sm transition-colors"
          >
            <Pencil size={14} /> Editar
          </Link>
        </div>
      </div>

      {clockError && (
        <p className="text-sm text-red-400 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          {clockError}
        </p>
      )}

      {openEntry && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-2">
          <Clock size={14} className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            Trabajando desde <strong>{formatTime(openEntry.clockInAt)}</strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Employee info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-300">Información del empleado</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {employee.phone && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Phone size={13} className="text-zinc-500" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail size={13} className="text-zinc-500" />
                  <span>{employee.email}</span>
                </div>
              )}
              {employee.documentId && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <FileText size={13} className="text-zinc-500" />
                  <span>{employee.documentId}</span>
                </div>
              )}
              {employee.locationName && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Users size={13} className="text-zinc-500" />
                  <span>{employee.locationName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Labor data */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-300">Datos laborales</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Rol</p>
                <p className="text-sm text-zinc-200">{EMPLOYEE_ROLE_LABELS[employee.role]}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Departamento</p>
                <p className="text-sm text-zinc-200">{EMPLOYEE_DEPARTMENT_LABELS[employee.department]}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Estado</p>
                <Badge variant={employee.status === "active" ? "green" : "default"}>
                  {EMPLOYEE_STATUS_LABELS[employee.status]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Tipo de pago</p>
                <p className="text-sm text-zinc-200">{EMPLOYEE_PAYMENT_TYPE_LABELS[employee.paymentType]}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Salario</p>
                <p className="text-sm text-zinc-200 font-mono">{salaryLabel(employee)}</p>
              </div>
              {employee.startDate && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Inicio</p>
                  <p className="text-sm text-zinc-200">{formatDate(employee.startDate)}</p>
                </div>
              )}
            </div>
            {employee.notes && (
              <p className="text-xs text-zinc-400 border-t border-zinc-800 pt-3 mt-1">
                {employee.notes}
              </p>
            )}
          </div>

          {/* Recent clock entries */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300">Últimos fichajes</h2>
              <Link
                href="/recursos-humanos/fichajes"
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Ver todos
              </Link>
            </div>
            {recentEntries.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Sin fichajes registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                      <th className="pb-2 font-medium">Fecha</th>
                      <th className="pb-2 pl-4 font-medium">Entrada</th>
                      <th className="pb-2 pl-4 font-medium">Salida</th>
                      <th className="pb-2 pl-4 font-medium">Horas</th>
                      <th className="pb-2 pl-4 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {recentEntries.map((entry) => (
                      <tr key={entry.id} className="text-xs">
                        <td className="py-2 text-zinc-400">{formatDate(entry.date)}</td>
                        <td className="py-2 pl-4 text-zinc-300 font-mono">{formatTime(entry.clockInAt)}</td>
                        <td className="py-2 pl-4 text-zinc-300 font-mono">{formatTime(entry.clockOutAt)}</td>
                        <td className="py-2 pl-4 text-zinc-400">{formatHours(entry.totalHours)}</td>
                        <td className="py-2 pl-4">
                          <Badge variant={entry.status === "open" ? "amber" : "green"}>
                            {entry.status === "open" ? "Abierto" : "Cerrado"}
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

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Hours this month */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Horas este mes</h2>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Días trabajados</span>
                <span className="text-zinc-200">{monthEntries.filter((e) => e.status !== "open").length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Total horas</span>
                <span className="text-zinc-200 font-mono font-medium">{formatHours(monthHours)}</span>
              </div>
            </div>
          </div>

          {/* Account management */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-300">Cuenta de acceso</h2>

            {accountError && (
              <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">{accountError}</p>
            )}
            {accountOk && (
              <p className="text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">{accountOk}</p>
            )}

            {employee.uid ? (
              <>
                <div className="flex items-center gap-2">
                  {employee.userDisabled ? (
                    <span className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1">
                      <ShieldOff size={12} /> Cuenta desactivada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1">
                      <ShieldCheck size={12} /> Cuenta activa
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {employee.userDisabled ? (
                    <button
                      onClick={() => handleToggleUser(false)}
                      disabled={accountLoading}
                      className="text-left w-full rounded-lg px-3 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <ShieldCheck size={13} />
                      {accountLoading ? "Activando…" : "Activar cuenta"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleUser(true)}
                      disabled={accountLoading}
                      className="text-left w-full rounded-lg px-3 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <ShieldOff size={13} />
                      {accountLoading ? "Desactivando…" : "Desactivar cuenta"}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteUser}
                    disabled={accountLoading}
                    className="text-left w-full rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <UserX size={13} />
                    {accountLoading ? "Eliminando…" : "Eliminar cuenta"}
                  </button>
                </div>
              </>
            ) : showCreateForm ? (
              <form onSubmit={handleCreateAccount} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400">Correo *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                    required
                    className="flex h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                      required
                      className="flex h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 pr-9 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                      {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400">Rol *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="flex h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {createAccountError && <p className="text-xs text-red-400">{createAccountError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={creatingAccount} className="flex-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold py-2 disabled:opacity-50 transition-colors">
                    {creatingAccount ? "Creando…" : "Crear cuenta"}
                  </button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="rounded-lg border border-zinc-700 text-xs text-zinc-400 px-3 py-2 hover:border-zinc-500 transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-zinc-500">Este empleado no tiene cuenta de acceso.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-left w-full rounded-lg px-3 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors flex items-center gap-2"
                >
                  <UserPlus size={13} /> Crear cuenta de acceso
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-zinc-300 mb-1">Acciones</h2>
            <button
              onClick={toggleStatus}
              className="text-left w-full rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              {employee.status === "active" ? "Marcar como inactivo" : "Activar empleado"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
