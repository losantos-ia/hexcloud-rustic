export type ClientType = "individual" | "company";

export type ClientSource =
  | "store"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "referral"
  | "other";

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  documentId?: string;
  clientType: ClientType;
  source: ClientSource;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientAddress {
  id: string;
  label: string;
  department: string;
  city: string;
  neighborhood?: string;
  fullAddress: string;
  googleMapsUrl?: string;
  isPrimary: boolean;
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: "Persona natural",
  company: "Empresa",
};

export const CLIENT_SOURCE_LABELS: Record<ClientSource, string> = {
  store: "Tienda",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  referral: "Referido",
  other: "Otro",
};
