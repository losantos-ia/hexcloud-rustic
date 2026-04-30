import { z } from "zod";

const SOURCES = ["crm", "store", "direct", "other"] as const;
const PROJECT_TYPES = ["cabin", "pergola", "kiosk", "deck", "playground", "rustic_cafe", "maintenance", "custom"] as const;
const STATUSES = ["draft", "sent", "accepted", "rejected", "expired", "converted_to_order"] as const;
const ITEM_CATEGORIES = ["materials", "labor", "transport", "installation", "finish", "other"] as const;

export const quotationItemSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.number().positive("Debe ser mayor a 0"),
  unit: z.string().min(1, "La unidad es obligatoria"),
  unitPrice: z.number().min(0, "No puede ser negativo"),
  category: z.enum(ITEM_CATEGORIES),
  notes: z.string().optional(),
});

export const quotationSchema = z.object({
  clientName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  clientPhone: z.string().min(7, "Ingresa un teléfono válido"),
  clientDocumentId: z.string().optional(),
  clientAddress: z.string().optional(),
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  source: z.enum(SOURCES),
  projectType: z.enum(PROJECT_TYPES),
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  status: z.enum(STATUSES),
  validUntil: z.string().optional(),
  discountAmount: z.number().min(0).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  depositPercentage: z.number().min(0).max(100).optional(),
  estimatedDeliveryDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, "Agrega al menos un ítem"),
});

export const updateQuotationSchema = quotationSchema.partial().extend({
  status: z.enum(STATUSES).optional(),
  items: z.array(quotationItemSchema).min(1, "Agrega al menos un ítem").optional(),
});

export type QuotationFormValues = z.infer<typeof quotationSchema>;
export type UpdateQuotationFormValues = z.infer<typeof updateQuotationSchema>;
export type QuotationItemFormValues = z.infer<typeof quotationItemSchema>;
