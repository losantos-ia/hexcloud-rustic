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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order, OrderItem, OrderPayment, OrderStatus } from "@/types/order";
import type { OrderItemFormValues, OrderPaymentFormValues } from "@/lib/schemas/order";

const ORDERS_COL = "orders";
const ITEMS_COL = "orderItems";
const PAYMENTS_COL = "orderPayments";

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
function docToOrder(id: string, data: Record<string, any>): Order {
  return {
    id,
    orderNumber: data.orderNumber,
    quotationId: data.quotationId ?? undefined,
    leadId: data.leadId ?? undefined,
    clientId: data.clientId ?? undefined,
    clientDocumentId: data.clientDocumentId ?? undefined,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    clientAddress: data.clientAddress ?? undefined,
    clientCity: data.clientCity ?? undefined,
    clientDepartment: data.clientDepartment ?? undefined,
    source: data.source,
    storeId: data.storeId ?? undefined,
    projectType: data.projectType,
    title: data.title,
    description: data.description ?? undefined,
    status: data.status,
    priority: data.priority,
    finalSalePrice: data.finalSalePrice ?? 0,
    depositRequired: data.depositRequired ?? 0,
    depositPaid: data.depositPaid ?? 0,
    balanceDue: data.balanceDue ?? 0,
    promisedDeliveryDate: toDate(data.promisedDeliveryDate),
    installationRequired: data.installationRequired ?? false,
    deliveryAddress: data.deliveryAddress ?? undefined,
    googleMapsUrl: data.googleMapsUrl ?? undefined,
    notes: data.notes ?? undefined,
    internalNotes: data.internalNotes ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToItem(id: string, data: Record<string, any>): OrderItem {
  return {
    id,
    orderId: data.orderId,
    description: data.description,
    quantity: data.quantity,
    unit: data.unit,
    unitPrice: data.unitPrice,
    total: data.total,
    category: data.category,
    notes: data.notes ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToPayment(id: string, data: Record<string, any>): OrderPayment {
  return {
    id,
    orderId: data.orderId,
    type: data.type,
    amount: data.amount,
    method: data.method,
    paymentDate: toDate(data.paymentDate) ?? new Date(),
    notes: data.notes ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
  };
}

// ── Order number generation ─────────────────────────────

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await getDocs(collection(db, ORDERS_COL));
  const thisYearCount = snap.docs.filter((d) => {
    const num: string = d.data().orderNumber ?? "";
    return num.startsWith(`PED-${year}`);
  }).length;
  const next = String(thisYearCount + 1).padStart(4, "0");
  return `PED-${year}-${next}`;
}

// ── Order CRUD ──────────────────────────────────────────

export interface CreateOrderPayload {
  clientName: string;
  clientPhone: string;
  quotationId?: string;
  leadId?: string;
  clientId?: string;
  clientDocumentId?: string;
  clientAddress?: string;
  clientCity?: string;
  clientDepartment?: string;
  source: Order["source"];
  storeId?: string;
  projectType: Order["projectType"];
  title?: string;
  description?: string;
  status: OrderStatus;
  priority: Order["priority"];
  finalSalePrice: number;
  depositRequired: number;
  depositPaid: number;
  promisedDeliveryDate?: Date;
  installationRequired: boolean;
  deliveryAddress?: string;
  googleMapsUrl?: string;
  notes?: string;
  internalNotes?: string;
  items: OrderItemFormValues[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<string> {
  const orderNumber = await generateOrderNumber();
  const balanceDue = payload.finalSalePrice - payload.depositPaid;

  const docRef = await addDoc(collection(db, ORDERS_COL), {
    ...stripUndefined({
      quotationId: payload.quotationId,
      leadId: payload.leadId,
      clientId: payload.clientId,
      clientDocumentId: payload.clientDocumentId,
      clientAddress: payload.clientAddress,
      clientCity: payload.clientCity,
      clientDepartment: payload.clientDepartment,
      storeId: payload.storeId,
      description: payload.description,
      promisedDeliveryDate: payload.promisedDeliveryDate ?? null,
      deliveryAddress: payload.deliveryAddress,
      googleMapsUrl: payload.googleMapsUrl,
      notes: payload.notes,
      internalNotes: payload.internalNotes,
    }),
    orderNumber,
    clientName: payload.clientName,
    clientPhone: payload.clientPhone,
    source: payload.source,
    projectType: payload.projectType,
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    status: payload.status,
    priority: payload.priority,
    finalSalePrice: payload.finalSalePrice,
    depositRequired: payload.depositRequired,
    depositPaid: payload.depositPaid,
    balanceDue,
    installationRequired: payload.installationRequired,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Save items
  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    await addDoc(collection(db, ITEMS_COL), {
      orderId: docRef.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      category: item.category,
      notes: item.notes ?? null,
      order: i,
    });
  }

  return docRef.id;
}

export async function updateOrder(
  id: string,
  payload: Partial<Omit<CreateOrderPayload, "items">>
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (payload.clientName !== undefined) updates.clientName = payload.clientName;
  if (payload.clientPhone !== undefined) updates.clientPhone = payload.clientPhone;
  if (payload.source !== undefined) updates.source = payload.source;
  if (payload.projectType !== undefined) updates.projectType = payload.projectType;
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.installationRequired !== undefined) updates.installationRequired = payload.installationRequired;
  if (payload.quotationId !== undefined) updates.quotationId = payload.quotationId;
  if (payload.leadId !== undefined) updates.leadId = payload.leadId;
  if (payload.clientId !== undefined) updates.clientId = payload.clientId;
  if (payload.clientDocumentId !== undefined) updates.clientDocumentId = payload.clientDocumentId;
  if (payload.clientAddress !== undefined) updates.clientAddress = payload.clientAddress;
  if (payload.clientCity !== undefined) updates.clientCity = payload.clientCity;
  if (payload.clientDepartment !== undefined) updates.clientDepartment = payload.clientDepartment;
  if (payload.storeId !== undefined) updates.storeId = payload.storeId;
  if (payload.deliveryAddress !== undefined) updates.deliveryAddress = payload.deliveryAddress;
  if (payload.googleMapsUrl !== undefined) updates.googleMapsUrl = payload.googleMapsUrl;
  if (payload.notes !== undefined) updates.notes = payload.notes;
  if (payload.internalNotes !== undefined) updates.internalNotes = payload.internalNotes;
  if (payload.promisedDeliveryDate !== undefined) updates.promisedDeliveryDate = payload.promisedDeliveryDate ?? null;

  if (payload.finalSalePrice !== undefined || payload.depositPaid !== undefined) {
    const snap = await getDoc(doc(db, ORDERS_COL, id));
    const current = snap.data() ?? {};
    const finalSalePrice = payload.finalSalePrice ?? current.finalSalePrice ?? 0;
    const depositPaid = payload.depositPaid ?? current.depositPaid ?? 0;
    const depositRequired = payload.depositRequired ?? current.depositRequired ?? 0;
    updates.finalSalePrice = finalSalePrice;
    updates.depositPaid = depositPaid;
    updates.depositRequired = depositRequired;
    updates.balanceDue = finalSalePrice - depositPaid;
  } else if (payload.depositRequired !== undefined) {
    updates.depositRequired = payload.depositRequired;
  }

  await updateDoc(doc(db, ORDERS_COL, id), updates);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, ORDERS_COL, id));
  if (!snap.exists()) return null;
  return docToOrder(snap.id, snap.data() as Record<string, unknown>);
}

export async function listOrders(): Promise<Order[]> {
  const snap = await getDocs(query(collection(db, ORDERS_COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => docToOrder(d.id, d.data() as Record<string, unknown>));
}

export async function listOrdersByStatus(status: OrderStatus): Promise<Order[]> {
  const snap = await getDocs(
    query(collection(db, ORDERS_COL), where("status", "==", status), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => docToOrder(d.id, d.data() as Record<string, unknown>));
}

// ── Order Items ─────────────────────────────────────────

export async function listOrderItems(orderId: string): Promise<OrderItem[]> {
  const snap = await getDocs(
    query(collection(db, ITEMS_COL), where("orderId", "==", orderId), orderBy("order", "asc"))
  );
  return snap.docs.map((d) => docToItem(d.id, d.data() as Record<string, unknown>));
}

export async function addOrderItem(orderId: string, item: OrderItemFormValues): Promise<string> {
  const snap = await getDocs(query(collection(db, ITEMS_COL), where("orderId", "==", orderId)));
  const ref = await addDoc(collection(db, ITEMS_COL), {
    orderId,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    total: item.quantity * item.unitPrice,
    category: item.category,
    notes: item.notes ?? null,
    order: snap.size,
  });
  return ref.id;
}

export async function updateOrderItem(
  itemId: string,
  item: Partial<OrderItemFormValues>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (item.description !== undefined) updates.description = item.description;
  if (item.quantity !== undefined) updates.quantity = item.quantity;
  if (item.unit !== undefined) updates.unit = item.unit;
  if (item.unitPrice !== undefined) updates.unitPrice = item.unitPrice;
  if (item.category !== undefined) updates.category = item.category;
  if (item.notes !== undefined) updates.notes = item.notes;
  if (item.quantity !== undefined && item.unitPrice !== undefined) {
    updates.total = item.quantity * item.unitPrice;
  }
  await updateDoc(doc(db, ITEMS_COL, itemId), updates);
}

export async function deleteOrderItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, ITEMS_COL, itemId));
}

// ── Order Payments ──────────────────────────────────────

export async function listOrderPayments(orderId: string): Promise<OrderPayment[]> {
  const snap = await getDocs(
    query(collection(db, PAYMENTS_COL), where("orderId", "==", orderId), orderBy("paymentDate", "desc"))
  );
  return snap.docs.map((d) => docToPayment(d.id, d.data() as Record<string, unknown>));
}

export async function addOrderPayment(
  orderId: string,
  payment: OrderPaymentFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, PAYMENTS_COL), {
    orderId,
    type: payment.type,
    amount: payment.amount,
    method: payment.method,
    paymentDate: new Date(payment.paymentDate),
    notes: payment.notes ?? null,
    createdAt: serverTimestamp(),
  });

  // Recalculate depositPaid and balanceDue on the order
  const orderSnap = await getDoc(doc(db, ORDERS_COL, orderId));
  if (orderSnap.exists()) {
    const data = orderSnap.data();
    const newDepositPaid = (data.depositPaid ?? 0) + payment.amount;
    const balanceDue = (data.finalSalePrice ?? 0) - newDepositPaid;
    await updateDoc(doc(db, ORDERS_COL, orderId), {
      depositPaid: newDepositPaid,
      balanceDue,
      updatedAt: serverTimestamp(),
    });
  }

  return ref.id;
}
