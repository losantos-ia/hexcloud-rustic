import { z } from "zod";

const EXPENSE_CATEGORIES = [
  "electricity", "water", "rent", "salaries", "fuel",
  "internet", "advertising", "maintenance", "tools", "transport", "other",
] as const;

const EXPENSE_PAYMENT_METHODS = ["cash", "bank_transfer", "card", "other"] as const;

// ── ExpenseSchema ─────────────────────────────────────────

export const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Selecciona una categoría" }),
  amount: z
    .number({ invalid_type_error: "El monto es obligatorio" })
    .positive("El monto debe ser mayor a 0"),
  locationId: z.string().min(1, "Selecciona una ubicación"),
  locationName: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS, {
    message: "Selecciona un método de pago",
  }),
  supplierName: z.string().optional(),
  receiptUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const updateExpenseSchema = expenseSchema.partial();

export type ExpenseFormValues = z.input<typeof expenseSchema>;
