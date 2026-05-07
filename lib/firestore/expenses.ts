import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense, ExpenseCategory } from "@/types/expenses";
import type { ExpenseFormValues } from "@/lib/schemas/expenses";
import { adjustInventoryStock } from "@/lib/firestore/inventory";

// ── Collection ────────────────────────────────────────────

const COL = "expenses";

// ── Helpers ───────────────────────────────────────────────

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// ── Mapper ────────────────────────────────────────────────

function docToExpense(id: string, data: Record<string, unknown>): Expense {
  return {
    id,
    expenseNumber: data.expenseNumber as string,
    date: toDate(data.date),
    category: data.category as Expense["category"],
    amount: data.amount as number,
    locationId: data.locationId as string,
    locationName: data.locationName as string | undefined,
    description: data.description as string | undefined,
    paymentMethod: data.paymentMethod as Expense["paymentMethod"],
    invoiceNumber: data.invoiceNumber as string | undefined,
    dueDate: data.dueDate ? toDate(data.dueDate) : undefined,
    supplierName: data.supplierName as string | undefined,
    receiptUrl: data.receiptUrl as string | undefined,
    notes: data.notes as string | undefined,
    lineItems: (data.lineItems as Array<{ sku?: string; inventoryItemId?: string; description: string; quantity: number; unitPrice: number }>) ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// ── Number generation ─────────────────────────────────────

export async function generateExpenseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await getDocs(collection(db, COL));
  const thisYearCount = snap.docs.filter((d) => {
    const num: string = d.data().expenseNumber ?? "";
    return num.startsWith(`GASTO-${year}`);
  }).length;
  const next = String(thisYearCount + 1).padStart(4, "0");
  return `GASTO-${year}-${next}`;
}

// ── CRUD ──────────────────────────────────────────────────

export async function createExpense(values: ExpenseFormValues): Promise<string> {
  const expenseNumber = await generateExpenseNumber();
  const payload: Record<string, unknown> = {
    ...stripUndefined(values as object),
    expenseNumber,
    date: Timestamp.fromDate(new Date(`${values.date}T00:00:00`)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (values.dueDate) {
    payload.dueDate = Timestamp.fromDate(new Date(`${values.dueDate}T00:00:00`));
  } else {
    delete payload.dueDate;
  }
  const ref = await addDoc(collection(db, COL), payload);

  // Inventory movements: purchase_in for linked line items
  if (values.lineItems?.length) {
    for (const item of values.lineItems) {
      if (item.inventoryItemId) {
        await adjustInventoryStock(
          item.inventoryItemId,
          values.locationId,
          "purchase_in",
          item.quantity,
          { unitCost: item.unitPrice, referenceType: "purchase", referenceId: ref.id }
        );
      }
    }
  }

  return ref.id;
}

export async function updateExpense(
  id: string,
  values: Partial<ExpenseFormValues>
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...stripUndefined(values as object),
    updatedAt: serverTimestamp(),
  };
  if (values.date) {
    payload.date = Timestamp.fromDate(new Date(`${values.date}T00:00:00`));
  }
  if (values.dueDate) {
    payload.dueDate = Timestamp.fromDate(new Date(`${values.dueDate}T00:00:00`));
  } else if ("dueDate" in values) {
    payload.dueDate = null;
  }
  await updateDoc(doc(db, COL, id), payload);
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return docToExpense(snap.id, snap.data() as Record<string, unknown>);
}

export async function listExpenses(): Promise<Expense[]> {
  const q = query(collection(db, COL), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToExpense(d.id, d.data() as Record<string, unknown>));
}

export async function listExpensesByLocation(locationId: string): Promise<Expense[]> {
  const q = query(
    collection(db, COL),
    where("locationId", "==", locationId),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToExpense(d.id, d.data() as Record<string, unknown>));
}

export async function listExpensesByCategory(category: ExpenseCategory): Promise<Expense[]> {
  const q = query(
    collection(db, COL),
    where("category", "==", category),
    orderBy("date", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToExpense(d.id, d.data() as Record<string, unknown>));
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
