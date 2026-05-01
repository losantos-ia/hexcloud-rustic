import { z } from "zod";

// ── Supplier ─────────────────────────────────────────────

const SUPPLIER_CATEGORIES = [
  "wood", "hardware", "roofing", "paint_sealer", "transport",
  "tools", "windows_doors", "general", "other",
] as const;

export const supplierSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  category: z.enum(SUPPLIER_CATEGORIES, { message: "Selecciona una categoría" }),
  notes: z.string().optional(),
});

export const updateSupplierSchema = supplierSchema.partial();

// ── Purchase Request ──────────────────────────────────────

const PURCHASE_REQUEST_SOURCE_TYPES = [
  "production_order", "inventory_low_stock", "manual", "maintenance", "other",
] as const;

const PURCHASE_REQUEST_STATUSES = [
  "draft", "pending_approval", "approved", "rejected",
  "converted_to_purchase_order", "cancelled",
] as const;

const PURCHASE_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const purchaseRequestSchema = z.object({
  sourceType: z.enum(PURCHASE_REQUEST_SOURCE_TYPES, { message: "Selecciona el origen" }),
  sourceId: z.string().optional(),
  priority: z.enum(PURCHASE_PRIORITIES, { message: "Selecciona la prioridad" }),
  neededByDate: z.string().optional(),
  destinationLocationId: z.string().min(1, "Selecciona una ubicación destino"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updatePurchaseRequestSchema = purchaseRequestSchema.partial();

export const purchaseRequestItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Selecciona un artículo"),
  itemName: z.string().min(1),
  itemType: z.string().min(1),
  quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  unit: z.string().min(1),
  estimatedUnitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ── Purchase Order ────────────────────────────────────────

const PURCHASE_ORDER_STATUSES = [
  "draft", "sent", "confirmed", "partially_received", "received", "cancelled",
] as const;

const PURCHASE_ASSIGN_TYPES = ["stock", "production_order"] as const;

export const purchaseOrderSchema = z.object({
  purchaseRequestId: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  destinationLocationId: z.string().min(1, "Selecciona una ubicación destino"),
  expectedDeliveryDate: z.string().optional(),
  discountAmount: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updatePurchaseOrderSchema = purchaseOrderSchema.partial();

export const purchaseOrderItemSchema = z.object({
  inventoryItemId: z.string().min(1, "Selecciona un artículo"),
  itemName: z.string().min(1),
  itemType: z.string().min(1),
  quantityOrdered: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  unit: z.string().min(1),
  unitCost: z.number().min(0, "El costo no puede ser negativo"),
  assignToType: z.enum(PURCHASE_ASSIGN_TYPES, { message: "Selecciona el destino" }),
  productionOrderId: z.string().optional(),
  productionOrderName: z.string().optional(),
});

export const receiveItemsSchema = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    quantityToReceive: z.number().min(0),
  })),
});

// ── Types ─────────────────────────────────────────────────

export type SupplierFormValues = z.infer<typeof supplierSchema>;
export type PurchaseRequestFormValues = z.infer<typeof purchaseRequestSchema>;
export type PurchaseRequestItemFormValues = z.infer<typeof purchaseRequestItemSchema>;
export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderItemFormValues = z.infer<typeof purchaseOrderItemSchema>;
export type ReceiveItemsFormValues = z.infer<typeof receiveItemsSchema>;
