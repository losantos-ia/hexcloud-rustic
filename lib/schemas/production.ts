import { z } from "zod";

const PRODUCTION_PROJECT_TYPES = [
  "cabin", "pergola", "kiosk", "deck", "playground", "rustic_cafe", "maintenance", "custom",
] as const;

const PRODUCTION_STATUSES = [
  "pending", "design_measurements", "materials_pending", "materials_ready",
  "cutting", "assembly", "sanding", "painting_sealing", "roofing_details",
  "quality_control", "ready_for_delivery", "delivered_to_store", "installed",
  "closed", "cancelled",
] as const;

const PRODUCTION_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const TASK_STATUSES = ["pending", "in_progress", "completed", "blocked"] as const;

export const productionOrderSchema = z.object({
  orderId: z.string().optional(),
  clientName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  clientPhone: z.string().optional(),
  projectType: z.enum(PRODUCTION_PROJECT_TYPES),
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  status: z.enum(PRODUCTION_STATUSES),
  priority: z.enum(PRODUCTION_PRIORITIES),
  workshopInternalPrice: z.number().min(0).optional(),
  estimatedMaterialCost: z.number().min(0).optional(),
  estimatedLaborHours: z.number().min(0).optional(),
  actualLaborHours: z.number().min(0).optional(),
  plannedStartDate: z.string().optional(),
  promisedDeliveryDate: z.string().optional(),
  actualFinishDate: z.string().optional(),
  assignedTeam: z.string().optional(),
  responsiblePerson: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updateProductionOrderSchema = productionOrderSchema.partial();

export const productionTaskSchema = z.object({
  title: z.string().min(2, "El título es obligatorio"),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  assignedTo: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  dueDate: z.string().optional(),
});

export const productionPhotoSchema = z.object({
  url: z.string().url("URL inválida"),
  label: z.string().optional(),
  phase: z.string().optional(),
  uploadedBy: z.string().optional(),
});

export type ProductionOrderFormValues = z.infer<typeof productionOrderSchema>;
export type UpdateProductionOrderFormValues = z.infer<typeof updateProductionOrderSchema>;
export type ProductionTaskFormValues = z.infer<typeof productionTaskSchema>;
export type ProductionPhotoFormValues = z.infer<typeof productionPhotoSchema>;
