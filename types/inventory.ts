// ── Enums ────────────────────────────────────────────────

export type InventoryCategory =
  | "wood"
  | "hardware"
  | "roofing"
  | "paint_sealer"
  | "consumable"
  | "tool"
  | "finished_product"
  | "other";

export type InventoryItemType =
  | "material"
  | "consumable"
  | "tool"
  | "finished_product";

export type InventoryUnit =
  | "unit"
  | "ft"
  | "m"
  | "board"
  | "gallon"
  | "liter"
  | "kg"
  | "box"
  | "roll"
  | "sheet"
  | "pack"
  | "other";

export type InventoryLocationType =
  | "workshop"
  | "store"
  | "warehouse"
  | "vehicle"
  | "other";

export type InventoryMovementType =
  | "purchase_in"
  | "production_out"
  | "transfer_in"
  | "transfer_out"
  | "adjustment_in"
  | "adjustment_out"
  | "sale_out"
  | "return_in";

export type InventoryReferenceType =
  | "purchase"
  | "production_order"
  | "order"
  | "transfer"
  | "manual_adjustment";

export type StockStatus = "ok" | "bajo_minimo" | "sin_stock";

// ── Labels ───────────────────────────────────────────────

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  wood: "Madera",
  hardware: "Herrajes",
  roofing: "Techado",
  paint_sealer: "Pintura / sellador",
  consumable: "Consumible",
  tool: "Herramienta",
  finished_product: "Producto terminado",
  other: "Otro",
};

export const INVENTORY_ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
  material: "Material",
  consumable: "Consumible",
  tool: "Herramienta",
  finished_product: "Producto terminado",
};

export const INVENTORY_UNIT_LABELS: Record<InventoryUnit, string> = {
  unit: "Unidad",
  ft: "Pie (ft)",
  m: "Metro (m)",
  board: "Tabla",
  gallon: "Galón",
  liter: "Litro",
  kg: "Kilogramo (kg)",
  box: "Caja",
  roll: "Rollo",
  sheet: "Lámina",
  pack: "Paquete",
  other: "Otro",
};

export const INVENTORY_LOCATION_TYPE_LABELS: Record<InventoryLocationType, string> = {
  workshop: "Taller",
  store: "Tienda",
  warehouse: "Bodega",
  vehicle: "Vehículo",
  other: "Otro",
};

export const INVENTORY_MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  purchase_in: "Compra (entrada)",
  production_out: "Uso en producción",
  transfer_in: "Transferencia (entrada)",
  transfer_out: "Transferencia (salida)",
  adjustment_in: "Ajuste (entrada)",
  adjustment_out: "Ajuste (salida)",
  sale_out: "Venta (salida)",
  return_in: "Devolución (entrada)",
};

// ── Interfaces ───────────────────────────────────────────

export interface InventoryItem {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  itemType: InventoryItemType;
  unit: InventoryUnit;
  currentStock: number;
  minimumStock: number;
  averageCost: number;
  lastPurchaseCost?: number;
  salePrice?: number;
  locationId: string;
  supplierId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryLocation {
  id: string;
  name: string;
  type: InventoryLocationType;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  locationId: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  referenceType?: InventoryReferenceType;
  referenceId?: string;
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

// ── Helpers ──────────────────────────────────────────────

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.currentStock <= 0) return "sin_stock";
  if (item.currentStock <= item.minimumStock) return "bajo_minimo";
  return "ok";
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  ok: "OK",
  bajo_minimo: "Bajo mínimo",
  sin_stock: "Sin stock",
};

/** IN movement types (positive stock change) */
export const IN_MOVEMENT_TYPES: InventoryMovementType[] = [
  "purchase_in", "transfer_in", "adjustment_in", "return_in",
];

/** OUT movement types (negative stock change) */
export const OUT_MOVEMENT_TYPES: InventoryMovementType[] = [
  "production_out", "transfer_out", "adjustment_out", "sale_out",
];
