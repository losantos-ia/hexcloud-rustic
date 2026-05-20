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
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Employee, TimeClockEntry } from "@/types/hr";

const EMPLOYEES_COL = "employees";
const TIME_CLOCK_COL = "timeClockEntries";

// ── Helpers ──────────────────────────────────────────────

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
function docToEmployee(id: string, data: Record<string, any>): Employee {
  return {
    id,
    fullName: data.fullName,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    documentId: data.documentId ?? undefined,
    role: data.role,
    department: data.department,
    locationId: data.locationId ?? undefined,
    locationName: data.locationName ?? undefined,
    weeklySalary: data.weeklySalary ?? undefined,
    monthlySalary: data.monthlySalary ?? undefined,
    hourlyRate: data.hourlyRate ?? undefined,
    paymentType: data.paymentType,
    status: data.status,
    startDate: toDate(data.startDate),
    notes: data.notes ?? undefined,
    uid: data.uid ?? undefined,
    userDisabled: data.userDisabled ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToClockEntry(id: string, data: Record<string, any>): TimeClockEntry {
  return {
    id,
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    date: toDate(data.date) ?? new Date(),
    clockInAt: toDate(data.clockInAt) ?? new Date(),
    clockOutAt: toDate(data.clockOutAt),
    totalHours: data.totalHours ?? undefined,
    locationId: data.locationId ?? undefined,
    locationName: data.locationName ?? undefined,
    notes: data.notes ?? undefined,
    status: data.status ?? "open",
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// ── Employee CRUD ────────────────────────────────────────

export async function createEmployee(
  data: Omit<Employee, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, EMPLOYEES_COL), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEmployee(
  id: string,
  data: Partial<Omit<Employee, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  await updateDoc(doc(db, EMPLOYEES_COL, id), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function setEmployeeUserDisabled(
  employeeId: string,
  disabled: boolean
): Promise<void> {
  await updateDoc(doc(db, EMPLOYEES_COL, employeeId), {
    userDisabled: disabled,
    updatedAt: serverTimestamp(),
  });
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const snap = await getDoc(doc(db, EMPLOYEES_COL, id));
  if (!snap.exists()) return null;
  return docToEmployee(snap.id, snap.data());
}

export async function listEmployees(): Promise<Employee[]> {
  const snap = await getDocs(
    query(collection(db, EMPLOYEES_COL), orderBy("fullName", "asc"))
  );
  return snap.docs.map((d) => docToEmployee(d.id, d.data()));
}

export async function listActiveEmployees(): Promise<Employee[]> {
  const snap = await getDocs(
    query(
      collection(db, EMPLOYEES_COL),
      where("status", "==", "active"),
      orderBy("fullName", "asc")
    )
  );
  return snap.docs.map((d) => docToEmployee(d.id, d.data()));
}

// ── Time Clock ───────────────────────────────────────────

export async function getOpenClockEntryByEmployee(
  employeeId: string
): Promise<TimeClockEntry | null> {
  const snap = await getDocs(
    query(
      collection(db, TIME_CLOCK_COL),
      where("employeeId", "==", employeeId),
      where("status", "==", "open")
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return docToClockEntry(d.id, d.data());
}

export async function clockInEmployee(
  employeeId: string,
  employeeName: string,
  locationId?: string,
  locationName?: string,
  notes?: string
): Promise<string> {
  // Prevent duplicate open entries
  const existing = await getOpenClockEntryByEmployee(employeeId);
  if (existing) {
    throw new Error("El empleado ya tiene un fichaje abierto.");
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD

  const ref = await addDoc(collection(db, TIME_CLOCK_COL), {
    employeeId,
    employeeName,
    date: new Date(`${dateStr}T12:00:00`),
    clockInAt: now,
    status: "open",
    ...(locationId ? { locationId } : {}),
    ...(locationName ? { locationName } : {}),
    ...(notes ? { notes } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function clockOutEmployee(entryId: string): Promise<void> {
  const snap = await getDoc(doc(db, TIME_CLOCK_COL, entryId));
  if (!snap.exists()) throw new Error("Fichaje no encontrado.");

  const data = snap.data();
  const clockInAt = toDate(data.clockInAt) ?? new Date();
  const clockOutAt = new Date();
  const totalHours =
    Math.round(((clockOutAt.getTime() - clockInAt.getTime()) / 3_600_000) * 100) / 100;

  await updateDoc(doc(db, TIME_CLOCK_COL, entryId), {
    clockOutAt,
    totalHours,
    status: "closed",
    updatedAt: serverTimestamp(),
  });
}

export async function updateTimeClockEntry(
  id: string,
  data: Partial<Omit<TimeClockEntry, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  await updateDoc(doc(db, TIME_CLOCK_COL, id), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function listTimeClockEntries(): Promise<TimeClockEntry[]> {
  const snap = await getDocs(
    query(collection(db, TIME_CLOCK_COL), orderBy("clockInAt", "desc"))
  );
  return snap.docs.map((d) => docToClockEntry(d.id, d.data()));
}

export async function listTimeClockEntriesByEmployee(
  employeeId: string
): Promise<TimeClockEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, TIME_CLOCK_COL),
      where("employeeId", "==", employeeId),
      orderBy("clockInAt", "desc")
    )
  );
  return snap.docs.map((d) => docToClockEntry(d.id, d.data()));
}

export async function listTimeClockEntriesByDateRange(
  startDate: Date,
  endDate: Date
): Promise<TimeClockEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, TIME_CLOCK_COL),
      where("clockInAt", ">=", startDate),
      where("clockInAt", "<=", endDate),
      orderBy("clockInAt", "desc")
    )
  );
  return snap.docs.map((d) => docToClockEntry(d.id, d.data()));
}
