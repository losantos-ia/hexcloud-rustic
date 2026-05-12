// ── Treasury Account ─────────────────────────────────────

export type TreasuryAccountType =
  | "bank"
  | "cash"
  | "store_cash"
  | "savings"
  | "profits"
  | "other";

export const TREASURY_ACCOUNT_TYPE_LABELS: Record<TreasuryAccountType, string> = {
  bank: "Cuenta bancaria",
  cash: "Caja efectivo",
  store_cash: "Caja tienda",
  savings: "Ahorro",
  profits: "Beneficios",
  other: "Otro",
};

export const TREASURY_ACCOUNT_TYPES: TreasuryAccountType[] = [
  "bank",
  "cash",
  "store_cash",
  "savings",
  "profits",
  "other",
];

export interface TreasuryAccount {
  id: string;
  name: string;
  type: TreasuryAccountType;
  bankName?: string;
  accountNumber?: string;
  currency: string; // default "HNL"
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Treasury Movement ─────────────────────────────────────

export type TreasuryMovementType =
  | "income"
  | "expense"
  | "transfer_in"
  | "transfer_out"
  | "adjustment";

export const TREASURY_MOVEMENT_TYPE_LABELS: Record<TreasuryMovementType, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer_in: "Transferencia entrada",
  transfer_out: "Transferencia salida",
  adjustment: "Ajuste",
};

export type TreasuryReferenceType =
  | "purchase"
  | "expense"
  | "sale"
  | "transfer"
  | "manual"
  | "other";

export interface TreasuryMovement {
  id: string;
  treasuryAccountId: string;
  type: TreasuryMovementType;
  amount: number; // always positive; direction determined by type
  date: Date;
  referenceType?: TreasuryReferenceType;
  referenceId?: string;
  description: string;
  createdBy?: string;
  createdAt: Date;
}
