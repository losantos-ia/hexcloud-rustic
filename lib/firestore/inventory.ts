import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
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
  InventoryStockByLocation,
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
const STOCK_COL = "inventoryStock";
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
    averageCost: data.averageCost ?? 0,
    lastPurchaseCost: data.lastPurchaseCost ?? undefined,
    salePrice: data.salePrice ?? undefined,
    supplierId: data.supplierId ?? undefined,
    isActive: data.isActive ?? true,
    notes: data.notes ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToStock(id: string, data: Record<string, any>): InventoryStockByLocation {
  return {
    id,
    itemId: data.itemId,
    locationId: data.locationId,
    currentStock: data.currentStock ?? 0,
    minimumStock: data.minimumStock ?? 0,
    averageCost: data.averageCost ?? undefined,
    totalValue: data.totalValue ?? 0,
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
    locationId: data.locationId ?? undefined,
    fromLocationId: data.fromLocationId ?? undefined,
    toLocationId: data.toLocationId ?? undefined,
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

/** Composite key for (itemId, locationId) stock documents */
function stockDocId(itemId: string, locationId: string): string {
  return `${itemId}_${locationId}`;
}

// ── Inventory Items ──────────────────────────────────────

export async function checkSkuExists(
  sku: string,
  excludeId?: string
): Promise<boolean> {
  if (!sku.trim()) return false;
  const q = query(collection(db, ITEMS_COL), where("sku", "==", sku.trim()));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  if (excludeId) return snap.docs.some((d) => d.id !== excludeId);
  return true;
}

export async function createInventoryItem(
  payload: InventoryItemFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, ITEMS_COL), {
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
  await updateDoc(doc(db, ITEMS_COL, id), {
    ...stripUndefined(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, ITEMS_COL, id));
}

export async function getInventoryItemById(
  id: string
): Promise<InventoryItem | null> {
  const snap = await getDoc(doc(db, ITEMS_COL, id));
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

// ── Inventory Stock by Location ──────────────────────────

/**
 * Get stock entry for a specific (item, location) pair.
 * Returns null if no stock entry exists yet.
 */
export async function getStockEntry(
  itemId: string,
  locationId: string
): Promise<InventoryStockByLocation | null> {
  const id = stockDocId(itemId, locationId);
  const snap = await getDoc(doc(db, STOCK_COL, id));
  if (!snap.exists()) return null;
  return docToStock(snap.id, snap.data());
}

/** All stock entries for a given item across all locations */
export async function getStockByItem(
  itemId: string
): Promise<InventoryStockByLocation[]> {
  const q = query(
    collection(db, STOCK_COL),
    where("itemId", "==", itemId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToStock(d.id, d.data()));
}

/** All stock entries for a given location */
export async function getStockByLocation(
  locationId: string
): Promise<InventoryStockByLocation[]> {
  const q = query(
    collection(db, STOCK_COL),
    where("locationId", "==", locationId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToStock(d.id, d.data()));
}

/** All stock entries across all items/locations */
export async function listAllStock(): Promise<InventoryStockByLocation[]> {
  const snap = await getDocs(collection(db, STOCK_COL));
  return snap.docs.map((d) => docToStock(d.id, d.data()));
}

/**
 * Upsert a stock entry for (item, location).
 * Creates the document if it does not exist.
 */
export async function upsertStockEntry(
  itemId: string,
  locationId: string,
  currentStock: number,
  minimumStock: number,
  itemAverageCost: number,
  overrideAverageCost?: number
): Promise<void> {
  const effectiveCost = overrideAverageCost ?? itemAverageCost;
  const totalValue = currentStock * effectiveCost;
  const id = stockDocId(itemId, locationId);
  await setDoc(
    doc(db, STOCK_COL, id),
    {
      itemId,
      locationId,
      currentStock,
      minimumStock,
      ...(overrideAverageCost !== undefined ? { averageCost: overrideAverageCost } : {}),
      totalValue,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ── Inventory Locations ──────────────────────────────────

export async function createInventoryLocation(
  payload: InventoryLocationFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, LOCATIONS_COL), {
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
  await updateDoc(doc(db, LOCATIONS_COL, id), {
    ...stripUndefined(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function listInventoryLocations(): Promise<InventoryLocation[]> {
  const q = query(collection(db, LOCATIONS_COL), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToLocation(d.id, d.data()));
}

export async function getInventoryLocationById(id: string): Promise<InventoryLocation | null> {
  const snap = await getDoc(doc(db, LOCATIONS_COL, id));
  if (!snap.exists()) return null;
  return docToLocation(snap.id, snap.data());
}

// ── Inventory Movements ──────────────────────────────────

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
 * Register a stock entry (purchase, return, sale, adjustment) for a specific location.
 * Updates the stock entry and creates a movement record in a transaction.
 */
export async function adjustInventoryStock(
  itemId: string,
  locationId: string,
  type: InventoryMovementType,
  quantity: number,
  opts?: {
    unitCost?: number;
    referenceType?: InventoryReferenceType;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
    allowNegative?: boolean;
    minimumStock?: number;
  }
): Promise<void> {
  const stockId = stockDocId(itemId, locationId);
  const stockRef = doc(db, STOCK_COL, stockId);
  const itemRef = doc(db, ITEMS_COL, itemId);
  const movementsCol = collection(db, MOVEMENTS_COL);

  await runTransaction(db, async (tx) => {
    const [stockSnap, itemSnap] = await Promise.all([
      tx.get(stockRef),
      tx.get(itemRef),
    ]);

    if (!itemSnap.exists()) throw new Error("Art\u00edculo no encontrado");

    const item = docToItem(itemSnap.id, itemSnap.data());
    const existing = stockSnap.exists() ? docToStock(stockSnap.id, stockSnap.data()) : null;
    const prevStock = existing?.currentStock ?? 0;
    const prevMinStock = existing?.minimumStock ?? opts?.minimumStock ?? 0;

    const isIn = IN_MOVEMENT_TYPES.includes(type);
    const delta = isIn ? quantity : -quantity;
    const newStock = prevStock + delta;

    if (newStock < 0 && type !== "adjustment_out" && !opts?.allowNegative) {
      throw new Error(
        `Stock insuficiente. Disponible: ${prevStock}, solicitado: ${quantity}`
      );
    }

    // Compute new weighted average cost for purchase_in
    let newAverageCost = existing?.averageCost ?? item.averageCost;
    if (type === "purchase_in" && opts?.unitCost !== undefined && opts.unitCost > 0) {
      const prevTotal = prevStock * newAverageCost;
      const inTotal = quantity * opts.unitCost;
      const newTotal = prevStock + quantity;
      newAverageCost = newTotal > 0 ? (prevTotal + inTotal) / newTotal : opts.unitCost;
    }

    const safeStock = Math.max(0, newStock);
    const effectiveCost = newAverageCost;
    const totalValue = safeStock * effectiveCost;

    tx.set(
      stockRef,
      {
        itemId,
        locationId,
        currentStock: safeStock,
        minimumStock: prevMinStock,
        averageCost: effectiveCost,
        totalValue,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Update item-level averageCost and lastPurchaseCost for purchase_in
    if (type === "purchase_in" && opts?.unitCost !== undefined) {
      tx.update(itemRef, {
        averageCost: newAverageCost,
        lastPurchaseCost: opts.unitCost,
        updatedAt: serverTimestamp(),
      });
    }

    const totalCost = opts?.unitCost !== undefined ? quantity * opts.unitCost : undefined;

    const movRef = doc(movementsCol);
    tx.set(movRef, {
      itemId,
      locationId,
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
 * Transfer stock from one location to another for the same item.
 * Decreases stock in source, increases in destination.
 * Creates transfer_out + transfer_in movement records.
 * Auto-creates destination stock entry if it does not exist.
 */
export async function transferInventoryStock(
  itemId: string,
  fromLocationId: string,
  toLocationId: string,
  quantity: number,
  opts?: {
    notes?: string;
    createdBy?: string;
    fromLocationName?: string;
    toLocationName?: string;
  }
): Promise<void> {
  const sourceId = stockDocId(itemId, fromLocationId);
  const destId = stockDocId(itemId, toLocationId);
  const sourceRef = doc(db, STOCK_COL, sourceId);
  const destRef = doc(db, STOCK_COL, destId);
  const itemRef = doc(db, ITEMS_COL, itemId);
  const movementsCol = collection(db, MOVEMENTS_COL);

  await runTransaction(db, async (tx) => {
    const [sourceSnap, destSnap, itemSnap] = await Promise.all([
      tx.get(sourceRef),
      tx.get(destRef),
      tx.get(itemRef),
    ]);

    if (!itemSnap.exists()) throw new Error("Art\u00edculo no encontrado");
    if (!sourceSnap.exists()) throw new Error("No hay stock registrado en la ubicaci\u00f3n origen.");

    const item = docToItem(itemSnap.id, itemSnap.data());
    const source = docToStock(sourceSnap.id, sourceSnap.data());
    const dest = destSnap.exists()
      ? docToStock(destSnap.id, destSnap.data())
      : null;

    if (source.currentStock < quantity) {
      throw new Error(
        `Stock insuficiente. Disponible: ${source.currentStock}, solicitado: ${quantity}`
      );
    }

    const cost = source.averageCost ?? item.averageCost;
    const newSourceStock = source.currentStock - quantity;
    const destPrevStock = dest?.currentStock ?? 0;
    const destCost = dest?.averageCost ?? item.averageCost;
    const newDestStock = destPrevStock + quantity;

    // Weighted avg cost for destination
    const newDestCost =
      destPrevStock === 0
        ? cost
        : (destPrevStock * destCost + quantity * cost) / newDestStock;

    tx.set(
      sourceRef,
      {
        itemId,
        locationId: fromLocationId,
        currentStock: newSourceStock,
        minimumStock: source.minimumStock,
        averageCost: cost,
        totalValue: newSourceStock * cost,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      destRef,
      {
        itemId,
        locationId: toLocationId,
        currentStock: newDestStock,
        minimumStock: dest?.minimumStock ?? 0,
        averageCost: newDestCost,
        totalValue: newDestStock * newDestCost,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const transferRefId = doc(movementsCol).id;

    const outNotes = opts?.notes ?? (opts?.toLocationName ? `\u2192 ${opts.toLocationName}` : undefined);
    const inNotes = opts?.notes ?? (opts?.fromLocationName ? `\u2190 ${opts.fromLocationName}` : undefined);

    const outRef = doc(movementsCol);
    tx.set(outRef, {
      itemId,
      fromLocationId,
      toLocationId,
      locationId: fromLocationId,
      type: "transfer_out" as InventoryMovementType,
      quantity,
      referenceType: "transfer" as InventoryReferenceType,
      referenceId: transferRefId,
      ...(outNotes ? { notes: outNotes } : {}),
      ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
      createdAt: serverTimestamp(),
    });

    const inRef = doc(movementsCol);
    tx.set(inRef, {
      itemId,
      fromLocationId,
      toLocationId,
      locationId: toLocationId,
      type: "transfer_in" as InventoryMovementType,
      quantity,
      referenceType: "transfer" as InventoryReferenceType,
      referenceId: transferRefId,
      ...(inNotes ? { notes: inNotes } : {}),
      ...(opts?.createdBy ? { createdBy: opts.createdBy } : {}),
      createdAt: serverTimestamp(),
    });
  });
}
