export type LeadTaskStatus = "pending" | "completed" | "cancelled";

export type LeadTaskType =
  | "call"
  | "whatsapp"
  | "send_photos"
  | "send_quote"
  | "follow_up"
  | "visit"
  | "other";

export interface LeadTask {
  id: string;
  leadId: string;
  title: string;
  dueDate: Date;
  status: LeadTaskStatus;
  type: LeadTaskType;
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const LEAD_TASK_TYPE_LABELS: Record<LeadTaskType, string> = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  send_photos: "Enviar fotos",
  send_quote: "Enviar cotización",
  follow_up: "Seguimiento",
  visit: "Visita",
  other: "Otro",
};

export const QUICK_TASK_SUGGESTIONS: { label: string; type: LeadTaskType }[] = [
  { label: "Llamar cliente", type: "call" },
  { label: "Enviar cotización", type: "send_quote" },
  { label: "Enviar ideas", type: "send_photos" },
  { label: "Seguimiento WhatsApp", type: "whatsapp" },
  { label: "Agendar visita", type: "visit" },
];
