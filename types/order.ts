export type OrderSource = "quotation" | "store" | "direct" | "crm" | "other";

export type OrderProjectType =
  | "cabin"
  | "pergola"
  | "kiosk"
  | "deck"
  | "playground"
  | "rustic_cafe"
  | "maintenance"
  | "custom";

export type OrderStatus =
  | "deposit_pending"
  | "confirmed"
  | "sent_to_workshop"
  | "in_production"
  | "ready_for_delivery"
  | "delivered"
  | "installed"
  | "paid"
  | "closed"
  | "cancelled";

export type OrderPriority = "low" | "medium" | "high" | "urgent";

export type OrderItemCategory =
  | "product"
  | "material"
  | "labor"
  | "transport"
  | "installation"
  | "finish"
  | "other";

export type OrderPaymentType = "deposit" | "partial" | "final";

export type OrderPaymentMethod = "cash" | "bank_transfer" | "card" | "other";

// ── Labels ──────────────────────────────────────────────

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  quotation: "Cotización",
  store: "Tienda",
  direct: "Directo",
  crm: "CRM",
  other: "Otro",
};

export const ORDER_PROJECT_TYPE_LABELS: Record<OrderProjectType, string> = {
  cabin: "Cabaña",
  pergola: "Pérgola",
  kiosk: "Kiosco",
  deck: "Deck",
  playground: "Parque infantil",
  rustic_cafe: "Café rústico",
  maintenance: "Mantenimiento",
  custom: "Proyecto personalizado",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  deposit_pending: "Anticipo pendiente",
  confirmed: "Confirmado",
  sent_to_workshop: "Enviado al taller",
  in_production: "En producción",
  ready_for_delivery: "Listo para entrega",
  delivered: "Entregado",
  installed: "Instalado",
  paid: "Pagado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const ORDER_ITEM_CATEGORY_LABELS: Record<OrderItemCategory, string> = {
  product: "Producto",
  material: "Material",
  labor: "Mano de obra",
  transport: "Transporte",
  installation: "Instalación",
  finish: "Acabados",
  other: "Otro",
};

export const ORDER_PAYMENT_TYPE_LABELS: Record<OrderPaymentType, string> = {
  deposit: "Anticipo",
  partial: "Pago parcial",
  final: "Pago final",
};

export const ORDER_PAYMENT_METHOD_LABELS: Record<OrderPaymentMethod, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "deposit_pending",
  "confirmed",
  "sent_to_workshop",
  "in_production",
  "ready_for_delivery",
  "delivered",
  "installed",
];

// ── Interfaces ──────────────────────────────────────────

export interface Order {
  id: string;
  orderNumber: string;
  quotationId?: string;
  leadId?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  source: OrderSource;
  storeId?: string;
  projectType: OrderProjectType;
  title: string;
  description?: string;
  status: OrderStatus;
  priority: OrderPriority;
  finalSalePrice: number;
  depositRequired: number;
  depositPaid: number;
  balanceDue: number;
  promisedDeliveryDate?: Date;
  installationRequired: boolean;
  deliveryAddress?: string;
  googleMapsUrl?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: OrderItemCategory;
  notes?: string;
}

export interface OrderPayment {
  id: string;
  orderId: string;
  type: OrderPaymentType;
  amount: number;
  method: OrderPaymentMethod;
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
}
