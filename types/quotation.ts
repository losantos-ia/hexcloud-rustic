export type QuotationSource = "crm" | "store" | "direct" | "other";
export type QuotationProjectType =
  | "cabin"
  | "pergola"
  | "kiosk"
  | "deck"
  | "playground"
  | "rustic_cafe"
  | "maintenance"
  | "custom";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted_to_order";

export type QuotationItemCategory =
  | "materials"
  | "labor"
  | "transport"
  | "installation"
  | "finish"
  | "other";

export const QUOTATION_SOURCE_LABELS: Record<QuotationSource, string> = {
  crm: "CRM",
  store: "Tienda",
  direct: "Directo",
  other: "Otro",
};

export const QUOTATION_PROJECT_TYPE_LABELS: Record<QuotationProjectType, string> = {
  cabin: "Cabaña",
  pergola: "Pérgola",
  kiosk: "Kiosco",
  deck: "Deck",
  playground: "Parque infantil",
  rustic_cafe: "Café rústico",
  maintenance: "Mantenimiento",
  custom: "Proyecto personalizado",
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
  converted_to_order: "Convertida en pedido",
};

export const QUOTATION_ITEM_CATEGORY_LABELS: Record<QuotationItemCategory, string> = {
  materials: "Materiales",
  labor: "Mano de obra",
  transport: "Transporte",
  installation: "Instalación",
  finish: "Acabados",
  other: "Otro",
};

export interface Quotation {
  id: string;
  quotationNumber: string;
  leadId?: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientDocumentId?: string;
  clientAddress?: string;
  source: QuotationSource;
  projectType: QuotationProjectType;
  title: string;
  description?: string;
  status: QuotationStatus;
  validUntil?: Date;
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  depositPercentage?: number;
  depositAmount?: number;
  estimatedDeliveryDays?: number;
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: QuotationItemCategory;
  notes?: string;
}
