import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StructureAsset } from "@/types/structure";

function structuresCol(clientId: string) {
  return collection(db, "clients", clientId, "structures");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToStructure(id: string, data: Record<string, any>): StructureAsset {
  const toDate = (v: unknown) =>
    v instanceof Timestamp ? v.toDate() : v ? new Date(v as string) : undefined;

  return {
    id,
    clientId: data.clientId,
    type: data.type,
    name: data.name,
    model: data.model ?? undefined,
    locationAddressId: data.locationAddressId ?? undefined,
    deliveryDate: toDate(data.deliveryDate),
    warrantyStartDate: toDate(data.warrantyStartDate),
    warrantyEndDate: toDate(data.warrantyEndDate),
    maintenanceFrequencyMonths: data.maintenanceFrequencyMonths ?? 6,
    lastMaintenanceDate: toDate(data.lastMaintenanceDate),
    nextMaintenanceDate: toDate(data.nextMaintenanceDate),
    status: data.status ?? "pending_delivery",
    notes: data.notes ?? undefined,
    photos: data.photos ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export async function createStructureAsset(
  clientId: string,
  data: Omit<StructureAsset, "id" | "clientId" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(structuresCol(clientId), {
    ...stripUndefined(data),
    clientId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStructureAsset(
  clientId: string,
  structureId: string,
  data: Partial<Omit<StructureAsset, "id" | "clientId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(structuresCol(clientId), structureId), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

export async function listStructureAssetsByClient(
  clientId: string
): Promise<StructureAsset[]> {
  const q = query(structuresCol(clientId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToStructure(d.id, d.data()));
}
