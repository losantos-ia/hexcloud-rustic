import { z } from "zod";

const ORDER_SOURCES = ["quotation", "store", "direct", "crm", "other"] as const;
const ORDER_PROJECT_TYPES = ["cabin", "pergola", "deck", "kiosk", "playground", "maintenance", "standard_product", "custom"] as const;
const ORDER_STATUSES = ["deposit_pending", "confirmed", "sent_to_workshop", "in_production", "ready_for_delivery", "delivered", "installed", "paid", "closed", "cancelled"] as const;
const ORDER_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const ORDER_ITEM_CATEGORIES = ["product", "material", "labor", "transport", "installation", "finish", "other"] as const;
const ORDER_PAYMENT_TYPES = ["deposit", "partial", "final"] as const;
const ORDER_PAYMENT_METHODS = ["cash", "bank_transfer", "card", "other"] as const;

export const orderItemSchema = z.object({
  sku: z.string().optional(),
  inventoryItemId: z.string().optional(),
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.number().positive("Debe ser mayor a 0"),
  unit: z.string().min(1),
  unitPrice: z.number().min(0, "No puede ser negativo"),
  category: z.enum(ORDER_ITEM_CATEGORIES),
  notes: z.string().optional(),
});

export const orderSchema = z.object({
  clientName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  clientPhone: z.string().min(7, "Ingresa un teléfono válido"),
  quotationId: z.string().optional(),
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  clientDocumentId: z.string().optional(),
  clientAddress: z.string().optional(),
  clientCity: z.string().optional(),
  clientDepartment: z.string().optional(),
  source: z.enum(ORDER_SOURCES),
  storeId: z.string().optional(),
  projectType: z.enum(ORDER_PROJECT_TYPES),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(ORDER_STATUSES),
  priority: z.enum(ORDER_PRIORITIES),
  finalSalePrice: z.number().min(0, "Debe ser mayor o igual a 0"),
  depositRequired: z.number().min(0),
  depositPaid: z.number().min(0),
  promisedDeliveryDate: z.string().optional(),
  installationRequired: z.boolean(),
  deliveryAddress: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Agrega al menos un ítem"),
});

export const updateOrderSchema = orderSchema.partial().extend({
  status: z.enum(ORDER_STATUSES).optional(),
  items: z.array(orderItemSchema).min(1).optional(),
});

export const orderPaymentSchema = z.object({
  type: z.enum(ORDER_PAYMENT_TYPES),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  method: z.enum(ORDER_PAYMENT_METHODS),
  paymentDate: z.string().min(1, "La fecha es obligatoria"),
  notes: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
export type UpdateOrderFormValues = z.infer<typeof updateOrderSchema>;
export type OrderItemFormValues = z.infer<typeof orderItemSchema>;
export type OrderPaymentFormValues = z.infer<typeof orderPaymentSchema>;
