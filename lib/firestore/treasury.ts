import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  TreasuryAccount,
  TreasuryAccountType,
  TreasuryMovement,
  TreasuryMovementType,
  TreasuryReferenceType,
} from "@/types/treasury";

const ACCOUNTS_COL = "treasuryAccounts";
const MOVEMENTS_COL = "treasuryMovements";

// ── Helpers ───────────────────────────────────────────────

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToAccount(id: string, data: Record<string, any>): TreasuryAccount {
  return {
    id,
    name: data.name,
    type: data.type as TreasuryAccountType,
    bankName: data.bankName ?? undefined,
    accountNumber: data.accountNumber ?? undefined,
    currency: data.currency ?? "HNL",
    openingBalance: data.openingBalance ?? 0,
    currentBalance: data.currentBalance ?? 0,
    isActive: data.isActive ?? true,
    notes: data.notes ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToMovement(id: string, data: Record<string, any>): TreasuryMovement {
  return {
    id,
    treasuryAccountId: data.treasuryAccountId,
    type: data.type as TreasuryMovementType,
    amount: data.amount,
    date: toDate(data.date),
    referenceType: data.referenceType ?? undefined,
    referenceId: data.referenceId ?? undefined,
    description: data.description,
    createdBy: data.createdBy ?? undefined,
    createdAt: toDate(data.createdAt),
  };
}

/** Returns +amount for credits, -amount for debits */
function balanceDelta(type: TreasuryMovementType, amount: number): number {
  switch (type) {
    case "income":
    case "transfer_in":
      return amount;
    case "expense":
    case "transfer_out":
      return -amount;
    case "adjustment":
      return amount; // caller passes positive or negative
  }
}

// ── Treasury Accounts ─────────────────────────────────────

export async function listTreasuryAccounts(): Promise<TreasuryAccount[]> {
  const snap = await getDocs(
    query(collection(db, ACCOUNTS_COL), orderBy("name", "asc"))
  );
  return snap.docs.map((d) => docToAccount(d.id, d.data()));
}

export async function getTreasuryAccountById(id: string): Promise<TreasuryAccount | null> {
  const snap = await getDoc(doc(db, ACCOUNTS_COL, id));
  if (!snap.exists()) return null;
  return docToAccount(snap.id, snap.data());
}

export async function createTreasuryAccount(data: {
  name: string;
  type: TreasuryAccountType;
  bankName?: string;
  accountNumber?: string;
  currency?: string;
  openingBalance?: number;
  notes?: string;
}): Promise<string> {
  const opening = data.openingBalance ?? 0;
  const ref = await addDoc(collection(db, ACCOUNTS_COL), {
    name: data.name,
    type: data.type,
    bankName: data.bankName ?? null,
    accountNumber: data.accountNumber ?? null,
    currency: data.currency ?? "HNL",
    openingBalance: opening,
    currentBalance: opening,
    isActive: true,
    notes: data.notes ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTreasuryAccount(
  id: string,
  data: Partial<{
    name: string;
    type: TreasuryAccountType;
    bankName: string;
    accountNumber: string;
    currency: string;
    isActive: boolean;
    notes: string;
  }>
): Promise<void> {
  await updateDoc(doc(db, ACCOUNTS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Treasury Movements ────────────────────────────────────

export async function listTreasuryMovements(limitCount = 50): Promise<TreasuryMovement[]> {
  const snap = await getDocs(
    query(collection(db, MOVEMENTS_COL), orderBy("date", "desc"), limit(limitCount))
  );
  return snap.docs.map((d) => docToMovement(d.id, d.data()));
}

export async function listMovementsByAccount(
  accountId: string,
  limitCount = 100
): Promise<TreasuryMovement[]> {
  const snap = await getDocs(
    query(
      collection(db, MOVEMENTS_COL),
      where("treasuryAccountId", "==", accountId),
      orderBy("date", "desc"),
      limit(limitCount)
    )
  );
  return snap.docs.map((d) => docToMovement(d.id, d.data()));
}

export async function createTreasuryMovement(data: {
  treasuryAccountId: string;
  type: TreasuryMovementType;
  amount: number; // always positive (except adjustment which can be negative)
  date: Date;
  description: string;
  referenceType?: TreasuryReferenceType;
  referenceId?: string;
  createdBy?: string;
}): Promise<string> {
  const accountRef = doc(db, ACCOUNTS_COL, data.treasuryAccountId);
  const delta = balanceDelta(data.type, data.amount);

  return await runTransaction(db, async (tx) => {
    const accountSnap = await tx.get(accountRef);
    if (!accountSnap.exists()) throw new Error("Cuenta no encontrada");

    const currentBalance = (accountSnap.data().currentBalance as number) ?? 0;
    const newBalance = currentBalance + delta;

    // Create movement
    const movRef = doc(collection(db, MOVEMENTS_COL));
    tx.set(movRef, {
      treasuryAccountId: data.treasuryAccountId,
      type: data.type,
      amount: data.amount,
      date: Timestamp.fromDate(data.date),
      description: data.description,
      referenceType: data.referenceType ?? null,
      referenceId: data.referenceId ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: serverTimestamp(),
    });

    // Update balance
    tx.update(accountRef, {
      currentBalance: newBalance,
      updatedAt: serverTimestamp(),
    });

    return movRef.id;
  });
}

export async function createTransferBetweenAccounts(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: Date;
  notes?: string;
  createdBy?: string;
}): Promise<void> {
  const fromRef = doc(db, ACCOUNTS_COL, data.fromAccountId);
  const toRef = doc(db, ACCOUNTS_COL, data.toAccountId);
  const transferId = `transfer_${Date.now()}`;

  await runTransaction(db, async (tx) => {
    const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
    if (!fromSnap.exists()) throw new Error("Cuenta origen no encontrada");
    if (!toSnap.exists()) throw new Error("Cuenta destino no encontrada");

    const fromBalance = (fromSnap.data().currentBalance as number) ?? 0;
    const toBalance = (toSnap.data().currentBalance as number) ?? 0;

    const desc = data.notes?.trim() ||
      `Transferencia de ${fromSnap.data().name} a ${toSnap.data().name}`;

    // transfer_out movement
    const outRef = doc(collection(db, MOVEMENTS_COL));
    tx.set(outRef, {
      treasuryAccountId: data.fromAccountId,
      type: "transfer_out",
      amount: data.amount,
      date: Timestamp.fromDate(data.date),
      description: desc,
      referenceType: "transfer",
      referenceId: transferId,
      createdBy: data.createdBy ?? null,
      createdAt: serverTimestamp(),
    });

    // transfer_in movement
    const inRef = doc(collection(db, MOVEMENTS_COL));
    tx.set(inRef, {
      treasuryAccountId: data.toAccountId,
      type: "transfer_in",
      amount: data.amount,
      date: Timestamp.fromDate(data.date),
      description: desc,
      referenceType: "transfer",
      referenceId: transferId,
      createdBy: data.createdBy ?? null,
      createdAt: serverTimestamp(),
    });

    // Update balances
    tx.update(fromRef, { currentBalance: fromBalance - data.amount, updatedAt: serverTimestamp() });
    tx.update(toRef, { currentBalance: toBalance + data.amount, updatedAt: serverTimestamp() });
  });
}
