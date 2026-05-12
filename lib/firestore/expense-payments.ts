import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ExpensePayment } from "@/types/accounts";

const COL = "expensePayments";

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function docToPayment(id: string, data: Record<string, unknown>): ExpensePayment {
  return {
    id,
    expenseId: data.expenseId as string,
    amount: data.amount as number,
    date: toDate(data.date),
    accountId: data.accountId as string,
    accountName: data.accountName as string,
    notes: data.notes as string | undefined,
    createdAt: toDate(data.createdAt),
  };
}

export async function listPaymentsByExpense(expenseId: string): Promise<ExpensePayment[]> {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("expenseId", "==", expenseId),
      orderBy("date", "desc")
    )
  );
  return snap.docs.map((d) => docToPayment(d.id, d.data() as Record<string, unknown>));
}

export async function createExpensePayment(data: {
  expenseId: string;
  amount: number;
  date: Date;
  accountId: string;
  accountName: string;
  notes?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteExpensePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
