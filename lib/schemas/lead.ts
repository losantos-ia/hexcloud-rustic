import { z } from "zod";

const SOURCES = ["whatsapp", "instagram", "facebook", "tiktok", "store", "referral", "website", "other"] as const;
const INTERESTED_IN = ["cabin", "pergola", "kiosk", "deck", "playground", "rustic_cafe", "maintenance", "custom", "unknown"] as const;
const STATUSES = ["new", "contacted", "qualified", "waiting_measurements", "quotation_pending", "quotation_sent", "follow_up", "negotiation", "deposit_pending", "won", "lost", "archived"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;
const ACTIVITY_TYPES = ["call", "whatsapp", "instagram_message", "facebook_message", "note", "status_change", "meeting", "quotation_sent", "follow_up"] as const;

export const leadSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(7, "Ingresa un teléfono válido"),
  secondaryPhone: z.string().optional(),
  email: z.string().optional(),
  source: z.enum(SOURCES),
  interestedIn: z.enum(INTERESTED_IN),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  department: z.string().optional(),
  city: z.string().optional(),
  budgetRange: z.string().optional(),
  expectedPurchaseDate: z.string().optional(), // ISO string in form, converted to Date in handler
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(), // ISO string in form
  lossReason: z.string().optional(),
});

export const updateLeadSchema = leadSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
});

export const leadActivitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
export type UpdateLeadFormValues = z.infer<typeof updateLeadSchema>;
export type LeadActivityFormValues = z.infer<typeof leadActivitySchema>;
