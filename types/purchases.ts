// ── Supplier ─────────────────────────────────────────────

export type SupplierCategory =
  | "wood"
  | "hardware"
  | "roofing"
  | "paint_sealer"
  | "transport"
  | "tools"
  | "windows_doors"
  | "general"
  | "other";

export const SUPPLIER_CATEGORY_LABELS: Record<SupplierCategory, string> = {
  wood: "Madera",
  hardware: "Herrajes",
  roofing: "Techado",
  paint_sealer: "Pintura / sellador",
  transport: "Transporte",
  tools: "Herramientas",
  windows_doors: "Ventanas / puertas",
  general: "General",
  other: "Otro",
};

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: SupplierCategory;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Purchase Request ──────────────────────────────────────

export type PurchaseRequestSourceType =
  | "production_order"
  | "inventory_low_stock"
  | "manual"
  | "maintenance"
  | "other";

export type PurchaseRequestStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "converted_to_purchase_order"
  | "cancelled";

export type PurchasePriority = "low" | "medium" | "high" | "urgent";

export const PURCHASE_REQUEST_SOURCE_LABELS: Record<PurchaseRequestSourceType, string> = {
  production_order: "Orden de producción",
  inventory_low_stock: "Stock bajo mínimo",
  manual: "Manual",
  maintenance: "Mantenimiento",
  other: "Otro",
};

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente aprobación",
  approved: "Aprobada",
  rejected: "Rechazada",
  converted_to_purchase_order: "Convertida a OC",
  cancelled: "Cancelada",
};

export const PURCHASE_PRIORITY_LABELS: Record<PurchasePriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  sourceType: PurchaseRequestSourceType;
  sourceId?: string;
  status: PurchaseRequestStatus;
  priority: PurchasePriority;
  neededByDate?: Date;
  destinationLocationId: string;
  destinationLocationName?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseRequestItem {
  id: string;
  purchaseRequestId: string;
  inventoryItemId: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  estimatedUnitCost?: number;
  estimatedTotalCost?: number;
  notes?: string;
}

// ── Purchase Order ────────────────────────────────────────

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "confirmed"
  | "partially_received"
  | "received"
  | "cancelled";

export type PurchasePaymentStatus = "unpaid" | "partial" | "paid";

export type PurchaseAssignType = "stock" | "production_order";

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  confirmed: "Confirmada",
  partially_received: "Recepción parcial",
  received: "Recibida",
  cancelled: "Cancelada",
};

export const PURCHASE_PAYMENT_STATUS_LABELS: Record<PurchasePaymentStatus, string> = {
  unpaid: "Sin pagar",
  partial: "Pago parcial",
  paid: "Pagada",
};

export const PURCHASE_ASSIGN_TYPE_LABELS: Record<PurchaseAssignType, string> = {
  stock: "Inventario general",
  production_order: "Proyecto específico",
};

export interface PurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  purchaseRequestId?: string;
  supplierId?: string;
  supplierName?: string;
  status: PurchaseOrderStatus;
  destinationLocationId: string;
  destinationLocationName?: string;
  expectedDeliveryDate?: Date;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: PurchasePaymentStatus;
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  itemName: string;
  itemType: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  assignToType: PurchaseAssignType;
  productionOrderId?: string;
  productionOrderName?: string;
}

export interface PurchasePayment {
  id: string;
  purchaseOrderId: string;
  amount: number;
  paymentDate: Date;
  method?: string;
  reference?: string;
  notes?: string;
  createdAt: Date;
}
