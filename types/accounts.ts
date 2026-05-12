// ── Company Accounts ──────────────────────────────────────

export type AccountType = "bank" | "cash" | "credit" | "other";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Cuenta bancaria",
  cash: "Caja / Efectivo",
  credit: "Tarjeta de crédito",
  other: "Otro",
};

export const ACCOUNT_TYPES: AccountType[] = ["bank", "cash", "credit", "other"];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Expense Payments ──────────────────────────────────────

export interface ExpensePayment {
  id: string;
  expenseId: string;
  amount: number;
  date: Date;
  accountId: string;
  accountName: string;
  notes?: string;
  createdAt: Date;
}
