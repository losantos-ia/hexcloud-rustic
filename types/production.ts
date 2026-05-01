export type ProductionProjectType =
  | "cabin"
  | "pergola"
  | "kiosk"
  | "deck"
  | "playground"
  | "rustic_cafe"
  | "maintenance"
  | "custom";

export type ProductionType = "order_based" | "stock";

export type ProductionStatus =
  | "pending"
  | "design_measurements"
  | "materials_pending"
  | "materials_ready"
  | "cutting"
  | "assembly"
  | "sanding"
  | "painting_sealing"
  | "roofing_details"
  | "quality_control"
  | "ready_for_delivery"
  | "delivered_to_store"
  | "installed"
  | "closed"
  | "cancelled";

export type ProductionPriority = "low" | "medium" | "high" | "urgent";

export type ProductionTaskStatus = "pending" | "in_progress" | "completed" | "blocked";

// ── Labels ──────────────────────────────────────────────

export const PRODUCTION_PROJECT_TYPE_LABELS: Record<ProductionProjectType, string> = {
  cabin: "Cabaña",
  pergola: "Pérgola",
  kiosk: "Kiosco",
  deck: "Deck",
  playground: "Parque infantil",
  rustic_cafe: "Café rústico",
  maintenance: "Mantenimiento",
  custom: "Proyecto personalizado",
};

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  pending: "Pendiente",
  design_measurements: "Diseño / medidas",
  materials_pending: "Materiales pendientes",
  materials_ready: "Materiales listos",
  cutting: "Corte",
  assembly: "Ensamblaje",
  sanding: "Lijado",
  painting_sealing: "Pintura / sellador",
  roofing_details: "Techo / detalles",
  quality_control: "Control calidad",
  ready_for_delivery: "Listo para entrega",
  delivered_to_store: "Entregado a tienda",
  installed: "Instalado",
  closed: "Cerrado",
  cancelled: "Cancelado",
};

export const PRODUCTION_PRIORITY_LABELS: Record<ProductionPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const PRODUCTION_TASK_STATUS_LABELS: Record<ProductionTaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  blocked: "Bloqueada",
};

export const PRODUCTION_TYPE_LABELS: Record<ProductionType, string> = {
  order_based: "Pedido de cliente",
  stock: "Para stock",
};

export const ACTIVE_PRODUCTION_STATUSES: ProductionStatus[] = [
  "pending",
  "design_measurements",
  "materials_pending",
  "materials_ready",
  "cutting",
  "assembly",
  "sanding",
  "painting_sealing",
  "roofing_details",
  "quality_control",
  "ready_for_delivery",
  "delivered_to_store",
  "installed",
];

export const TERMINAL_PRODUCTION_STATUSES: ProductionStatus[] = [
  "closed",
  "cancelled",
  "installed",
];

// ── Kanban columns ────────────────────────────────────────

export const KANBAN_COLUMNS: { status: ProductionStatus; label: string }[] = [
  { status: "pending", label: "Pendiente" },
  { status: "design_measurements", label: "Diseño / medidas" },
  { status: "materials_pending", label: "Materiales" },
  { status: "cutting", label: "Corte" },
  { status: "assembly", label: "Ensamblaje" },
  { status: "sanding", label: "Lijado" },
  { status: "painting_sealing", label: "Pintura / sellador" },
  { status: "roofing_details", label: "Techo / detalles" },
  { status: "quality_control", label: "Control calidad" },
  { status: "ready_for_delivery", label: "Listo entrega" },
  { status: "installed", label: "Instalado" },
  { status: "closed", label: "Cerrado" },
];

// ── Interfaces ──────────────────────────────────────────

export interface ProductionOrder {
  id: string;
  productionNumber: string;
  productionType: ProductionType;
  orderId?: string;
  clientName?: string;
  clientPhone?: string;
  /** stock production: inventory item to produce */
  inventoryItemId?: string;
  /** stock production: quantity to produce */
  quantityToProduce?: number;
  /** stock production: destination location */
  destinationLocationId?: string;
  /** stock production: cost per unit */
  unitCost?: number;
  /** stock production: total production cost */
  totalProductionCost?: number;
  /** whether finished goods have been posted to inventory */
  inventoryPosted?: boolean;
  inventoryPostedAt?: Date;
  projectType: ProductionProjectType;
  title: string;
  description?: string;
  status: ProductionStatus;
  priority: ProductionPriority;
  workshopInternalPrice?: number;
  estimatedMaterialCost?: number;
  estimatedLaborHours?: number;
  actualLaborHours?: number;
  plannedStartDate?: Date;
  promisedDeliveryDate?: Date;
  actualFinishDate?: Date;
  assignedTeam?: string;
  responsiblePerson?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionTask {
  id: string;
  productionOrderId: string;
  title: string;
  description?: string;
  status: ProductionTaskStatus;
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionPhoto {
  id: string;
  productionOrderId: string;
  url: string;
  label?: string;
  phase?: string;
  uploadedAt: Date;
  uploadedBy?: string;
}
