// ── Employee ──────────────────────────────────────────────

export type EmployeeRole =
  | "carpenter"
  | "installer"
  | "seller"
  | "admin"
  | "manager"
  | "driver"
  | "other";

export type EmployeeDepartment =
  | "workshop"
  | "store"
  | "installation"
  | "administration"
  | "management"
  | "other";

export type EmployeePaymentType =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "hourly"
  | "other";

export type EmployeeStatus = "active" | "inactive";

export const EMPLOYEE_ROLE_LABELS: Record<EmployeeRole, string> = {
  carpenter: "Carpintero",
  installer: "Instalador",
  seller: "Vendedor",
  admin: "Administrativo",
  manager: "Gerente",
  driver: "Conductor",
  other: "Otro",
};

export const EMPLOYEE_DEPARTMENT_LABELS: Record<EmployeeDepartment, string> = {
  workshop: "Taller",
  store: "Tienda",
  installation: "Instalaciones",
  administration: "Administración",
  management: "Gerencia",
  other: "Otro",
};

export const EMPLOYEE_PAYMENT_TYPE_LABELS: Record<EmployeePaymentType, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  hourly: "Por hora",
  other: "Otro",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
};

export interface Employee {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  documentId?: string;
  role: EmployeeRole;
  department: EmployeeDepartment;
  locationId?: string;
  locationName?: string;
  weeklySalary?: number;
  monthlySalary?: number;
  hourlyRate?: number;
  paymentType: EmployeePaymentType;
  status: EmployeeStatus;
  startDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── TimeClockEntry ────────────────────────────────────────

export type TimeClockStatus = "open" | "closed" | "corrected";

export const TIME_CLOCK_STATUS_LABELS: Record<TimeClockStatus, string> = {
  open: "Trabajando",
  closed: "Completado",
  corrected: "Corregido",
};

export interface TimeClockEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  clockInAt: Date;
  clockOutAt?: Date;
  totalHours?: number;
  locationId?: string;
  locationName?: string;
  notes?: string;
  status: TimeClockStatus;
  createdAt: Date;
  updatedAt: Date;
}
