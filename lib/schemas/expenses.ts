import { z } from "zod";

const EXPENSE_CATEGORIES = [
  "electricity", "water", "rent", "salaries", "fuel",
  "internet", "advertising", "maintenance", "tools", "transport", "other",
] as const;

const EXPENSE_PAYMENT_METHODS = ["cash", "bank_transfer", "card", "other"] as const;

// ── Line item ────────────────────────────────────────────

export const lineItemSchema = z.object({
  sku: z.string().optional(),
  inventoryItemId: z.string().optional(),
  description: z.string().min(1, "Descripción requerida"),
  quantity: z.number().positive("Debe ser mayor a 0"),
  unitPrice: z.number().min(0, "Debe ser 0 o más"),
});

export type LineItemValues = z.input<typeof lineItemSchema>;

// ── ExpenseSchema ─────────────────────────────────────────

export const expenseSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  category: z.enum(EXPENSE_CATEGORIES, { message: "Selecciona una categoría" }),
  amount: z
    .number()
    .positive("El monto debe ser mayor a 0"),
  locationId: z.string().min(1, "Selecciona una ubicación"),
  locationName: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS, {
    message: "Selecciona un método de pago",
  }),
  invoiceNumber: z.string().optional(),
  dueDate: z.string().optional(),
  supplierName: z.string().optional(),
  receiptUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

export const updateExpenseSchema = expenseSchema.partial();

export type ExpenseFormValues = z.input<typeof expenseSchema>;
