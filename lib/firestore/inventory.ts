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
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  InventoryItem,
  InventoryLocation,
  InventoryMovement,
  InventoryMovementType,
  InventoryReferenceType,
} from "@/types/inventory";
import { IN_MOVEMENT_TYPES } from "@/types/inventory";
import type {
  InventoryItemFormValues,
  InventoryLocationFormValues,
} from "@/lib/schemas/inventory";

const ITEMS_COL = "inventoryItems";
const LOCATIONS_COL = "inventoryLocations";
const MOVEMENTS_COL = "inventoryMovements";

// ── Helpers ──────────────────────────────────────────────

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToItem(id: string, data: Record<string, any>): InventoryItem {
  return {
    id,
    sku: data.sku ?? undefined,
    name: data.name,
    description: data.description ?? undefined,
    category: data.category,
    itemType: data.itemType,
    unit: data.unit,
    currentStock: data.currentStock ?? 0,
    minimumStock: data.minimumStock ?? 0,
    averageCost: data.averageCost ?? 0,
    lastPurchaseCost: data.lastPurchaseCost ?? undefined,
    salePrice: data.salePrice ?? undefined,
    locationId: data.locationId,
    supplierId: data.supplierId ?? undefined,
    isActive: data.isActive ?? true,
    notes: data.notes ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToLocation(id: string, data: Record<string, any>): InventoryLocation {
  return {
    id,
    name: data.name,
    type: data.type,
    description: data.description ?? undefined,
    isActive: data.isActive ?? true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToMovement(id: string, data: Record<string, any>): InventoryMovement {
  return {
    id,
    itemId: data.itemId,
    locationId: data.locationId,
    type: data.type,
    quantity: data.quantity,
    unitCost: data.unitCost ?? undefined,
    totalCost: data.totalCost ?? undefined,
    referenceType: data.referenceType ?? undefined,
    referenceId: data.referenceId ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy ?? undefined,
  };
}

// ── Inventory Items ──────────────────────────────────────

export async function createInventoryItem(
  payload: InventoryItemFormValues
): Promise<string> {
  const colRef = collection(db, ITEMS_COL);
  const ref = await addDoc(colRef, {
    ...stripUndefined(payload),
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateInventoryItem(
  id: string,
  payload: Partial<InventoryItemFormValues>
): Promise<void> {
  const ref = doc(db, ITEMS_COL, id);
  await updateDoc(ref, {
    ...stripUndefined(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function getInventoryItemById(
  id: string
): Promise<InventoryItem | null> {
  const ref = doc(db, ITEMS_COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToItem(snap.id, snap.data());
}

export async function listInventoryItems(): Promise<InventoryItem[]> {
  const q = query(
    collection(db, ITEMS_COL),
    where("isActive", "==", true),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToItem(d.id, d.data()));
}

export async function listInventoryItemsByLocation(
  locationId: string
): Promise<InventoryItem[]> {
  const q = query(
    collection(db, ITEMS_COL),
    where("locationId", "==", locationId),
    where("isActive", "==", true),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToItem(d.id, d.data()));
}

// ── Inventory Locations ──────────────────────────────────

export async function createInventoryLocation(
  payload: InventoryLocationFormValues
): Promise<string> {
  const colRef = collection(db, LOCATIONS_COL);
  const ref = await addDoc(colRef, {
    ...stripUndefined(payload),
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateInventoryLocation(
  id: string,
  payload: Partial<InventoryLocationFormValues & { isActive?: boolean }>
): Promise<void> {
  const ref = doc(db, LOCATIONS_COL, id);
  await updateDoc(ref, {
    ...stripUndefined(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function listInventoryLocations(): Promise<InventoryLocation[]> {
  const q = query(
    collection(db, LOCATIONS_COL),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToLocation(d.id, d.data()));
}

// ── Inventory Movements ──────────────────────────────────

export async function createInventoryMovement(
  itemId: string,
  locationId: string,
  payload: {
    type: InventoryMovementType;
    quantity: number;
    unitCost?: number;
    referenceType?: InventoryReferenceType;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  }
): Promise<string> {
  const totalCost =
    payload.unitCost !== undefined
      ? payload.quantity * payload.unitCost
      : undefined;

  const colRef = collection(db, MOVEMENTS_COL);
  const ref = await addDoc(colRef, {
    itemId,
    locationId,
    ...stripUndefined({
      ...payload,
      totalCost,
    }),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listInventoryMovementsByItem(
  itemId: string
): Promise<InventoryMovement[]> {
  const q = query(
    collection(db, MOVEMENTS_COL),
    where("itemId", "==", itemId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToMovement(d.id, d.data()));
}

// ── Stock Operations ─────────────────────────────────────

/**
 * Adjust stock for a single item.
 * Handles weighted average cost update for purchase_in.
 * Prevents going below 0 for non-adjustment-out operations.
 */
export async function adjustInventoryStock(
  itemId: string,
  type: InventoryMovementType,
  quantity: number,
  opts?: {
    unitCost?: number;
    referenceType?: InventoryReferenceType;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
    allowNegative?: boolean;
  }
): Promise<void> {
  const itemRef = doc(db, ITEMS_COL, itemId);
  const movementsCol = collection(db, MOVEMENTS_COL);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists()) throw new Error("Artículo no encontrado");

    const item = docToItem(snap.id, snap.data());
    const isIn = IN_MOVEMENT_TYPES.includes(type);
    const delta = isIn ? quantity : -quantity;
    const newStock = item.currentStock + delta;

    // Guard: prevent going below 0 unless it's adjustment_out with explicit allowNegative
    if (newStock < 0 && type !== "adjustment_out" && !opts?.allowNegative) {
      throw new Error(
        `Stock insuficiente. Stock actual: ${item.currentStock}, cantidad solicitada: ${quantity}`
      );
    }

    // Compute new average cost for purchase_in
    let newAverageCost = item.averageCost;
    if (type === "purchase_in" && opts?.unitCost !== undefined && opts.unitCost > 0) {
      const prevTotal = item.currentStock * item.averageCost;
      const inTotal = quantity * opts.unitCost;
      const newTotal = item.currentStock + quantity;
      newAverageCost = newTotal > 0 ? (prevTotal + inTotal) / newTotal : opts.unitCost;
    }

    const totalCost =
      opts?.unitCost !== undefined ? quantity * opts.unitCost : undefined;

    // Update item
    tx.update(itemRef, {
      currentStock: Math.max(0, newStock),
      averageCost: newAverageCost,
      ...(type === "purchase_in" && opts?.unitCost !== undefined
        ? { lastPurchaseCost: opts.unitCost }
        : {}),
      updatedAt: serverTimestamp(),
    });

    // Create movement
    const movRef = doc(movementsCol);
    tx.set(movRef, {
      itemId,
      locationId: item.locationId,
      type,
      quantity,
      ...(opts?.unitCost !== undefined ? { unitCost: opts.unitCost } : {}),
      ...(totalCost !== undefined ? { totalCost } : {}),
      ...(opts?.referenceType ? { referenceType: opts.referenceType } : {}),
      ...(opts?.referenceId ? { referenceId: opts.referenceId } : {}),
      ...(opts?.notes ? { notes: opts.notes } : {}),
      ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
      createdAt: serverTimestamp(),
    });
  });
}

/**
 * Transfer stock from one item (source location) to another item (target location).
 * Both items must already exist. Creates transfer_out + transfer_in movements.
 */
export async function transferInventoryStock(
  sourceItemId: string,
  targetItemId: string,
  quantity: number,
  opts?: {
    notes?: string;
    createdBy?: string;
  }
): Promise<void> {
  const sourceRef = doc(db, ITEMS_COL, sourceItemId);
  const targetRef = doc(db, ITEMS_COL, targetItemId);
  const movementsCol = collection(db, MOVEMENTS_COL);

  await runTransaction(db, async (tx) => {
    const [sourceSnap, targetSnap] = await Promise.all([
      tx.get(sourceRef),
      tx.get(targetRef),
    ]);

    if (!sourceSnap.exists()) throw new Error("Artículo origen no encontrado");
    if (!targetSnap.exists()) throw new Error("Artículo destino no encontrado");

    const source = docToItem(sourceSnap.id, sourceSnap.data());
    const target = docToItem(targetSnap.id, targetSnap.data());

    if (source.currentStock < quantity) {
      throw new Error(
        `Stock insuficiente en origen. Disponible: ${source.currentStock}, solicitado: ${quantity}`
      );
    }

    const transferRef = doc(collection(db, MOVEMENTS_COL)); // shared reference ID
    const transferRefId = transferRef.id;

    // Update source
    tx.update(sourceRef, {
      currentStock: source.currentStock - quantity,
      updatedAt: serverTimestamp(),
    });

    // Update target
    tx.update(targetRef, {
      currentStock: target.currentStock + quantity,
      updatedAt: serverTimestamp(),
    });

    // Movement: transfer_out from source
    const outRef = doc(movementsCol);
    tx.set(outRef, {
      itemId: sourceItemId,
      locationId: source.locationId,
      type: "transfer_out" as InventoryMovementType,
      quantity,
      referenceType: "transfer" as InventoryReferenceType,
      referenceId: transferRefId,
      ...(opts?.notes ? { notes: opts.notes } : {}),
      ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
      createdAt: serverTimestamp(),
    });

    // Movement: transfer_in to target
    const inRef = doc(movementsCol);
    tx.set(inRef, {
      itemId: targetItemId,
      locationId: target.locationId,
      type: "transfer_in" as InventoryMovementType,
      quantity,
      referenceType: "transfer" as InventoryReferenceType,
      referenceId: transferRefId,
      ...(opts?.notes ? { notes: opts.notes } : {}),
      ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
      createdAt: serverTimestamp(),
    });
  });
}
