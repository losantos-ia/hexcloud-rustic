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
  gallon: "Gal\u00f3n",
  liter: "Litro",
  kg: "Kilogramo (kg)",
  box: "Caja",
  roll: "Rollo",
  sheet: "L\u00e1mina",
  pack: "Paquete",
  other: "Otro",
};

export const INVENTORY_LOCATION_TYPE_LABELS: Record<InventoryLocationType, string> = {
  workshop: "Taller",
  store: "Tienda",
  warehouse: "Bodega",
  vehicle: "Veh\u00edculo",
  other: "Otro",
};

export const INVENTORY_MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  purchase_in: "Compra (entrada)",
  production_out: "Uso en producci\u00f3n",
  transfer_in: "Transferencia (entrada)",
  transfer_out: "Transferencia (salida)",
  adjustment_in: "Ajuste (entrada)",
  adjustment_out: "Ajuste (salida)",
  sale_out: "Venta (salida)",
  return_in: "Devoluci\u00f3n (entrada)",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  ok: "OK",
  bajo_minimo: "Bajo m\u00ednimo",
  sin_stock: "Sin stock",
};

// ── Interfaces ───────────────────────────────────────────

/**
 * Master catalog item - no location, no stock.
 * Stock is tracked per location in InventoryStockByLocation.
 */
export interface InventoryItem {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  itemType: InventoryItemType;
  unit: InventoryUnit;
  averageCost: number;
  lastPurchaseCost?: number;
  salePrice?: number;
  supplierId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stock record per item + location.
 * One document per (itemId, locationId) pair.
 */
export interface InventoryStockByLocation {
  id: string;
  itemId: string;
  locationId: string;
  currentStock: number;
  minimumStock: number;
  /** Override average cost for this location; falls back to InventoryItem.averageCost */
  averageCost?: number;
  totalValue: number;
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
  /** For single-location movements (entry, exit, adjustment) */
  locationId?: string;
  /** Source location for transfers */
  fromLocationId?: string;
  /** Destination location for transfers */
  toLocationId?: string;
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

export function getStockStatusForEntry(entry: InventoryStockByLocation): StockStatus {
  if (entry.currentStock <= 0) return "sin_stock";
  if (entry.minimumStock > 0 && entry.currentStock <= entry.minimumStock) return "bajo_minimo";
  return "ok";
}

/** Aggregate stock status across all locations for an item */
export function getAggregateStockStatus(entries: InventoryStockByLocation[]): StockStatus {
  if (entries.length === 0) return "sin_stock";
  const total = entries.reduce((s, e) => s + e.currentStock, 0);
  if (total <= 0) return "sin_stock";
  const allBelowMin = entries.every(
    (e) => e.minimumStock > 0 && e.currentStock <= e.minimumStock
  );
  if (allBelowMin) return "bajo_minimo";
  return "ok";
}

/** IN movement types (positive stock change) */
export const IN_MOVEMENT_TYPES: InventoryMovementType[] = [
  "purchase_in", "transfer_in", "adjustment_in", "return_in",
];

/** OUT movement types (negative stock change) */
export const OUT_MOVEMENT_TYPES: InventoryMovementType[] = [
  "production_out", "transfer_out", "adjustment_out", "sale_out",
];
