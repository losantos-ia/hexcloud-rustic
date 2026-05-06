import { z } from "zod";

const MAINTENANCE_PROJECT_TYPES = [
  "cabin", "pergola", "kiosk", "deck", "playground", "rustic_cafe", "custom",
] as const;

const MAINTENANCE_ASSET_STATUSES = ["active", "inactive"] as const;

const MAINTENANCE_RECORD_TYPES = ["preventive", "corrective"] as const;

const MAINTENANCE_RECORD_STATUSES = [
  "pending", "scheduled", "completed", "cancelled",
] as const;

const MAINTENANCE_NOTIFICATION_STATUSES = [
  "pending", "notified", "completed",
] as const;

// ── MaintenanceAsset ──────────────────────────────────────

export const maintenanceAssetSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(1, "El nombre del cliente es obligatorio"),
  clientPhone: z.string().min(1, "El teléfono es obligatorio"),
  projectType: z.enum(MAINTENANCE_PROJECT_TYPES, { message: "Selecciona el tipo de proyecto" }),
  productionOrderId: z.string().optional(),
  orderId: z.string().optional(),
  locationAddress: z.string().min(1, "La dirección es obligatoria"),
  googleMapsUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  installationDate: z.string().min(1, "La fecha de instalación es obligatoria"),
  maintenanceFrequencyMonths: z.number().min(1).max(60).default(6),
  status: z.enum(MAINTENANCE_ASSET_STATUSES).default("active"),
  notes: z.string().optional(),
});

export const updateMaintenanceAssetSchema = maintenanceAssetSchema.partial();

export type MaintenanceAssetFormValues = z.input<typeof maintenanceAssetSchema>;

// ── MaintenanceRecord ─────────────────────────────────────

export const maintenanceRecordSchema = z.object({
  maintenanceAssetId: z.string().min(1),
  type: z.enum(MAINTENANCE_RECORD_TYPES).default("preventive"),
  status: z.enum(MAINTENANCE_RECORD_STATUSES).default("scheduled"),
  scheduledDate: z.string().min(1, "La fecha de programación es obligatoria"),
  completedDate: z.string().optional(),
  technician: z.string().optional(),
  observations: z.string().optional(),
  tasksPerformed: z.string().optional(),
  materialsUsed: z.string().optional(),
  cost: z.number().min(0).optional(),
});

export const updateMaintenanceRecordSchema = maintenanceRecordSchema.partial();

export type MaintenanceRecordFormValues = z.input<typeof maintenanceRecordSchema>;

// ── MaintenanceNotification ───────────────────────────────

export const maintenanceNotificationSchema = z.object({
  maintenanceAssetId: z.string().min(1),
  clientName: z.string().min(1),
  clientPhone: z.string().min(1),
  nextMaintenanceDate: z.string().min(1),
  status: z.enum(MAINTENANCE_NOTIFICATION_STATUSES).default("pending"),
  messageSent: z.string().optional(),
  sentAt: z.string().optional(),
});

export type MaintenanceNotificationFormValues = z.input<typeof maintenanceNotificationSchema>;
