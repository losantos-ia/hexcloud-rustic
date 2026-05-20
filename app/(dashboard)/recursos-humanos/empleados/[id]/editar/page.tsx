"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { employeeSchema, type EmployeeFormValues } from "@/lib/schemas/hr";
import { getEmployeeById, updateEmployee } from "@/lib/firestore/hr";
import { listInventoryLocations } from "@/lib/firestore/inventory";
import type { InventoryLocation } from "@/types/inventory";
import type { Employee } from "@/types/hr";
import {
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_DEPARTMENT_LABELS,
  EMPLOYEE_PAYMENT_TYPE_LABELS,
} from "@/types/hr";
import type { EmployeeRole, EmployeeDepartment, EmployeePaymentType } from "@/types/hr";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50";

export default function EditarEmpleadoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
  });

  const paymentType = watch("paymentType");

  useEffect(() => {
    Promise.all([
      getEmployeeById(id),
      listInventoryLocations().then((l) => l.filter((x) => x.isActive)),
    ]).then(([emp, locs]) => {
      if (!emp) { router.push("/recursos-humanos/empleados"); return; }
      setEmployee(emp);
      setLocations(locs);
      reset({
        fullName: emp.fullName,
        phone: emp.phone ?? "",
        email: emp.email ?? "",
        documentId: emp.documentId ?? "",
        role: emp.role,
        department: emp.department,
        locationId: emp.locationId ?? "",
        paymentType: emp.paymentType,
        weeklySalary: emp.weeklySalary,
        monthlySalary: emp.monthlySalary,
        hourlyRate: emp.hourlyRate,
        status: emp.status,
        startDate: emp.startDate ? emp.startDate.toISOString().split("T")[0] : "",
        notes: emp.notes ?? "",
      });
      setLoading(false);
    });
  }, [id, router, reset]);

  async function onSubmit(values: EmployeeFormValues) {
    setServerError(null);
    try {
      const selectedLoc = locations.find((l) => l.id === values.locationId);
      await updateEmployee(id, {
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        documentId: values.documentId?.trim() || undefined,
        role: values.role,
        department: values.department,
        locationId: values.locationId || undefined,
        locationName: selectedLoc?.name || undefined,
        weeklySalary: values.weeklySalary,
        monthlySalary: values.monthlySalary,
        hourlyRate: values.hourlyRate,
        paymentType: values.paymentType,
        status: values.status,
        startDate: values.startDate ? new Date(`${values.startDate}T12:00:00`) : undefined,
        notes: values.notes?.trim() || undefined,
      });
      router.push(`/recursos-humanos/empleados/${id}`);
    } catch {
      setServerError("Error al guardar los cambios. Intenta de nuevo.");
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

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/recursos-humanos/empleados/${id}`}
          className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Editar empleado
          </h1>
          <p className="text-xs text-zinc-500">{employee.fullName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Personal info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Información personal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="fullName">Nombre completo *</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" {...register("email")} type="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="documentId">DNI / Identidad</Label>
              <Input id="documentId" {...register("documentId")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <Input id="startDate" {...register("startDate")} type="date" />
            </div>
          </div>
        </div>

        {/* Work info */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Datos laborales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Rol *</Label>
              <select id="role" {...register("role")} className={selectClass}>
                {(Object.entries(EMPLOYEE_ROLE_LABELS) as [EmployeeRole, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department">Departamento *</Label>
              <select id="department" {...register("department")} className={selectClass}>
                {(Object.entries(EMPLOYEE_DEPARTMENT_LABELS) as [EmployeeDepartment, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="locationId">Ubicación</Label>
              <select id="locationId" {...register("locationId")} className={selectClass}>
                <option value="">Sin asignar</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Estado</Label>
              <select id="status" {...register("status")} className={selectClass}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-300">Salario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentType">Tipo de pago *</Label>
              <select id="paymentType" {...register("paymentType")} className={selectClass}>
                {(Object.entries(EMPLOYEE_PAYMENT_TYPE_LABELS) as [EmployeePaymentType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {paymentType === "weekly" && (
              <div className="flex flex-col gap-1.5">
                <Label>Salario semanal (L)</Label>
                <Input type="number" step="0.01" {...register("weeklySalary", { valueAsNumber: true })} />
              </div>
            )}
            {(paymentType === "monthly" || paymentType === "biweekly") && (
              <div className="flex flex-col gap-1.5">
                <Label>Salario mensual (L)</Label>
                <Input type="number" step="0.01" {...register("monthlySalary", { valueAsNumber: true })} />
              </div>
            )}
            {paymentType === "hourly" && (
              <div className="flex flex-col gap-1.5">
                <Label>Tarifa por hora (L)</Label>
                <Input type="number" step="0.01" {...register("hourlyRate", { valueAsNumber: true })} />
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-300">Notas</h2>
          <Textarea {...register("notes")} rows={3} />
        </div>

        {serverError && (
          <p className="text-sm text-red-400 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Link
            href={`/recursos-humanos/empleados/${id}`}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  );
}
