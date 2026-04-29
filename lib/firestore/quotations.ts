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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Quotation, QuotationItem, QuotationStatus } from "@/types/quotation";
import type { QuotationItemFormValues } from "@/lib/schemas/quotation";

const QUOTATIONS_COL = "quotations";
const ITEMS_COL = "quotationItems";

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
function docToQuotation(id: string, data: Record<string, any>): Quotation {
  return {
    id,
    quotationNumber: data.quotationNumber,
    leadId: data.leadId ?? undefined,
    clientId: data.clientId ?? undefined,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    source: data.source,
    projectType: data.projectType,
    title: data.title,
    description: data.description ?? undefined,
    status: data.status,
    validUntil: toDate(data.validUntil),
    subtotal: data.subtotal ?? 0,
    discountAmount: data.discountAmount ?? 0,
    taxPercent: data.taxPercent ?? 0,
    taxAmount: data.taxAmount ?? 0,
    total: data.total ?? 0,
    depositPercentage: data.depositPercentage ?? undefined,
    depositAmount: data.depositAmount ?? undefined,
    estimatedDeliveryDays: data.estimatedDeliveryDays ?? undefined,
    notes: data.notes ?? undefined,
    internalNotes: data.internalNotes ?? undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function docToItem(id: string, data: Record<string, any>): QuotationItem {
  return {
    id,
    quotationId: data.quotationId,
    description: data.description,
    quantity: data.quantity,
    unit: data.unit,
    unitPrice: data.unitPrice,
    total: data.total,
    category: data.category,
    notes: data.notes ?? undefined,
  };
}

// ── Quotation number generation ─────────────────────────

export async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const snap = await getDocs(collection(db, QUOTATIONS_COL));
  const thisYearCount = snap.docs.filter((d) => {
    const num: string = d.data().quotationNumber ?? "";
    return num.startsWith(`C${year}`);
  }).length;
  const next = String(thisYearCount + 1).padStart(4, "0");
  return `C${year}${next}`;
}

// ── Quotation CRUD ──────────────────────────────────────

export interface CreateQuotationPayload {
  clientName: string;
  clientPhone: string;
  leadId?: string;
  clientId?: string;
  source: Quotation["source"];
  projectType: Quotation["projectType"];
  title: string;
  description?: string;
  status: QuotationStatus;
  validUntil?: Date;
  subtotal: number;
  discountAmount: number;
  taxPercent?: number;
  taxAmount: number;
  total: number;
  depositPercentage?: number;
  depositAmount?: number;
  estimatedDeliveryDays?: number;
  notes?: string;
  internalNotes?: string;
  items: QuotationItemFormValues[];
}

export async function createQuotation(payload: CreateQuotationPayload): Promise<string> {
  const quotationNumber = await generateQuotationNumber();
  const { items, ...quotationData } = payload;

  const quotationRef = await addDoc(collection(db, QUOTATIONS_COL), {
    ...stripUndefined(quotationData),
    quotationNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const batch = writeBatch(db);
  for (const item of items) {
    const itemRef = doc(collection(db, ITEMS_COL));
    batch.set(itemRef, {
      ...stripUndefined(item),
      quotationId: quotationRef.id,
      total: item.quantity * item.unitPrice,
    });
  }
  await batch.commit();

  return quotationRef.id;
}

export async function updateQuotation(
  id: string,
  data: Partial<Omit<Quotation, "id" | "quotationNumber" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, QUOTATIONS_COL, id), {
    ...stripUndefined(data as object),
    updatedAt: serverTimestamp(),
  });
}

export async function getQuotationById(id: string): Promise<Quotation | null> {
  const snap = await getDoc(doc(db, QUOTATIONS_COL, id));
  if (!snap.exists()) return null;
  return docToQuotation(snap.id, snap.data());
}

export async function listQuotations(): Promise<Quotation[]> {
  const snap = await getDocs(collection(db, QUOTATIONS_COL));
  return snap.docs
    .map((d) => docToQuotation(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listQuotationsByStatus(status: QuotationStatus): Promise<Quotation[]> {
  const q = query(collection(db, QUOTATIONS_COL), where("status", "==", status));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => docToQuotation(d.id, d.data()))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ── Quotation items ─────────────────────────────────────

export async function listQuotationItems(quotationId: string): Promise<QuotationItem[]> {
  const q = query(collection(db, ITEMS_COL), where("quotationId", "==", quotationId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToItem(d.id, d.data()));
}

export async function addQuotationItem(
  quotationId: string,
  item: QuotationItemFormValues
): Promise<string> {
  const ref = await addDoc(collection(db, ITEMS_COL), {
    ...stripUndefined(item),
    quotationId,
    total: item.quantity * item.unitPrice,
  });
  return ref.id;
}

export async function updateQuotationItem(
  itemId: string,
  item: Partial<QuotationItemFormValues>
): Promise<void> {
  const updates: Record<string, unknown> = { ...stripUndefined(item as object) };
  if (item.quantity !== undefined && item.unitPrice !== undefined) {
    updates.total = item.quantity * item.unitPrice;
  }
  await updateDoc(doc(db, ITEMS_COL, itemId), updates);
}

export async function deleteQuotationItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, ITEMS_COL, itemId));
}

// ── Recalculate totals ──────────────────────────────────

export async function recalculateQuotationTotals(
  quotationId: string,
  discountAmount: number,
  taxAmount: number,
  depositPercentage?: number
): Promise<void> {
  const items = await listQuotationItems(quotationId);
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = subtotal - discountAmount + taxAmount;
  const depositAmount = depositPercentage ? (total * depositPercentage) / 100 : undefined;
  await updateQuotation(quotationId, {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    depositPercentage,
    depositAmount,
  });
}
