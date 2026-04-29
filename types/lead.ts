export type LeadSource =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "store"
  | "referral"
  | "website"
  | "other";

export type LeadInterestedIn =
  | "cabin"
  | "pergola"
  | "kiosk"
  | "deck"
  | "playground"
  | "rustic_cafe"
  | "maintenance"
  | "custom"
  | "unknown";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "waiting_measurements"
  | "quotation_pending"
  | "quotation_sent"
  | "follow_up"
  | "negotiation"
  | "deposit_pending"
  | "won"
  | "lost"
  | "archived";

export type LeadPriority = "low" | "medium" | "high";

export type LeadActivityType =
  | "call"
  | "whatsapp"
  | "instagram_message"
  | "facebook_message"
  | "note"
  | "status_change"
  | "meeting"
  | "quotation_sent"
  | "follow_up";

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  source: LeadSource;
  interestedIn: LeadInterestedIn;
  status: LeadStatus;
  priority: LeadPriority;
  department?: string;
  city?: string;
  budgetRange?: string;
  expectedPurchaseDate?: Date;
  assignedTo?: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: Date;
  lossReason?: string;
  convertedClientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  title: string;
  description?: string;
  createdAt: Date;
  createdBy?: string;
}

// ── Labels ────────────────────────────────────────────────

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  store: "Tienda",
  referral: "Referido",
  website: "Página web",
  other: "Otro",
};

export const LEAD_INTERESTED_IN_LABELS: Record<LeadInterestedIn, string> = {
  cabin: "Cabaña",
  pergola: "Pérgola",
  kiosk: "Kiosko",
  deck: "Deck",
  playground: "Parque infantil",
  rustic_cafe: "Café rústico",
  maintenance: "Mantenimiento",
  custom: "Proyecto personalizado",
  unknown: "Por definir",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  waiting_measurements: "Esperando medidas",
  quotation_pending: "Cotización pendiente",
  quotation_sent: "Cotización enviada",
  follow_up: "Seguimiento",
  negotiation: "Negociación",
  deposit_pending: "Depósito pendiente",
  won: "Ganado",
  lost: "Perdido",
  archived: "Archivado",
};

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const LEAD_ACTIVITY_TYPE_LABELS: Record<LeadActivityType, string> = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  instagram_message: "Mensaje Instagram",
  facebook_message: "Mensaje Facebook",
  note: "Nota",
  status_change: "Cambio de estado",
  meeting: "Reunión",
  quotation_sent: "Cotización enviada",
  follow_up: "Seguimiento",
};

// Active statuses (exclude won/lost/archived from default list)
export const ACTIVE_LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "waiting_measurements",
  "quotation_pending",
  "quotation_sent",
  "follow_up",
  "negotiation",
  "deposit_pending",
];
