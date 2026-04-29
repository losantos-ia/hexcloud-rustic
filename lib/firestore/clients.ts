import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Client } from "@/types/client";

const COL = "clients";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToClient(id: string, data: Record<string, any>): Client {
  return {
    id,
    fullName: data.fullName,
    phone: data.phone,
    secondaryPhone: data.secondaryPhone ?? undefined,
    email: data.email ?? undefined,
    documentId: data.documentId ?? undefined,
    clientType: data.clientType,
    source: data.source,
    notes: data.notes ?? undefined,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    updatedAt: data.updatedAt?.toDate() ?? new Date(),
  };
}

export async function createClient(
  data: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getClientById(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return docToClient(snap.id, snap.data());
}

export async function listClients(): Promise<Client[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToClient(d.id, d.data()));
}
