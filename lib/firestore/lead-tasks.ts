import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeadTask, LeadTaskStatus, LeadTaskType } from "@/types/lead-task";

const COL = "leadTasks";

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v as string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToTask(id: string, data: Record<string, any>): LeadTask {
  return {
    id,
    leadId: data.leadId,
    title: data.title,
    dueDate: toDate(data.dueDate),
    status: data.status as LeadTaskStatus,
    type: data.type as LeadTaskType,
    notes: data.notes ?? undefined,
    completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createLeadTask(values: {
  leadId: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  type: LeadTaskType;
  notes?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    leadId: values.leadId,
    title: values.title,
    dueDate: Timestamp.fromDate(new Date(`${values.dueDate}T00:00:00`)),
    type: values.type,
    status: "pending",
    notes: values.notes ?? null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLeadTask(
  taskId: string,
  values: Partial<{ title: string; dueDate: string; type: LeadTaskType; notes: string }>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (values.title !== undefined) payload.title = values.title;
  if (values.type !== undefined) payload.type = values.type;
  if (values.notes !== undefined) payload.notes = values.notes;
  if (values.dueDate !== undefined)
    payload.dueDate = Timestamp.fromDate(new Date(`${values.dueDate}T00:00:00`));
  await updateDoc(doc(db, COL, taskId), payload);
}

export async function completeLeadTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, COL, taskId), {
    status: "completed",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function cancelLeadTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, COL, taskId), {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

export async function listLeadTasksByLead(leadId: string): Promise<LeadTask[]> {
  const q = query(
    collection(db, COL),
    where("leadId", "==", leadId),
    orderBy("dueDate", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTask(d.id, d.data() as Record<string, unknown>));
}

export async function getNextPendingLeadTask(leadId: string): Promise<LeadTask | null> {
  const q = query(
    collection(db, COL),
    where("leadId", "==", leadId),
    where("status", "==", "pending"),
    orderBy("dueDate", "asc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToTask(d.id, d.data() as Record<string, unknown>);
}

/** For dashboard: all overdue pending tasks across all leads */
export async function listOverdueTasks(): Promise<LeadTask[]> {
  const q = query(
    collection(db, COL),
    where("status", "==", "pending"),
    orderBy("dueDate", "asc")
  );
  const snap = await getDocs(q);
  const now = new Date();
  return snap.docs
    .map((d) => docToTask(d.id, d.data() as Record<string, unknown>))
    .filter((t) => t.dueDate < now);
}

/** For dashboard: tasks due today */
export async function listTodayTasks(): Promise<LeadTask[]> {
  const q = query(
    collection(db, COL),
    where("status", "==", "pending"),
    orderBy("dueDate", "asc")
  );
  const snap = await getDocs(q);
  const today = new Date();
  return snap.docs
    .map((d) => docToTask(d.id, d.data() as Record<string, unknown>))
    .filter((t) => {
      const d = t.dueDate;
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    });
}
