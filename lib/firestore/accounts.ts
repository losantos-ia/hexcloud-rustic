import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Account, AccountType } from "@/types/accounts";

const COL = "accounts";

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function docToAccount(id: string, data: Record<string, unknown>): Account {
  return {
    id,
    name: data.name as string,
    type: data.type as AccountType,
    bankName: data.bankName as string | undefined,
    accountNumber: data.accountNumber as string | undefined,
    notes: data.notes as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function listAccounts(): Promise<Account[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("name", "asc")));
  return snap.docs.map((d) => docToAccount(d.id, d.data() as Record<string, unknown>));
}

export async function getAccountById(id: string): Promise<Account | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return docToAccount(snap.id, snap.data() as Record<string, unknown>);
}

export async function createAccount(data: {
  name: string;
  type: AccountType;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAccount(
  id: string,
  data: Partial<{ name: string; type: AccountType; bankName: string; accountNumber: string; notes: string }>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
