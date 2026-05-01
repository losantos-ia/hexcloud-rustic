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
import { adjustInventoryStock } from "@/lib/firestore/inventory";
import type {
  ProductionOrder,
  ProductionTask,
  ProductionPhoto,
  ProductionStatus,
  ProductionTaskStatus,
} from "@/types/production";
import { DEFAULT_FABRICATION_TASKS } from "@/types/production";
import type {
  ProductionOrderFormValues,
  ProductionTaskFormValues,
  ProductionPhotoFormValues,
} from "@/lib/schemas/production";

const ORDERS_COL = "productionOrders";
const TASKS_COL = "productionTasks";
const PHOTOS_COL = "productionPhotos";

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
function docToProductionOrder(id: string, data: Record<string, any>): ProductionOrder {
  return {
    id,
    productionNumber: data.productionNumber,
    productionType: data.productionType ?? "order_based",
    orderId: data.orderId ?? undefined,
    clientName: data.clientName ?? undefined,
    clientPhone: data.clientPhone ?? undefined,
    inventoryItemId: data.inventoryItemId ?? undefined,
    quantityToProduce: data.quantityToProduce ?? undefined,
    destinationLocationId: data.destinationLocationId ?? undefined,
    unitCost: data.unitCost ?? undefined,
    totalProductionCost: data.totalProductionCost ?? undefined,
    inventoryPosted: data.inventoryPosted ?? false,
    inventoryPostedAt: toDate(data.inventoryPostedAt),
    projectType: data.projectType,
    title: data.title,
    description: data.description ?? undefined,
    status: data.status,
    priority: data.priority,
    workshopInternalPrice: data.workshopInternalPrice ?? undefined,
    estimatedMaterialCost: data.estimatedMaterialCost ?? undefined,
    estimatedLaborHours: data.estimatedLaborHours ?? undefined,
    actualLaborHours: data.actualLaborHours ?? undefined,
    plannedStartDate: toDate(data.plannedStartDate),
    promisedDeliveryDate: toDate(data.promisedDeliveryDate),
    actualFinishDate: toDate(data.actualFinishDate),
    assignedTeam: data.assignedTeam ?? undefined,
    responsiblePerson: data.responsiblePerson ?? undefined,
    notes: data.notes ?? undefined,
    internalNotes: data.internalNotes ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToProductionTask(id: string, data: Record<string, any>): ProductionTask {
  return {
    id,
    productionOrderId: data.productionOrderId,
    title: data.title,
    description: data.description ?? undefined,
    status: data.status as ProductionTaskStatus,
    assignedTo: data.assignedTo ?? undefined,
    estimatedHours: data.estimatedHours ?? undefined,
    actualHours: data.actualHours ?? undefined,
    dueDate: toDate(data.dueDate),
    completedAt: toDate(data.completedAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToProductionPhoto(id: string, data: Record<string, any>): ProductionPhoto {
  return {
    id,
    productionOrderId: data.productionOrderId,
    url: data.url,
    label: data.label ?? undefined,
    phase: data.phase ?? undefined,
    uploadedAt: toDate(data.uploadedAt) ?? new Date(),
    uploadedBy: data.uploadedBy ?? undefined,
  };
}

// ── Production number generation ─────────────────────────

export async function generateProductionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await getDocs(collection(db, ORDERS_COL));
  const thisYearCount = snap.docs.filter((d) => {
    const num: string = d.data().productionNumber ?? "";
    return num.startsWith(`PROD-${year}`);
  }).length;
  const next = String(thisYearCount + 1).padStart(4, "0");
  return `PROD-${year}-${next}`;
}

// ── Production Orders ────────────────────────────────────

export async function createProductionOrder(
  payload: ProductionOrderFormValues
): Promise<string> {
  const productionNumber = await generateProductionNumber();

  const data = {
    ...stripUndefined({
      orderId: payload.orderId,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      inventoryItemId: payload.inventoryItemId,
      quantityToProduce: payload.quantityToProduce,
      destinationLocationId: payload.destinationLocationId,
      unitCost: payload.unitCost,
      totalProductionCost: payload.totalProductionCost,
      description: payload.description,
      workshopInternalPrice: payload.workshopInternalPrice,
      estimatedMaterialCost: payload.estimatedMaterialCost,
      estimatedLaborHours: payload.estimatedLaborHours,
      actualLaborHours: payload.actualLaborHours,
      plannedStartDate: payload.plannedStartDate ? new Date(payload.plannedStartDate) : undefined,
      promisedDeliveryDate: payload.promisedDeliveryDate ? new Date(payload.promisedDeliveryDate) : undefined,
      actualFinishDate: payload.actualFinishDate ? new Date(payload.actualFinishDate) : undefined,
      assignedTeam: payload.assignedTeam,
      responsiblePerson: payload.responsiblePerson,
      notes: payload.notes,
      internalNotes: payload.internalNotes,
    }),
    productionNumber,
    productionType: payload.productionType,
    projectType: payload.projectType,
    title: payload.title,
    status: payload.status,
    priority: payload.priority,
    inventoryPosted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, ORDERS_COL), data);
  if (data.status === "in_production") {
    await createDefaultFabricationTasks(ref.id);
  }
  return ref.id;
}

export async function updateProductionOrder(
  id: string,
  payload: Partial<ProductionOrderFormValues> & {
    actualFinishDate?: string | null;
    inventoryPosted?: boolean;
    inventoryPostedAt?: Date | null;
  }
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (payload.productionType !== undefined) updates.productionType = payload.productionType;
  if (payload.clientName !== undefined) updates.clientName = payload.clientName;
  if (payload.clientPhone !== undefined) updates.clientPhone = payload.clientPhone;
  if (payload.orderId !== undefined) updates.orderId = payload.orderId;
  if (payload.inventoryItemId !== undefined) updates.inventoryItemId = payload.inventoryItemId;
  if (payload.quantityToProduce !== undefined) updates.quantityToProduce = payload.quantityToProduce;
  if (payload.destinationLocationId !== undefined) updates.destinationLocationId = payload.destinationLocationId;
  if (payload.unitCost !== undefined) updates.unitCost = payload.unitCost;
  if (payload.totalProductionCost !== undefined) updates.totalProductionCost = payload.totalProductionCost;
  if (payload.inventoryPosted !== undefined) updates.inventoryPosted = payload.inventoryPosted;
  if (payload.inventoryPostedAt !== undefined) updates.inventoryPostedAt = payload.inventoryPostedAt;
  if (payload.projectType !== undefined) updates.projectType = payload.projectType;
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.priority !== undefined) updates.priority = payload.priority;
  if (payload.workshopInternalPrice !== undefined) updates.workshopInternalPrice = payload.workshopInternalPrice;
  if (payload.estimatedMaterialCost !== undefined) updates.estimatedMaterialCost = payload.estimatedMaterialCost;
  if (payload.estimatedLaborHours !== undefined) updates.estimatedLaborHours = payload.estimatedLaborHours;
  if (payload.actualLaborHours !== undefined) updates.actualLaborHours = payload.actualLaborHours;
  if (payload.assignedTeam !== undefined) updates.assignedTeam = payload.assignedTeam;
  if (payload.responsiblePerson !== undefined) updates.responsiblePerson = payload.responsiblePerson;
  if (payload.notes !== undefined) updates.notes = payload.notes;
  if (payload.internalNotes !== undefined) updates.internalNotes = payload.internalNotes;
  if (payload.plannedStartDate !== undefined) {
    updates.plannedStartDate = payload.plannedStartDate ? new Date(payload.plannedStartDate) : null;
  }
  if (payload.promisedDeliveryDate !== undefined) {
    updates.promisedDeliveryDate = payload.promisedDeliveryDate ? new Date(payload.promisedDeliveryDate) : null;
  }
  if (payload.actualFinishDate !== undefined) {
    updates.actualFinishDate = payload.actualFinishDate ? new Date(payload.actualFinishDate) : null;
  }

  await updateDoc(doc(db, ORDERS_COL, id), updates);
}

export async function getProductionOrderById(id: string): Promise<ProductionOrder | null> {
  const snap = await getDoc(doc(db, ORDERS_COL, id));
  if (!snap.exists()) return null;
  return docToProductionOrder(snap.id, snap.data());
}

export async function listProductionOrders(): Promise<ProductionOrder[]> {
  const snap = await getDocs(collection(db, ORDERS_COL));
  return snap.docs
    .map((d) => docToProductionOrder(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listProductionOrdersByStatus(
  status: ProductionStatus
): Promise<ProductionOrder[]> {
  const q = query(collection(db, ORDERS_COL), where("status", "==", status));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => docToProductionOrder(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Production Tasks ─────────────────────────────────────

/**
 * Seeds the default fabrication checklist tasks for a production order.
 * Should be called when an order enters or is created with status "in_production".
 */
export async function createDefaultFabricationTasks(productionOrderId: string): Promise<void> {
  await Promise.all(
    DEFAULT_FABRICATION_TASKS.map((title) =>
      addDoc(collection(db, TASKS_COL), {
        productionOrderId,
        title,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );
}

export async function createProductionTask(
  productionOrderId: string,
  payload: ProductionTaskFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, TASKS_COL), {
    ...stripUndefined({
      description: payload.description,
      assignedTo: payload.assignedTo,
      estimatedHours: payload.estimatedHours,
      actualHours: payload.actualHours,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
    }),
    productionOrderId,
    title: payload.title,
    status: payload.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProductionTask(
  id: string,
  payload: Partial<ProductionTaskFormValues> & { completedAt?: Date | null }
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.assignedTo !== undefined) updates.assignedTo = payload.assignedTo;
  if (payload.estimatedHours !== undefined) updates.estimatedHours = payload.estimatedHours;
  if (payload.actualHours !== undefined) updates.actualHours = payload.actualHours;
  if (payload.dueDate !== undefined) updates.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  if ("completedAt" in payload) updates.completedAt = payload.completedAt ?? null;

  await updateDoc(doc(db, TASKS_COL, id), updates);
}

export async function listProductionTasksByProductionOrder(
  productionOrderId: string
): Promise<ProductionTask[]> {
  const q = query(
    collection(db, TASKS_COL),
    where("productionOrderId", "==", productionOrderId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToProductionTask(d.id, d.data()));
}

// ── Production Photos ────────────────────────────────────

export async function addProductionPhoto(
  productionOrderId: string,
  payload: ProductionPhotoFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, PHOTOS_COL), {
    ...stripUndefined({
      label: payload.label,
      phase: payload.phase,
      uploadedBy: payload.uploadedBy,
    }),
    productionOrderId,
    url: payload.url,
    uploadedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listProductionPhotosByProductionOrder(
  productionOrderId: string
): Promise<ProductionPhoto[]> {
  const q = query(
    collection(db, PHOTOS_COL),
    where("productionOrderId", "==", productionOrderId),
    orderBy("uploadedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToProductionPhoto(d.id, d.data()));
}

// ── Inventory posting (stock production) ─────────────────

/**
 * Posts finished goods from a stock production order into inventory.
 * Can only be called once per order (guards on inventoryPosted flag).
 */
export async function postProductionToInventory(productionOrderId: string): Promise<void> {
  const order = await getProductionOrderById(productionOrderId);
  if (!order) throw new Error("Orden de producción no encontrada.");
  if (order.productionType !== "stock") throw new Error("Solo se puede registrar inventario en órdenes de tipo 'Para stock'.");
  if (order.inventoryPosted) throw new Error("El inventario ya fue registrado para esta orden.");
  if (!order.inventoryItemId) throw new Error("La orden no tiene un artículo de inventario asignado.");
  if (!order.destinationLocationId) throw new Error("La orden no tiene una ubicación de destino asignada.");
  const qty = order.quantityToProduce ?? 1;

  await adjustInventoryStock(
    order.inventoryItemId,
    order.destinationLocationId,
    "production_in",
    qty,
    {
      unitCost: order.unitCost,
      referenceType: "production_order",
      referenceId: productionOrderId,
      notes: `Producción ${order.productionNumber}: ${order.title}`,
    }
  );

  await updateDoc(doc(db, ORDERS_COL, productionOrderId), {
    inventoryPosted: true,
    inventoryPostedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
