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

const INVENTORY_MOVEMENT_TYPES = [
  "purchase_in", "production_out", "transfer_in", "transfer_out",
  "adjustment_in", "adjustment_out", "sale_out", "return_in",
] as const;

const INVENTORY_REFERENCE_TYPES = [
  "purchase", "production_order", "order", "transfer", "manual_adjustment",
] as const;

// ── Item schema ──────────────────────────────────────────

export const inventoryItemSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(2, "El nombre es obligatorio"),
  description: z.string().optional(),
  category: z.enum(INVENTORY_CATEGORIES),
  itemType: z.enum(INVENTORY_ITEM_TYPES),
  unit: z.enum(INVENTORY_UNITS),
  currentStock: z.number().min(0, "El stock no puede ser negativo"),
  minimumStock: z.number().min(0, "El mínimo no puede ser negativo"),
  averageCost: z.number().min(0, "El costo no puede ser negativo"),
  lastPurchaseCost: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  locationId: z.string().min(1, "Selecciona una ubicación"),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInventoryItemSchema = inventoryItemSchema.partial();

// ── Location schema ──────────────────────────────────────

export const inventoryLocationSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  type: z.enum(INVENTORY_LOCATION_TYPES),
  description: z.string().optional(),
});

// ── Movement schema ──────────────────────────────────────

export const inventoryMovementSchema = z.object({
  type: z.enum(INVENTORY_MOVEMENT_TYPES),
  quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  unitCost: z.number().min(0).optional(),
  referenceType: z.enum(INVENTORY_REFERENCE_TYPES).optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

// ── Adjust stock schema (UI form) ────────────────────────

export const adjustStockSchema = z.object({
  type: z.enum(["adjustment_in", "adjustment_out", "purchase_in", "sale_out", "return_in"] as const),
  quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  unitCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ── Transfer schema (UI form) ────────────────────────────

export const transferStockSchema = z.object({
  targetItemId: z.string().min(1, "Selecciona el artículo destino"),
  quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

// Transfer by location (no targetItemId — resolved automatically)
export const transferByLocationSchema = z.object({
  quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
  notes: z.string().optional(),
});

// ── Types ────────────────────────────────────────────────

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;
export type UpdateInventoryItemFormValues = z.infer<typeof updateInventoryItemSchema>;
export type InventoryLocationFormValues = z.infer<typeof inventoryLocationSchema>;
export type InventoryMovementFormValues = z.infer<typeof inventoryMovementSchema>;
export type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;
export type TransferStockFormValues = z.infer<typeof transferStockSchema>;
export type TransferByLocationFormValues = z.infer<typeof transferByLocationSchema>;
