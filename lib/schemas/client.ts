import { z } from "zod";

export const clientSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(7, "Ingresa un teléfono válido"),
  secondaryPhone: z.string().optional(),
  email: z.string().optional(),
  documentId: z.string().optional(),
  clientType: z.enum(["individual", "company"]),
  source: z.enum([
    "store",
    "whatsapp",
    "instagram",
    "facebook",
    "tiktok",
    "referral",
    "other",
  ]),
  notes: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
