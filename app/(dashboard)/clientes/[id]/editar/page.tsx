"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { clientSchema, type ClientFormValues } from "@/lib/schemas/client";
import { getClientById, updateClient } from "@/lib/firestore/clients";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-400 mt-1">{message}</p>;
}

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { clientType: "individual", source: "store" },
  });

  useEffect(() => {
    getClientById(id)
      .then((client) => {
        if (!client) { setLoadError("Cliente no encontrado"); return; }
        reset({
          fullName: client.fullName,
          phone: client.phone,
          secondaryPhone: client.secondaryPhone ?? "",
          email: client.email ?? "",
          documentId: client.documentId ?? "",
          address: client.address ?? "",
          city: client.city ?? "",
          postalCode: client.postalCode ?? "",
          department: client.department ?? "",
          clientType: client.clientType,
          source: client.source,
          notes: client.notes ?? "",
        });
        setLoaded(true);
      })
      .catch((err) => setLoadError(err.message ?? "Error al cargar cliente"));
  }, [id, reset]);

  const clean = (v?: string) => (v?.trim() === "" ? undefined : v?.trim());

  async function onSubmit(values: ClientFormValues) {
    setServerError(null);
    try {
      await updateClient(id, {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        secondaryPhone: clean(values.secondaryPhone),
        email: clean(values.email),
        documentId: clean(values.documentId),
        address: clean(values.address),
        postalCode: clean(values.postalCode),
        city: clean(values.city),
        department: clean(values.department),
        clientType: values.clientType,
        source: values.source,
        notes: clean(values.notes),
      });
      router.push(`/clientes/${id}`);
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : "Error al guardar los cambios"
      );
    }
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {loadError}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/clientes/${id}`}>
          <button className="flex items-center justify-center size-9 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
            <ArrowLeft className="size-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight font-[family:var(--font-heading)]">
            Editar cliente
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Modifica los datos del cliente
          </p>
        </div>
      </div>

      {!loaded && !loadError && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {loaded && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Required fields */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              Información principal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="fullName">
                  Nombre completo <span className="text-amber-500">*</span>
                </Label>
                <Input id="fullName" placeholder="Juan García" {...register("fullName")} aria-invalid={!!errors.fullName} />
                <FieldError message={errors.fullName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Teléfono <span className="text-amber-500">*</span>
                </Label>
                <Input id="phone" type="tel" placeholder="300 123 4567" {...register("phone")} aria-invalid={!!errors.phone} />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondaryPhone">Teléfono secundario</Label>
                <Input id="secondaryPhone" type="tel" placeholder="Opcional" {...register("secondaryPhone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientType">
                  Tipo de cliente <span className="text-amber-500">*</span>
                </Label>
                <select id="clientType" className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-zinc-900" {...register("clientType")}>
                  <option value="individual">Persona natural</option>
                  <option value="company">Empresa</option>
                </select>
                <FieldError message={errors.clientType?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="source">
                  Origen <span className="text-amber-500">*</span>
                </Label>
                <select id="source" className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-zinc-900" {...register("source")}>
                  <option value="store">Tienda</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="referral">Referido</option>
                  <option value="other">Otro</option>
                </select>
                <FieldError message={errors.source?.message} />
              </div>
            </div>
          </div>

          {/* Optional fields */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              Datos adicionales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="correo@ejemplo.com" {...register("email")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="documentId">Cédula / RTN</Label>
                <Input id="documentId" placeholder="0801-1990-12345 / RTN" {...register("documentId")} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" placeholder="Col. Kennedy, Bloque 5, Casa 12" {...register("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" placeholder="Tegucigalpa" {...register("city")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">Código postal</Label>
                <Input id="postalCode" placeholder="11101" {...register("postalCode")} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" placeholder="Francisco Morazán" {...register("department")} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" placeholder="Observaciones internas sobre el cliente…" rows={3} {...register("notes")} />
              </div>
            </div>
          </div>

          {serverError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Link href={`/clientes/${id}`}>
              <Button type="button" variant="ghost">Cancelar</Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
