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
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Supplier,
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchasePayment,
} from "@/types/purchases";
import type {
  SupplierFormValues,
  PurchaseRequestFormValues,
  PurchaseRequestItemFormValues,
  PurchaseOrderFormValues,
  PurchaseOrderItemFormValues,
} from "@/lib/schemas/purchases";

// ── Collection names ──────────────────────────────────────

const SUPPLIERS_COL = "suppliers";
const PURCHASE_REQUESTS_COL = "purchaseRequests";
const PURCHASE_REQUEST_ITEMS_COL = "purchaseRequestItems";
const PURCHASE_ORDERS_COL = "purchaseOrders";
const PURCHASE_ORDER_ITEMS_COL = "purchaseOrderItems";
const PURCHASE_PAYMENTS_COL = "purchasePayments";
const STOCK_COL = "inventoryStock";
const ITEMS_COL = "inventoryItems";
const MOVEMENTS_COL = "inventoryMovements";

// ── Helpers ───────────────────────────────────────────────

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToSupplier(id: string, data: Record<string, any>): Supplier {
  return {
    id,
    name: data.name,
    contactName: data.contactName ?? undefined,
    phone: data.phone ?? undefined,
    email: data.email ?? undefined,
    address: data.address ?? undefined,
    category: data.category,
    notes: data.notes ?? undefined,
    isActive: data.isActive ?? true,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPurchaseRequest(id: string, data: Record<string, any>): PurchaseRequest {
  return {
    id,
    requestNumber: data.requestNumber,
    sourceType: data.sourceType,
    sourceId: data.sourceId ?? undefined,
    status: data.status,
    priority: data.priority,
    neededByDate: data.neededByDate ? toDate(data.neededByDate) : undefined,
    destinationLocationId: data.destinationLocationId,
    destinationLocationName: data.destinationLocationName ?? undefined,
    notes: data.notes ?? undefined,
    internalNotes: data.internalNotes ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPurchaseRequestItem(id: string, data: Record<string, any>): PurchaseRequestItem {
  return {
    id,
    purchaseRequestId: data.purchaseRequestId,
    inventoryItemId: data.inventoryItemId,
    itemName: data.itemName,
    itemType: data.itemType,
    quantity: data.quantity,
    unit: data.unit,
    estimatedUnitCost: data.estimatedUnitCost ?? undefined,
    estimatedTotalCost: data.estimatedTotalCost ?? undefined,
    notes: data.notes ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPurchaseOrder(id: string, data: Record<string, any>): PurchaseOrder {
  return {
    id,
    purchaseOrderNumber: data.purchaseOrderNumber,
    purchaseRequestId: data.purchaseRequestId ?? undefined,
    supplierId: data.supplierId ?? undefined,
    supplierName: data.supplierName ?? undefined,
    status: data.status,
    destinationLocationId: data.destinationLocationId,
    destinationLocationName: data.destinationLocationName ?? undefined,
    expectedDeliveryDate: data.expectedDeliveryDate ? toDate(data.expectedDeliveryDate) : undefined,
    subtotal: data.subtotal ?? 0,
    discountAmount: data.discountAmount ?? 0,
    taxAmount: data.taxAmount ?? 0,
    total: data.total ?? 0,
    paidAmount: data.paidAmount ?? 0,
    balanceDue: data.balanceDue ?? 0,
    paymentStatus: data.paymentStatus ?? "unpaid",
    notes: data.notes ?? undefined,
    internalNotes: data.internalNotes ?? undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPurchaseOrderItem(id: string, data: Record<string, any>): PurchaseOrderItem {
  return {
    id,
    purchaseOrderId: data.purchaseOrderId,
    inventoryItemId: data.inventoryItemId,
    itemName: data.itemName,
    itemType: data.itemType,
    quantityOrdered: data.quantityOrdered,
    quantityReceived: data.quantityReceived ?? 0,
    unit: data.unit,
    unitCost: data.unitCost,
    totalCost: data.totalCost,
    assignToType: data.assignToType ?? "stock",
    productionOrderId: data.productionOrderId ?? undefined,
    productionOrderName: data.productionOrderName ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPurchasePayment(id: string, data: Record<string, any>): PurchasePayment {
  return {
    id,
    purchaseOrderId: data.purchaseOrderId,
    amount: data.amount,
    paymentDate: toDate(data.paymentDate),
    method: data.method ?? undefined,
    reference: data.reference ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: toDate(data.createdAt),
  };
}

/** Generate sequential order numbers */
async function generateRequestNumber(): Promise<string> {
  const snap = await getDocs(collection(db, PURCHASE_REQUESTS_COL));
  const n = snap.size + 1;
  return `SR-${String(n).padStart(4, "0")}`;
}

async function generatePurchaseOrderNumber(): Promise<string> {
  const snap = await getDocs(collection(db, PURCHASE_ORDERS_COL));
  const n = snap.size + 1;
  return `OC-${String(n).padStart(4, "0")}`;
}

// ── Suppliers ─────────────────────────────────────────────

export async function listSuppliers(): Promise<Supplier[]> {
  const snap = await getDocs(
    query(collection(db, SUPPLIERS_COL), orderBy("name", "asc"))
  );
  return snap.docs.map((d) => docToSupplier(d.id, d.data() as Record<string, unknown>));
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const snap = await getDoc(doc(db, SUPPLIERS_COL, id));
  if (!snap.exists()) return null;
  return docToSupplier(snap.id, snap.data() as Record<string, unknown>);
}

export async function createSupplier(values: SupplierFormValues): Promise<string> {
  const ref = await addDoc(collection(db, SUPPLIERS_COL), {
    ...stripUndefined(values),
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSupplier(id: string, values: Partial<SupplierFormValues>): Promise<void> {
  await updateDoc(doc(db, SUPPLIERS_COL, id), {
    ...stripUndefined(values as object),
    updatedAt: serverTimestamp(),
  });
}

export async function toggleSupplierActive(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, SUPPLIERS_COL, id), { isActive, updatedAt: serverTimestamp() });
}

export async function deleteSupplier(id: string): Promise<void> {
  await deleteDoc(doc(db, SUPPLIERS_COL, id));
}

// ── Purchase Requests ─────────────────────────────────────

export async function listPurchaseRequests(): Promise<PurchaseRequest[]> {
  const snap = await getDocs(
    query(collection(db, PURCHASE_REQUESTS_COL), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => docToPurchaseRequest(d.id, d.data() as Record<string, unknown>));
}

export async function getPurchaseRequest(id: string): Promise<PurchaseRequest | null> {
  const snap = await getDoc(doc(db, PURCHASE_REQUESTS_COL, id));
  if (!snap.exists()) return null;
  return docToPurchaseRequest(snap.id, snap.data() as Record<string, unknown>);
}

export async function listPurchaseRequestItems(purchaseRequestId: string): Promise<PurchaseRequestItem[]> {
  const snap = await getDocs(
    query(
      collection(db, PURCHASE_REQUEST_ITEMS_COL),
      where("purchaseRequestId", "==", purchaseRequestId)
    )
  );
  return snap.docs.map((d) => docToPurchaseRequestItem(d.id, d.data() as Record<string, unknown>));
}

export async function createPurchaseRequest(
  values: PurchaseRequestFormValues,
  items: PurchaseRequestItemFormValues[],
  locationName?: string
): Promise<string> {
  const requestNumber = await generateRequestNumber();
  const ref = await addDoc(collection(db, PURCHASE_REQUESTS_COL), {
    ...stripUndefined(values as object),
    requestNumber,
    destinationLocationName: locationName ?? "",
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  for (const item of items) {
    const estimatedTotalCost =
      item.estimatedUnitCost != null
        ? item.estimatedUnitCost * item.quantity
        : null;
    await addDoc(collection(db, PURCHASE_REQUEST_ITEMS_COL), {
      ...stripUndefined(item as object),
      purchaseRequestId: ref.id,
      ...(estimatedTotalCost != null ? { estimatedTotalCost } : {}),
    });
  }

  return ref.id;
}

export async function updatePurchaseRequestStatus(
  id: string,
  status: string
): Promise<void> {
  await updateDoc(doc(db, PURCHASE_REQUESTS_COL, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePurchaseRequest(id: string): Promise<void> {
  // Delete items first
  const items = await listPurchaseRequestItems(id);
  for (const item of items) {
    await deleteDoc(doc(db, PURCHASE_REQUEST_ITEMS_COL, item.id));
  }
  await deleteDoc(doc(db, PURCHASE_REQUESTS_COL, id));
}

// ── Purchase Orders ───────────────────────────────────────

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const snap = await getDocs(
    query(collection(db, PURCHASE_ORDERS_COL), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => docToPurchaseOrder(d.id, d.data() as Record<string, unknown>));
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const snap = await getDoc(doc(db, PURCHASE_ORDERS_COL, id));
  if (!snap.exists()) return null;
  return docToPurchaseOrder(snap.id, snap.data() as Record<string, unknown>);
}

export async function listPurchaseOrderItems(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
  const snap = await getDocs(
    query(
      collection(db, PURCHASE_ORDER_ITEMS_COL),
      where("purchaseOrderId", "==", purchaseOrderId)
    )
  );
  return snap.docs.map((d) => docToPurchaseOrderItem(d.id, d.data() as Record<string, unknown>));
}

export async function listPurchasePayments(purchaseOrderId: string): Promise<PurchasePayment[]> {
  const snap = await getDocs(
    query(
      collection(db, PURCHASE_PAYMENTS_COL),
      where("purchaseOrderId", "==", purchaseOrderId),
      orderBy("paymentDate", "desc")
    )
  );
  return snap.docs.map((d) => docToPurchasePayment(d.id, d.data() as Record<string, unknown>));
}

export async function createPurchaseOrder(
  values: PurchaseOrderFormValues,
  items: PurchaseOrderItemFormValues[],
  locationName?: string,
  supplierName?: string
): Promise<string> {
  const purchaseOrderNumber = await generatePurchaseOrderNumber();

  const subtotal = items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);
  const discount = values.discountAmount ?? 0;
  const tax = values.taxAmount ?? 0;
  const total = subtotal - discount + tax;

  const ref = await addDoc(collection(db, PURCHASE_ORDERS_COL), {
    ...stripUndefined(values as object),
    purchaseOrderNumber,
    supplierName: supplierName ?? "",
    destinationLocationName: locationName ?? "",
    status: "draft",
    subtotal,
    discountAmount: discount,
    taxAmount: tax,
    total,
    paidAmount: 0,
    balanceDue: total,
    paymentStatus: "unpaid",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  for (const item of items) {
    await addDoc(collection(db, PURCHASE_ORDER_ITEMS_COL), {
      ...stripUndefined(item as object),
      purchaseOrderId: ref.id,
      quantityReceived: 0,
      totalCost: item.quantityOrdered * item.unitCost,
    });
  }

  return ref.id;
}

export async function updatePurchaseOrderStatus(id: string, status: string): Promise<void> {
  await updateDoc(doc(db, PURCHASE_ORDERS_COL, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const items = await listPurchaseOrderItems(id);
  for (const item of items) {
    await deleteDoc(doc(db, PURCHASE_ORDER_ITEMS_COL, item.id));
  }
  await deleteDoc(doc(db, PURCHASE_ORDERS_COL, id));
}

// ── Receive items ─────────────────────────────────────────

interface ReceiveEntry {
  orderItemId: string;
  inventoryItemId: string;
  itemName: string;
  quantityToReceive: number;
  unitCost: number;
  assignToType: "stock" | "production_order";
  productionOrderId?: string;
}

export async function receivePurchaseOrderItems(
  purchaseOrderId: string,
  destinationLocationId: string,
  entries: ReceiveEntry[]
): Promise<void> {
  const orderRef = doc(db, PURCHASE_ORDERS_COL, purchaseOrderId);

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error("Orden de compra no encontrada");

    const order = docToPurchaseOrder(orderSnap.id, orderSnap.data() as Record<string, unknown>);
    if (order.status === "cancelled") throw new Error("No se puede recibir una orden cancelada");

    for (const entry of entries) {
      if (entry.quantityToReceive <= 0) continue;

      const itemOrderRef = doc(db, PURCHASE_ORDER_ITEMS_COL, entry.orderItemId);
      const itemOrderSnap = await tx.get(itemOrderRef);
      if (!itemOrderSnap.exists()) continue;
      const itemOrder = docToPurchaseOrderItem(itemOrderSnap.id, itemOrderSnap.data() as Record<string, unknown>);

      const remaining = itemOrder.quantityOrdered - itemOrder.quantityReceived;
      const toReceive = Math.min(entry.quantityToReceive, remaining);
      if (toReceive <= 0) continue;

      // Update order item received qty
      tx.update(itemOrderRef, {
        quantityReceived: itemOrder.quantityReceived + toReceive,
      });

      // Find or create stock record for this item+location
      const stockQuery = query(
        collection(db, STOCK_COL),
        where("itemId", "==", entry.inventoryItemId),
        where("locationId", "==", destinationLocationId)
      );
      const stockSnap = await getDocs(stockQuery);

      if (!stockSnap.empty) {
        const stockDoc = stockSnap.docs[0];
        const current = stockDoc.data() as Record<string, unknown>;
        const currentStock = (current.currentStock as number) ?? 0;
        const currentAvgCost = (current.averageCost as number) ?? entry.unitCost;

        const newAvgCost =
          currentStock + toReceive > 0
            ? (currentStock * currentAvgCost + toReceive * entry.unitCost) /
              (currentStock + toReceive)
            : entry.unitCost;

        const newStock = currentStock + toReceive;
        const newTotalValue = newStock * newAvgCost;

        tx.update(doc(db, STOCK_COL, stockDoc.id), {
          currentStock: newStock,
          averageCost: newAvgCost,
          totalValue: newTotalValue,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create stock record
        const newStockRef = doc(collection(db, STOCK_COL));
        tx.set(newStockRef, {
          itemId: entry.inventoryItemId,
          locationId: destinationLocationId,
          currentStock: toReceive,
          minimumStock: 0,
          averageCost: entry.unitCost,
          totalValue: toReceive * entry.unitCost,
          updatedAt: serverTimestamp(),
        });
      }

      // Update master item averageCost
      const masterRef = doc(db, ITEMS_COL, entry.inventoryItemId);
      const masterSnap = await tx.get(masterRef);
      if (masterSnap.exists()) {
        const masterData = masterSnap.data() as Record<string, unknown>;
        const masterAvg = (masterData.averageCost as number) ?? entry.unitCost;
        // We'll update lastPurchaseCost as well
        tx.update(masterRef, {
          lastPurchaseCost: entry.unitCost,
          averageCost: masterAvg, // keep master avg; stock record has per-location avg
          updatedAt: serverTimestamp(),
        });
      }

      // Create inventory movement
      const movRef = doc(collection(db, MOVEMENTS_COL));
      tx.set(movRef, {
        itemId: entry.inventoryItemId,
        locationId: destinationLocationId,
        toLocationId: destinationLocationId,
        type: "purchase_in",
        quantity: toReceive,
        unitCost: entry.unitCost,
        totalCost: toReceive * entry.unitCost,
        referenceType: "purchase",
        referenceId: purchaseOrderId,
        notes: entry.assignToType === "production_order" && entry.productionOrderId
          ? `Reservado para proyecto ${entry.productionOrderId}`
          : undefined,
        productionOrderId: entry.productionOrderId ?? null,
        assignToType: entry.assignToType,
        createdAt: serverTimestamp(),
      });
    }

    // Re-check all items to determine new order status
    const allItemsSnap = await getDocs(
      query(collection(db, PURCHASE_ORDER_ITEMS_COL), where("purchaseOrderId", "==", purchaseOrderId))
    );
    const allItems = allItemsSnap.docs.map((d) =>
      docToPurchaseOrderItem(d.id, d.data() as Record<string, unknown>)
    );

    // Account for the updates we made in this transaction
    const updatedItems = allItems.map((item) => {
      const entry = entries.find((e) => e.orderItemId === item.id);
      if (entry) {
        return {
          ...item,
          quantityReceived: item.quantityReceived + Math.min(entry.quantityToReceive, item.quantityOrdered - item.quantityReceived),
        };
      }
      return item;
    });

    const allReceived = updatedItems.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = updatedItems.some((i) => i.quantityReceived > 0);

    const newStatus = allReceived ? "received" : anyReceived ? "partially_received" : order.status;
    tx.update(orderRef, { status: newStatus, updatedAt: serverTimestamp() });
  });
}

// ── Payments ──────────────────────────────────────────────

export async function addPurchasePayment(
  purchaseOrderId: string,
  amount: number,
  paymentDate: string,
  method?: string,
  reference?: string,
  notes?: string
): Promise<void> {
  const orderRef = doc(db, PURCHASE_ORDERS_COL, purchaseOrderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error("Orden no encontrada");

  const order = docToPurchaseOrder(orderSnap.id, orderSnap.data() as Record<string, unknown>);
  const newPaid = order.paidAmount + amount;
  const newBalance = order.total - newPaid;
  const paymentStatus =
    newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

  await addDoc(collection(db, PURCHASE_PAYMENTS_COL), {
    purchaseOrderId,
    amount,
    paymentDate: new Date(paymentDate),
    method: method ?? null,
    reference: reference ?? null,
    notes: notes ?? null,
    createdAt: serverTimestamp(),
  });

  await updateDoc(orderRef, {
    paidAmount: newPaid,
    balanceDue: Math.max(0, newBalance),
    paymentStatus,
    updatedAt: serverTimestamp(),
  });
}

// ── Dashboard stats ───────────────────────────────────────

export interface PurchaseStats {
  pendingRequests: number;
  pendingOrders: number;
  ordersToReceive: number;
  pendingBalance: number;
  totalThisMonth: number;
}

export async function getPurchaseStats(): Promise<PurchaseStats> {
  const [requestsSnap, ordersSnap] = await Promise.all([
    getDocs(collection(db, PURCHASE_REQUESTS_COL)),
    getDocs(collection(db, PURCHASE_ORDERS_COL)),
  ]);

  const requests = requestsSnap.docs.map((d) =>
    docToPurchaseRequest(d.id, d.data() as Record<string, unknown>)
  );
  const orders = ordersSnap.docs.map((d) =>
    docToPurchaseOrder(d.id, d.data() as Record<string, unknown>)
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pendingRequests = requests.filter(
    (r) => r.status === "draft" || r.status === "pending_approval" || r.status === "approved"
  ).length;

  const pendingOrders = orders.filter(
    (o) => o.status === "draft" || o.status === "sent" || o.status === "confirmed"
  ).length;

  const ordersToReceive = orders.filter(
    (o) => o.status === "confirmed" || o.status === "partially_received"
  ).length;

  const pendingBalance = orders
    .filter((o) => o.status !== "cancelled" && o.paymentStatus !== "paid")
    .reduce((s, o) => s + o.balanceDue, 0);

  const totalThisMonth = orders
    .filter((o) => o.status !== "cancelled" && o.createdAt >= startOfMonth)
    .reduce((s, o) => s + o.total, 0);

  return { pendingRequests, pendingOrders, ordersToReceive, pendingBalance, totalThisMonth };
}
