import { z } from "zod";

const PRODUCTION_PROJECT_TYPES = [
  "cabin", "pergola", "deck", "kiosk", "playground", "maintenance", "standard_product", "custom",
] as const;

const PRODUCTION_STATUSES = [
  "pending", "design_measurements", "materials", "in_production",
  "quality_control", "ready_for_delivery", "installed",
  "closed", "cancelled",
] as const;

const PRODUCTION_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const TASK_STATUSES = ["pending", "in_progress", "completed", "blocked"] as const;

const productionOrderBaseSchema = z.object({
  productionType: z.enum(["order_based", "stock"] as const),
  orderId: z.string().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  inventoryItemId: z.string().optional(),
  quantityToProduce: z.number().min(0.01).optional(),
  destinationLocationId: z.string().optional(),
  unitCost: z.number().min(0).optional(),
  totalProductionCost: z.number().min(0).optional(),
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

export const productionOrderSchema = productionOrderBaseSchema.superRefine((val, ctx) => {
  if (val.productionType === "order_based") {
    if (!val.clientName || val.clientName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre del cliente es obligatorio",
        path: ["clientName"],
      });
    }
  }
  if (val.productionType === "stock") {
    if (!val.inventoryItemId || val.inventoryItemId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un artículo del catálogo",
        path: ["inventoryItemId"],
      });
    }
    if (!val.quantityToProduce || val.quantityToProduce <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad debe ser mayor a 0",
        path: ["quantityToProduce"],
      });
    }
    if (!val.destinationLocationId || val.destinationLocationId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona la ubicación de destino",
        path: ["destinationLocationId"],
      });
    }
  }
});

export const updateProductionOrderSchema = productionOrderBaseSchema.partial();


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
