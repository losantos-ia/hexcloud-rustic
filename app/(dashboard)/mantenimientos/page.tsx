"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Plus, Wrench, AlertTriangle, Clock, CheckCircle2, Search, MoreHorizontal, Pencil } from "lucide-react";
import { listMaintenanceAssets } from "@/lib/firestore/maintenance";
import type { MaintenanceAsset, MaintenanceProjectType } from "@/types/maintenance";
import { MAINTENANCE_PROJECT_TYPE_LABELS, MAINTENANCE_ASSET_SOURCE_LABELS } from "@/types/maintenance";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

function getMaintenanceStatus(asset: MaintenanceAsset): "overdue" | "upcoming" | "ok" {
  const today = new Date();
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);
  if (asset.nextMaintenanceDate < today) return "overdue";
  if (asset.nextMaintenanceDate <= sevenDays) return "upcoming";
  return "ok";
}

const STATUS_LABEL: Record<string, string> = { overdue: "Vencido", upcoming: "Próximo", ok: "Al día" };
const STATUS_VARIANT: Record<string, BadgeVariant> = { overdue: "red", upcoming: "amber", ok: "green" };

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: "default" | "amber" | "red" | "blue" | "green" }) {
  const colorClass = { default: "text-zinc-400", amber: "text-amber-400", red: "text-red-400", blue: "text-blue-400", green: "text-green-400" }[color];
  const bgClass = { default: "bg-zinc-800/50", amber: "bg-amber-500/10", red: "bg-red-500/10", blue: "bg-blue-500/10", green: "bg-green-500/10" }[color];
  return (
    <div className={`rounded-xl border border-zinc-800 ${bgClass} p-4 flex items-center gap-3`}>
      <div className={colorClass}>{icon}</div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      </div>
    </div>
  );
}
function RowMenu({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="size-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1">
          <Link
            href={`/mantenimientos/${assetId}/editar`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Pencil size={13} /> Editar
          </Link>
        </div>
      )}
    </div>
  );
}
export default function MantenimientosPage() {
  const [assets, setAssets] = useState<MaintenanceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<MaintenanceProjectType | "">("");
  const [filterStatus, setFilterStatus] = useState<"overdue" | "upcoming" | "ok" | "">("");

  useEffect(() => {
    listMaintenanceAssets().then((data) => {
      setAssets(data.filter((a) => a.status === "active"));
      setLoading(false);
    });
  }, []);

  const counts = useMemo(() => ({
    overdue: assets.filter((a) => getMaintenanceStatus(a) === "overdue").length,
    upcoming: assets.filter((a) => getMaintenanceStatus(a) === "upcoming").length,
    total: assets.length,
  }), [assets]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const s = search.toLowerCase();
      if (s && !a.clientName.toLowerCase().includes(s) && !a.clientPhone.includes(s)) return false;
      if (filterType && a.projectType !== filterType) return false;
      if (filterStatus && getMaintenanceStatus(a) !== filterStatus) return false;
      return true;
    });
  }, [assets, search, filterType, filterStatus]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Mantenimientos</h1>
          <p className="text-sm text-zinc-400">Gestión de activos instalados y mantenimientos preventivos</p>
        </div>
        <Link
          href="/mantenimientos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 transition-colors"
        >
          <Plus className="size-4" /> Registrar activo
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={<AlertTriangle size={22} />} label="Vencidos" value={counts.overdue} color="red" />
        <SummaryCard icon={<Clock size={22} />} label="Esta semana" value={counts.upcoming} color="amber" />
        <SummaryCard icon={<CheckCircle2 size={22} />} label="Al día" value={counts.total - counts.overdue - counts.upcoming} color="green" />
        <SummaryCard icon={<Wrench size={22} />} label="Total activos" value={counts.total} color="blue" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as MaintenanceProjectType | "")}
          className="w-full sm:w-auto rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-500"
        >
          <option value="">Todos los tipos</option>
          {(Object.entries(MAINTENANCE_PROJECT_TYPE_LABELS) as [MaintenanceProjectType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="w-full sm:w-auto rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-500"
        >
          <option value="">Todos los estados</option>
          <option value="overdue">Vencido</option>
          <option value="upcoming">Próximo</option>
          <option value="ok">Al día</option>
        </select>
      </div>

      {/* List */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">Cargando activos...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
            <Wrench size={32} className="text-zinc-700" />
            <p className="text-sm">{assets.length === 0 ? "No hay activos registrados." : "Sin resultados para los filtros aplicados."}</p>
            {assets.length === 0 && (
              <Link href="/mantenimientos/nuevo" className="text-sm text-amber-400 hover:text-amber-300">
                Registrar primer activo →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500">Cliente</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500">Tipo</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500">Ubicación</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500">Instalación</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500">Próximo mant.</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500">Estado</th>
                    <th className="px-4 py-3 text-xs font-medium text-zinc-500">Origen</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset) => {
                    const st = getMaintenanceStatus(asset);
                    return (
                      <tr
                        key={asset.id}
                        className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/mantenimientos/${asset.id}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-100">{asset.clientName}</p>
                          <p className="text-xs text-zinc-500">{asset.clientPhone}</p>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{MAINTENANCE_PROJECT_TYPE_LABELS[asset.projectType]}</td>
                        <td className="px-4 py-3 text-zinc-400 max-w-[180px] truncate">{asset.locationAddress}</td>
                        <td className="px-4 py-3 text-zinc-400">{formatDate(asset.installationDate)}</td>
                        <td className={`px-4 py-3 font-medium ${st === "overdue" ? "text-red-400" : st === "upcoming" ? "text-amber-400" : "text-zinc-300"}`}>
                          {formatDate(asset.nextMaintenanceDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[st]}>{STATUS_LABEL[st]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={asset.createdSource === "automatic" ? "blue" : "default"}>
                            {MAINTENANCE_ASSET_SOURCE_LABELS[asset.createdSource ?? "manual"]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <RowMenu assetId={asset.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-800">
              {filtered.map((asset) => {
                const st = getMaintenanceStatus(asset);
                return (
                  <div key={asset.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-zinc-800/50 transition-colors">
                    <Link href={`/mantenimientos/${asset.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Wrench size={16} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-zinc-100 truncate">{asset.clientName}</p>
                          <Badge variant={STATUS_VARIANT[st]}>{STATUS_LABEL[st]}</Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{MAINTENANCE_PROJECT_TYPE_LABELS[asset.projectType]} · {asset.clientPhone}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xs font-medium ${st === "overdue" ? "text-red-400" : st === "upcoming" ? "text-amber-400" : "text-zinc-400"}`}>
                            Próximo: {formatDate(asset.nextMaintenanceDate)}
                          </p>
                          <Badge variant={asset.createdSource === "automatic" ? "blue" : "default"} className="text-[10px] py-0">
                            {MAINTENANCE_ASSET_SOURCE_LABELS[asset.createdSource ?? "manual"]}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                    <RowMenu assetId={asset.id} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
