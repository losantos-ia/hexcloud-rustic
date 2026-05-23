import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, UserRole } from "@/types/user";

const COL = "users";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToProfile(id: string, data: Record<string, any>): UserProfile {
  return {
    uid: id,
    email: data.email ?? "",
    displayName: data.displayName ?? "",
    role: (data.role as UserRole) ?? "vendedor",
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, COL, uid));
  if (!snap.exists()) return null;
  return docToProfile(snap.id, snap.data());
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole = "vendedor"
): Promise<void> {
  await setDoc(doc(db, COL, uid), {
    uid,
    email,
    displayName,
    role,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await setDoc(doc(db, COL, uid), { role }, { merge: true });
}

export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(doc(db, COL, uid), { displayName });
}

export async function updateUserCurrency(uid: string, currency: string): Promise<void> {
  await setDoc(doc(db, COL, uid), { currency }, { merge: true });
}

export async function getUserCurrency(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, COL, uid));
  if (!snap.exists()) return null;
  return (snap.data().currency as string) ?? null;
}
