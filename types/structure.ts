export type StructureType =
  | "cabin"
  | "pergola"
  | "kiosk"
  | "deck"
  | "playground"
  | "rustic_cafe"
  | "custom";

export type StructureStatus = "active" | "pending_delivery" | "archived";

export interface StructureAsset {
  id: string;
  clientId: string;
  type: StructureType;
  name: string;
  model?: string;
  locationAddressId?: string;
  deliveryDate?: Date;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  maintenanceFrequencyMonths: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  status: StructureStatus;
  notes?: string;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  cabin: "Cabaña",
  pergola: "Pérgola",
  kiosk: "Kiosco",
  deck: "Deck",
  playground: "Parque infantil",
  rustic_cafe: "Cafetería rústica",
  custom: "Personalizada",
};

export const STRUCTURE_STATUS_LABELS: Record<StructureStatus, string> = {
  active: "Activa",
  pending_delivery: "Pendiente entrega",
  archived: "Archivada",
};
