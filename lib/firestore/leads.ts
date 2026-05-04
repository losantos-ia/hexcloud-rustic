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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lead, LeadActivity, LeadStatus } from "@/types/lead";

const LEADS_COL = "leads";
const ACTIVITIES_COL = "leadActivities";

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToLead(id: string, data: Record<string, any>): Lead {
  return {
    id,
    fullName: data.fullName,
    phone: data.phone,
    secondaryPhone: data.secondaryPhone ?? undefined,
    email: data.email ?? undefined,
    source: data.source,
    interestedIn: data.interestedIn,
    status: data.status,
    priority: data.priority,
    department: data.department ?? undefined,
    city: data.city ?? undefined,
    budgetRange: data.budgetRange ?? undefined,
    expectedPurchaseDate: toDate(data.expectedPurchaseDate),
    assignedTo: data.assignedTo ?? undefined,
    notes: data.notes ?? undefined,
    nextAction: data.nextAction ?? undefined,
    nextActionDate: toDate(data.nextActionDate),
    lossReason: data.lossReason ?? undefined,
    convertedClientId: data.convertedClientId ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToActivity(id: string, data: Record<string, any>): LeadActivity {
  return {
    id,
    leadId: data.leadId,
    type: data.type,
    title: data.title,
    description: data.description ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    createdBy: data.createdBy ?? undefined,
  };
}

// ── Lead CRUD ────────────────────────────────────────────

export async function createLead(
  data: Omit<Lead, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, LEADS_COL), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLead(
  id: string,
  data: Partial<Omit<Lead, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, LEADS_COL, id), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLead(id: string): Promise<void> {
  await deleteDoc(doc(db, LEADS_COL, id));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const snap = await getDoc(doc(db, LEADS_COL, id));
  if (!snap.exists()) return null;
  return docToLead(snap.id, snap.data());
}

export async function listLeads(): Promise<Lead[]> {
  const snap = await getDocs(collection(db, LEADS_COL));
  return snap.docs
    .map((d) => docToLead(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listLeadsByStatus(status: LeadStatus): Promise<Lead[]> {
  const q = query(collection(db, LEADS_COL), where("status", "==", status));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => docToLead(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Activity CRUD ─────────────────────────────────────────

export async function createLeadActivity(
  data: Omit<LeadActivity, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, ACTIVITIES_COL), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const q = query(collection(db, ACTIVITIES_COL), where("leadId", "==", leadId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => docToActivity(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
