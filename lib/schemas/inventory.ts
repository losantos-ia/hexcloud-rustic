import { z } from "zod";

const INVENTORY_CATEGORIES = [
  "wood", "hardware", "roofing", "paint_sealer",
  "consumable", "tool", "finished_product", "other",
] as const;

const INVENTORY_ITEM_TYPES = [
  "material", "consumable", "tool", "finished_product",
] as const;

const INVENTORY_UNITS = [
  "unit", "ft", "m", "board", "gallon", "liter",
  "kg", "box", "roll", "sheet", "pack", "other",
] as const;

const INVENTORY_LOCATION_TYPES = [
  "workshop", "store", "warehouse", "vehicle", "other",
] as const;

// ── Item schema (master catalog, no locationId/stock) ────

export const inventoryItemSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  category: z.enum(INVENTORY_CATEGORIES, "Selecciona una categoria"),
  itemType: z.enum(INVENTORY_ITEM_TYPES, "Selecciona un tipo"),
  unit: z.enum(INVENTORY_UNITS, "Selecciona una unidad"),
  averageCost: z.number().min(0, "El costo no puede ser negativo"),
  lastPurchaseCost: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInventoryItemSchema = inventoryItemSchema.partial();

// ── Stock by location schema ─────────────────────────────

export const stockByLocationSchema = z.object({
  locationId: z.string().min(1, "Selecciona una ubicacion"),
  currentStock: z.number().min(0, "El stock no puede ser negativo"),
  minimumStock: z.number().min(0, "El minimo no puede ser negativo"),
  averageCost: z.number().min(0).optional(),
});

// ── Location schema ──────────────────────────────────────

export const inventoryLocationSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  type: z.enum(INVENTORY_LOCATION_TYPES),
  description: z.string().optional(),
});

// ── Adjust stock schema (UI form) ────────────────────────

export const adjustStockSchema = z.object({
  type: z.enum(["adjustment_in", "adjustment_out", "purchase_in", "sale_out", "return_in"] as const),
  locationId: z.string().min(1, "Selecciona una ubicacion"),
  quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ── Transfer schema (UI form) ────────────────────────────

export const transferByLocationSchema = z.object({
  fromLocationId: z.string().min(1, "Selecciona la ubicacion origen"),
  toLocationId: z.string().min(1, "Selecciona la ubicacion destino"),
  quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

// ── Types ────────────────────────────────────────────────

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;
export type UpdateInventoryItemFormValues = z.infer<typeof updateInventoryItemSchema>;
export type StockByLocationFormValues = z.infer<typeof stockByLocationSchema>;
export type InventoryLocationFormValues = z.infer<typeof inventoryLocationSchema>;
export type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;
export type TransferByLocationFormValues = z.infer<typeof transferByLocationSchema>;
