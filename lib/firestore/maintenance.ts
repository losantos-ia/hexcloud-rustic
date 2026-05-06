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
import type {
  MaintenanceAsset,
  MaintenanceRecord,
  MaintenanceNotification,
} from "@/types/maintenance";
import type {
  MaintenanceAssetFormValues,
  MaintenanceRecordFormValues,
  MaintenanceNotificationFormValues,
} from "@/lib/schemas/maintenance";

// ── Collection names ──────────────────────────────────────

const ASSETS_COL = "maintenanceAssets";
const RECORDS_COL = "maintenanceRecords";
const NOTIFICATIONS_COL = "maintenanceNotifications";

// ── Helpers ───────────────────────────────────────────────

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function toDateOrUndefined(v: unknown): Date | undefined {
  if (!v) return undefined;
  return toDate(v);
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ── Asset mappers ─────────────────────────────────────────

function docToAsset(id: string, data: Record<string, unknown>): MaintenanceAsset {
  return {
    id,
    clientId: data.clientId as string | undefined,
    clientName: data.clientName as string,
    clientPhone: data.clientPhone as string,
    projectType: data.projectType as MaintenanceAsset["projectType"],
    productionOrderId: data.productionOrderId as string | undefined,
    orderId: data.orderId as string | undefined,
    locationAddress: data.locationAddress as string,
    googleMapsUrl: data.googleMapsUrl as string | undefined,
    installationDate: toDate(data.installationDate),
    lastMaintenanceDate: toDateOrUndefined(data.lastMaintenanceDate),
    nextMaintenanceDate: toDate(data.nextMaintenanceDate),
    maintenanceFrequencyMonths: (data.maintenanceFrequencyMonths as number) ?? 6,
    status: (data.status as MaintenanceAsset["status"]) ?? "active",
    createdSource: (data.createdSource as MaintenanceAsset["createdSource"]) ?? "manual",
    notes: data.notes as string | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function docToRecord(id: string, data: Record<string, unknown>): MaintenanceRecord {
  return {
    id,
    maintenanceAssetId: data.maintenanceAssetId as string,
    type: data.type as MaintenanceRecord["type"],
    status: data.status as MaintenanceRecord["status"],
    scheduledDate: toDate(data.scheduledDate),
    completedDate: toDateOrUndefined(data.completedDate),
    technician: data.technician as string | undefined,
    observations: data.observations as string | undefined,
    tasksPerformed: data.tasksPerformed as string | undefined,
    materialsUsed: data.materialsUsed as string | undefined,
    photos: data.photos as string[] | undefined,
    cost: data.cost as number | undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function docToNotification(id: string, data: Record<string, unknown>): MaintenanceNotification {
  return {
    id,
    maintenanceAssetId: data.maintenanceAssetId as string,
    clientName: data.clientName as string,
    clientPhone: data.clientPhone as string,
    nextMaintenanceDate: toDate(data.nextMaintenanceDate),
    status: data.status as MaintenanceNotification["status"],
    messageSent: data.messageSent as string | undefined,
    sentAt: toDateOrUndefined(data.sentAt),
    createdAt: toDate(data.createdAt),
  };
}

// ── Assets ────────────────────────────────────────────────

export async function createMaintenanceAsset(
  values: MaintenanceAssetFormValues
): Promise<string> {
  const installationDate = new Date(`${values.installationDate}T00:00:00`);
  const nextMaintenanceDate = addMonths(installationDate, values.maintenanceFrequencyMonths ?? 6);

  const ref = await addDoc(collection(db, ASSETS_COL), {
    ...stripUndefined(values as object),
    installationDate: Timestamp.fromDate(installationDate),
    nextMaintenanceDate: Timestamp.fromDate(nextMaintenanceDate),
    maintenanceFrequencyMonths: values.maintenanceFrequencyMonths ?? 6,
    status: values.status ?? "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMaintenanceAsset(
  id: string,
  values: Partial<MaintenanceAssetFormValues>
): Promise<void> {
  const payload: Record<string, unknown> = { ...stripUndefined(values as object), updatedAt: serverTimestamp() };
  if (values.installationDate) {
    const installationDate = new Date(`${values.installationDate}T00:00:00`);
    payload.installationDate = Timestamp.fromDate(installationDate);
    const freq = values.maintenanceFrequencyMonths ?? 6;
    payload.nextMaintenanceDate = Timestamp.fromDate(addMonths(installationDate, freq));
  }
  await updateDoc(doc(db, ASSETS_COL, id), payload);
}

export async function getMaintenanceAssetById(id: string): Promise<MaintenanceAsset | null> {
  const snap = await getDoc(doc(db, ASSETS_COL, id));
  if (!snap.exists()) return null;
  return docToAsset(snap.id, snap.data() as Record<string, unknown>);
}

export async function listMaintenanceAssets(): Promise<MaintenanceAsset[]> {
  const snap = await getDocs(
    query(collection(db, ASSETS_COL), orderBy("nextMaintenanceDate", "asc"))
  );
  return snap.docs.map((d) => docToAsset(d.id, d.data() as Record<string, unknown>));
}

// ── Records ───────────────────────────────────────────────

export async function createMaintenanceRecord(
  values: MaintenanceRecordFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, RECORDS_COL), {
    ...stripUndefined(values as object),
    scheduledDate: Timestamp.fromDate(new Date(`${values.scheduledDate}T00:00:00`)),
    completedDate: values.completedDate
      ? Timestamp.fromDate(new Date(`${values.completedDate}T00:00:00`))
      : undefined,
    type: values.type ?? "preventive",
    status: values.status ?? "scheduled",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMaintenanceRecord(
  id: string,
  values: Partial<MaintenanceRecordFormValues>
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...stripUndefined(values as object),
    updatedAt: serverTimestamp(),
  };
  if (values.scheduledDate) {
    payload.scheduledDate = Timestamp.fromDate(new Date(`${values.scheduledDate}T00:00:00`));
  }
  if (values.completedDate) {
    payload.completedDate = Timestamp.fromDate(new Date(`${values.completedDate}T00:00:00`));
  }
  await updateDoc(doc(db, RECORDS_COL, id), payload);
}

export async function completeMaintenanceRecord(
  recordId: string,
  assetId: string,
  frequencyMonths: number
): Promise<void> {
  const completedDate = new Date();
  const nextMaintenanceDate = addMonths(completedDate, frequencyMonths);

  await updateDoc(doc(db, RECORDS_COL, recordId), {
    status: "completed",
    completedDate: Timestamp.fromDate(completedDate),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, ASSETS_COL, assetId), {
    lastMaintenanceDate: Timestamp.fromDate(completedDate),
    nextMaintenanceDate: Timestamp.fromDate(nextMaintenanceDate),
    updatedAt: serverTimestamp(),
  });
}

export async function listMaintenanceRecordsByAsset(
  assetId: string
): Promise<MaintenanceRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, RECORDS_COL),
      where("maintenanceAssetId", "==", assetId),
      orderBy("scheduledDate", "desc")
    )
  );
  return snap.docs.map((d) => docToRecord(d.id, d.data() as Record<string, unknown>));
}

// ── Notifications ─────────────────────────────────────────

export async function createMaintenanceNotification(
  values: MaintenanceNotificationFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, NOTIFICATIONS_COL), {
    ...stripUndefined(values as object),
    nextMaintenanceDate: Timestamp.fromDate(new Date(`${values.nextMaintenanceDate}T00:00:00`)),
    status: values.status ?? "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listPendingMaintenanceNotifications(): Promise<MaintenanceNotification[]> {
  const snap = await getDocs(
    query(
      collection(db, NOTIFICATIONS_COL),
      where("status", "==", "pending"),
      orderBy("nextMaintenanceDate", "asc")
    )
  );
  return snap.docs.map((d) => docToNotification(d.id, d.data() as Record<string, unknown>));
}

export async function markNotificationAsSent(
  id: string,
  messageSent: string
): Promise<void> {
  await updateDoc(doc(db, NOTIFICATIONS_COL, id), {
    status: "notified",
    messageSent,
    sentAt: serverTimestamp(),
  });
}

// ── Notification detection logic ──────────────────────────

export async function ensureUpcomingNotifications(): Promise<void> {
  const assets = await listMaintenanceAssets();
  const today = new Date();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  for (const asset of assets) {
    if (asset.status !== "active") continue;
    if (asset.nextMaintenanceDate > sevenDaysFromNow) continue;

    // Check if a pending notification already exists
    const existingSnap = await getDocs(
      query(
        collection(db, NOTIFICATIONS_COL),
        where("maintenanceAssetId", "==", asset.id),
        where("status", "==", "pending")
      )
    );
    if (!existingSnap.empty) continue;

    const typeLabel: Record<string, string> = {
      cabin: "cabaña",
      pergola: "pérgola",
      kiosk: "kiosco",
      deck: "deck",
      playground: "juego infantil",
      rustic_cafe: "café rústico",
      custom: "proyecto",
    };

    const messageSent = `Hola ${asset.clientName}, le recordamos que el mantenimiento de su ${typeLabel[asset.projectType] ?? "estructura"} está próximo. Podemos agendar su cita.`;

    const nextStr = asset.nextMaintenanceDate.toISOString().split("T")[0];
    await createMaintenanceNotification({
      maintenanceAssetId: asset.id,
      clientName: asset.clientName,
      clientPhone: asset.clientPhone,
      nextMaintenanceDate: nextStr,
      status: "pending",
      messageSent,
    });
  }
}
