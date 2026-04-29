"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, TrendingUp, Clock, FileText, Trophy } from "lucide-react";
import { listLeads } from "@/lib/firestore/leads";
import type { Lead, LeadStatus, LeadSource, LeadInterestedIn } from "@/types/lead";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_INTERESTED_IN_LABELS,
  LEAD_PRIORITY_LABELS,
  ACTIVE_LEAD_STATUSES,
} from "@/types/lead";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<LeadStatus, BadgeVariant> = {
  new: "blue",
  contacted: "purple",
  qualified: "amber",
  waiting_measurements: "default",
  quotation_pending: "amber",
  quotation_sent: "blue",
  follow_up: "purple",
  negotiation: "amber",
  deposit_pending: "amber",
  won: "green",
  lost: "red",
  archived: "default",
};

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
  high: "red",
  medium: "amber",
  low: "default",
};

const SOURCE_VARIANT: Record<LeadSource, BadgeVariant> = {
  whatsapp: "green",
  instagram: "pink",
  facebook: "blue",
  tiktok: "purple",
  store: "amber",
  referral: "amber",
  website: "blue",
  other: "default",
};

function isOverdue(date?: Date): boolean {
  if (!date) return false;
  return date < new Date();
}

function isToday(date?: Date): boolean {
  if (!date) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isThisMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "all" | "active">("active");
  const [filterSource, setFilterSource] = useState<LeadSource | "all">("all");
  const [filterInterest, setFilterInterest] = useState<LeadInterestedIn | "all">("all");

  useEffect(() => {
    listLeads()
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    newLeads: leads.filter((l) => l.status === "new").length,
    followUpsToday: leads.filter((l) => isToday(l.nextActionDate)).length,
    quotationPending: leads.filter((l) => l.status === "quotation_pending" || l.status === "quotation_sent").length,
    wonThisMonth: leads.filter((l) => l.status === "won" && isThisMonth(l.updatedAt)).length,
  }), [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterStatus === "active" && !ACTIVE_LEAD_STATUSES.includes(l.status)) return false;
      if (filterStatus !== "active" && filterStatus !== "all" && l.status !== filterStatus) return false;
      if (filterSource !== "all" && l.source !== filterSource) return false;
      if (filterInterest !== "all" && l.interestedIn !== filterInterest) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.fullName.toLowerCase().includes(q) || l.phone.includes(q);
      }
      return true;
    });
  }, [leads, filterStatus, filterSource, filterInterest, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            CRM / Leads
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{leads.length} leads en total</p>
        </div>
        <Link
          href="/crm/nuevo"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} />
          Nuevo lead
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={<TrendingUp size={18} />} label="Nuevos leads" value={stats.newLeads} color="blue" />
        <SummaryCard icon={<Clock size={18} />} label="Seguimientos hoy" value={stats.followUpsToday} color="amber" />
        <SummaryCard icon={<FileText size={18} />} label="Cotizaciones" value={stats.quotationPending} color="purple" />
        <SummaryCard icon={<Trophy size={18} />} label="Ganados este mes" value={stats.wonThisMonth} color="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LeadStatus | "all" | "active")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
        >
          <option value="active">Activos</option>
          <option value="all">Todos los estados</option>
          {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
            <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as LeadSource | "all")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
        >
          <option value="all">Todos los canales</option>
          {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((s) => (
            <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterInterest}
          onChange={(e) => setFilterInterest(e.target.value as LeadInterestedIn | "all")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
        >
          <option value="all">Todo tipo</option>
          {(Object.keys(LEAD_INTERESTED_IN_LABELS) as LeadInterestedIn[]).map((i) => (
            <option key={i} value={i}>{LEAD_INTERESTED_IN_LABELS[i]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-zinc-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 w-36 rounded bg-zinc-800" />
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="h-5 w-20 rounded bg-zinc-800" />
                <div className="h-5 w-16 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <TrendingUp size={20} className="text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No hay leads</p>
            <p className="text-xs text-zinc-600">
              {search || filterStatus !== "active" || filterSource !== "all" || filterInterest !== "all"
                ? "Prueba cambiando los filtros"
                : "Agrega tu primer lead para comenzar"}
            </p>
            {!search && filterStatus === "active" && filterSource === "all" && filterInterest === "all" && (
              <Link
                href="/crm/nuevo"
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                <Plus size={12} /> Nuevo lead
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Nombre</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Teléfono</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Canal</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Interés</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Prioridad</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Próx. acción</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-zinc-800/50 transition-colors cursor-pointer ${lead.priority === "high" ? "border-l-2 border-l-red-500" : ""}`}
                    onClick={() => (window.location.href = `/crm/${lead.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-100">{lead.fullName}</td>
                    <td className="px-4 py-3 text-zinc-400">{lead.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant={SOURCE_VARIANT[lead.source]}>{LEAD_SOURCE_LABELS[lead.source]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{LEAD_INTERESTED_IN_LABELS[lead.interestedIn]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_VARIANT[lead.priority]}>{LEAD_PRIORITY_LABELS[lead.priority]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.nextActionDate ? (
                        <span className={`text-xs ${isOverdue(lead.nextActionDate) ? "text-red-400 font-medium" : "text-zinc-400"}`}>
                          {isOverdue(lead.nextActionDate) ? "⚠ " : ""}{formatDate(lead.nextActionDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-zinc-800">
              {filtered.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/crm/${lead.id}`}
                  className={`block px-4 py-3 hover:bg-zinc-800/50 transition-colors ${lead.priority === "high" ? "border-l-2 border-l-red-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-zinc-100 text-sm">{lead.fullName}</span>
                    <Badge variant={STATUS_VARIANT[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mb-2">{lead.phone}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={SOURCE_VARIANT[lead.source]}>{LEAD_SOURCE_LABELS[lead.source]}</Badge>
                    <Badge variant={PRIORITY_VARIANT[lead.priority]}>{LEAD_PRIORITY_LABELS[lead.priority]}</Badge>
                    {lead.nextActionDate && isOverdue(lead.nextActionDate) && (
                      <Badge variant="red">⚠ Vencido</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "amber" | "purple" | "green";
}) {
  const colorMap = {
    blue: "text-blue-400 bg-blue-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-center gap-3">
      <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
