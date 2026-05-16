import { z } from "zod";

const ROLES = ["carpenter", "installer", "seller", "admin", "manager", "driver", "other"] as const;
const DEPARTMENTS = ["workshop", "store", "installation", "administration", "management", "other"] as const;
const PAYMENT_TYPES = ["weekly", "biweekly", "monthly", "hourly", "other"] as const;
const STATUSES = ["active", "inactive"] as const;
const CLOCK_STATUSES = ["open", "closed", "corrected"] as const;

export const employeeSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
  email: z.string().optional(),
  documentId: z.string().optional(),
  role: z.enum(ROLES),
  department: z.enum(DEPARTMENTS),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  weeklySalary: z.number().min(0).optional(),
  monthlySalary: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  paymentType: z.enum(PAYMENT_TYPES),
  status: z.enum(STATUSES),
  startDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEmployeeSchema = employeeSchema.partial().extend({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
});

export const timeClockEntrySchema = z.object({
  employeeId: z.string().min(1, "El empleado es obligatorio"),
  employeeName: z.string().min(1),
  date: z.string().min(1, "La fecha es obligatoria"),
  clockInAt: z.string().min(1, "La hora de entrada es obligatoria"),
  clockOutAt: z.string().optional(),
  totalHours: z.number().min(0).optional(),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(CLOCK_STATUSES).optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
export type UpdateEmployeeFormValues = z.infer<typeof updateEmployeeSchema>;
export type TimeClockEntryFormValues = z.infer<typeof timeClockEntrySchema>;
