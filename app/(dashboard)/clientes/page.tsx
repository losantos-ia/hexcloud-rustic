"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, Search, Phone, Calendar } from "lucide-react";
import { listClients } from "@/lib/firestore/clients";
import type { Client } from "@/types/client";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_SOURCE_LABELS,
} from "@/types/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SOURCE_VARIANT: Record<
  string,
  "default" | "green" | "pink" | "blue" | "amber" | "purple"
> = {
  store: "blue",
  whatsapp: "green",
  instagram: "pink",
  facebook: "blue",
  tiktok: "default",
  referral: "amber",
  other: "default",
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((err) => setError(err.message ?? "Error al cargar clientes"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight font-[family:var(--font-heading)]">
            Clientes
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {loading ? "Cargando..." : `${clients.length} clientes registrados`}
          </p>
        </div>
        <Link href="/clientes/nuevo">
          <Button className="gap-2">
            <Plus className="size-4" />
            Nuevo cliente
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-800/60 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-colors"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-zinc-800/40 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-20 text-center">
          <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <Users className="size-5 text-amber-400" />
          </div>
          <p className="text-sm font-medium text-white">
            {search ? "Sin resultados" : "No hay clientes aún"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {search
              ? "Intenta con otro nombre o teléfono"
              : "Agrega tu primer cliente para comenzar"}
          </p>
          {!search && (
            <Link href="/clientes/nuevo" className="mt-4">
              <Button size="sm" className="gap-2">
                <Plus className="size-3.5" />
                Nuevo cliente
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">
                  Cliente
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">
                  Teléfono
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">
                  Tipo
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">
                  Origen
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">
                  Registrado
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-zinc-800/60 last:border-0 bg-zinc-900 hover:bg-zinc-800/60 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/clientes/${client.id}`}
                      className="block hover:text-amber-400 transition-colors"
                    >
                      <span className="font-medium text-white">
                        {client.fullName}
                      </span>
                      {client.email && (
                        <span className="block text-xs text-zinc-500 mt-0.5">
                          {client.email}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-300">
                    <Link href={`/clientes/${client.id}`} className="block">
                      <span className="flex items-center gap-1.5">
                        <Phone className="size-3 text-zinc-500" />
                        {client.phone}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/clientes/${client.id}`} className="block">
                      <Badge
                        variant={
                          client.clientType === "company" ? "purple" : "blue"
                        }
                      >
                        {CLIENT_TYPE_LABELS[client.clientType]}
                      </Badge>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/clientes/${client.id}`} className="block">
                      <Badge
                        variant={SOURCE_VARIANT[client.source] ?? "default"}
                      >
                        {CLIENT_SOURCE_LABELS[client.source]}
                      </Badge>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 text-xs">
                    <Link href={`/clientes/${client.id}`} className="block">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-zinc-600" />
                        {format(client.createdAt, "dd MMM yyyy", {
                          locale: es,
                        })}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-zinc-800">
            {filtered.map((client) => (
              <Link
                key={client.id}
                href={`/clientes/${client.id}`}
                className="flex items-start justify-between gap-3 px-4 py-4 bg-zinc-900 hover:bg-zinc-800/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm truncate">
                    {client.fullName}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                    <Phone className="size-3" />
                    {client.phone}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge variant={SOURCE_VARIANT[client.source] ?? "default"}>
                    {CLIENT_SOURCE_LABELS[client.source]}
                  </Badge>
                  <span className="text-[10px] text-zinc-500">
                    {format(client.createdAt, "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
