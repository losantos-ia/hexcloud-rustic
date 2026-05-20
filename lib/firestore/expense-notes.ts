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

const COL = "expenseNotes";

export interface ExpenseNote {
  id: string;
  expenseId: string;
  text: string;
  createdAt: Date;
}

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToNote(id: string, data: Record<string, any>): ExpenseNote {
  return {
    id,
    expenseId: data.expenseId,
    text: data.text,
    createdAt: toDate(data.createdAt),
  };
}

export async function listNotesByExpense(expenseId: string): Promise<ExpenseNote[]> {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("expenseId", "==", expenseId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => docToNote(d.id, d.data()));
}

export async function addExpenseNote(expenseId: string, text: string): Promise<ExpenseNote> {
  const ref = await addDoc(collection(db, COL), {
    expenseId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
  return {
    id: ref.id,
    expenseId,
    text: text.trim(),
    createdAt: new Date(),
  };
}

export async function deleteExpenseNote(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
