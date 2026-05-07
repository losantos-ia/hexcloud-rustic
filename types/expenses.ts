// ── Expense ───────────────────────────────────────────────

export type ExpenseCategory =
  | "electricity"
  | "water"
  | "rent"
  | "salaries"
  | "fuel"
  | "internet"
  | "advertising"
  | "maintenance"
  | "tools"
  | "transport"
  | "other";

export type ExpensePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "card"
  | "other";

// ── Labels ────────────────────────────────────────────────

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  electricity: "Electricidad",
  water: "Agua",
  rent: "Alquiler",
  salaries: "Salarios",
  fuel: "Combustible",
  internet: "Internet",
  advertising: "Publicidad",
  maintenance: "Mantenimiento",
  tools: "Herramientas",
  transport: "Transporte",
  other: "Otro",
};

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia bancaria",
  card: "Tarjeta",
  other: "Otro",
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "electricity", "water", "rent", "salaries", "fuel",
  "internet", "advertising", "maintenance", "tools", "transport", "other",
];

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] = [
  "cash", "bank_transfer", "card", "other",
];

// ── Interface ─────────────────────────────────────────────

export interface Expense {
  id: string;
  expenseNumber: string;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  locationId: string;
  locationName?: string;
  description?: string;
  paymentMethod: ExpensePaymentMethod;
  invoiceNumber?: string;
  dueDate?: Date;
  supplierName?: string;
  receiptUrl?: string;
  notes?: string;
  lineItems?: { sku?: string; inventoryItemId?: string; description: string; quantity: number; unitPrice: number }[];
  createdAt: Date;
  updatedAt: Date;
}
