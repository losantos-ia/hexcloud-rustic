import { z } from "zod";

export const structureSchema = z.object({
  type: z.enum([
    "cabin",
    "pergola",
    "kiosk",
    "deck",
    "playground",
    "rustic_cafe",
    "custom",
  ]),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  model: z.string().optional(),
  deliveryDate: z.string().optional(),
  maintenanceFrequencyMonths: z
    .number()
    .int()
    .min(1, "Mínimo 1 mes")
    .max(60, "Máximo 60 meses"),
  notes: z.string().optional(),
});

export type StructureFormValues = z.infer<typeof structureSchema>;
