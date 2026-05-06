// ── Maintenance Asset ─────────────────────────────────────

export type MaintenanceProjectType =
  | "cabin"
  | "pergola"
  | "kiosk"
  | "deck"
  | "playground"
  | "rustic_cafe"
  | "custom";

export type MaintenanceAssetStatus = "active" | "inactive";

export type MaintenanceAssetCreatedSource = "manual" | "automatic";

export type MaintenanceRecordType = "preventive" | "corrective";

export type MaintenanceRecordStatus =
  | "pending"
  | "scheduled"
  | "completed"
  | "cancelled";

export type MaintenanceNotificationStatus = "pending" | "notified" | "completed";

// ── Labels ────────────────────────────────────────────────

export const MAINTENANCE_PROJECT_TYPE_LABELS: Record<MaintenanceProjectType, string> = {
  cabin: "Cabaña",
  pergola: "Pérgola",
  kiosk: "Kiosco",
  deck: "Deck",
  playground: "Juego infantil",
  rustic_cafe: "Café rústico",
  custom: "Proyecto personalizado",
};

export const MAINTENANCE_ASSET_STATUS_LABELS: Record<MaintenanceAssetStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
};

export const MAINTENANCE_ASSET_SOURCE_LABELS: Record<MaintenanceAssetCreatedSource, string> = {
  manual: "Manual",
  automatic: "Auto · Producción",
};

export const MAINTENANCE_RECORD_TYPE_LABELS: Record<MaintenanceRecordType, string> = {
  preventive: "Preventivo",
  corrective: "Correctivo",
};

export const MAINTENANCE_RECORD_STATUS_LABELS: Record<MaintenanceRecordStatus, string> = {
  pending: "Pendiente",
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
};

export const MAINTENANCE_NOTIFICATION_STATUS_LABELS: Record<MaintenanceNotificationStatus, string> = {
  pending: "Pendiente",
  notified: "Notificado",
  completed: "Completado",
};

// ── Interfaces ────────────────────────────────────────────

export interface MaintenanceAsset {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  projectType: MaintenanceProjectType;
  productionOrderId?: string;
  orderId?: string;
  locationAddress: string;
  googleMapsUrl?: string;
  installationDate: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate: Date;
  maintenanceFrequencyMonths: number;
  status: MaintenanceAssetStatus;
  createdSource: MaintenanceAssetCreatedSource;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRecord {
  id: string;
  maintenanceAssetId: string;
  type: MaintenanceRecordType;
  status: MaintenanceRecordStatus;
  scheduledDate: Date;
  completedDate?: Date;
  technician?: string;
  observations?: string;
  tasksPerformed?: string;
  materialsUsed?: string;
  photos?: string[];
  cost?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceNotification {
  id: string;
  maintenanceAssetId: string;
  clientName: string;
  clientPhone: string;
  nextMaintenanceDate: Date;
  status: MaintenanceNotificationStatus;
  messageSent?: string;
  sentAt?: Date;
  createdAt: Date;
}
