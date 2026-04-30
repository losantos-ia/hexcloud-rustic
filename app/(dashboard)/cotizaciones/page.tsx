"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, Send, CheckCircle, DollarSign, MoreVertical, Pencil, Copy, Download } from "lucide-react";
import { listQuotations } from "@/lib/firestore/quotations";
import type { Quotation, QuotationStatus, QuotationProjectType } from "@/types/quotation";
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_PROJECT_TYPE_LABELS,
} from "@/types/quotation";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency-context";

type BadgeVariant = BadgeProps["variant"];

const STATUS_VARIANT: Record<QuotationStatus, BadgeVariant> = {
  draft: "default",
  sent: "blue",
  accepted: "green",
  rejected: "red",
  expired: "red",
  converted_to_order: "purple",
};

function isExpired(q: Quotation): boolean {
  if (!q.validUntil) return false;
  return q.validUntil < new Date() && (q.status === "sent" || q.status === "draft");
}

function isThisMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CotizacionesPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<QuotationStatus | "all">("all");
  const [filterType, setFilterType] = useState<QuotationProjectType | "all">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { formatCurrency } = useCurrency();
  const router = useRouter();

  useEffect(() => {
    listQuotations()
      .then(setQuotations)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setMenuPos(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      setOpenMenuId(id);
    }
  }

  function closeMenu() {
    setOpenMenuId(null);
    setMenuPos(null);
  }

  const handleDuplicate = useCallback((id: string) => {
    setOpenMenuId(null);
    setMenuPos(null);
    router.push(`/cotizaciones/nueva?duplicateFrom=${id}`);
  }, [router]);

  const stats = useMemo(() => {
    const drafts = quotations.filter((q) => q.status === "draft").length;
    const sent = quotations.filter((q) => q.status === "sent").length;
    const acceptedThisMonth = quotations.filter(
      (q) => q.status === "accepted" && isThisMonth(q.updatedAt)
    ).length;
    const totalThisMonth = quotations
      .filter((q) => isThisMonth(q.createdAt))
      .reduce((sum, q) => sum + q.total, 0);
    return { drafts, sent, acceptedThisMonth, totalThisMonth };
  }, [quotations]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      if (filterStatus !== "all" && q.status !== filterStatus) return false;
      if (filterType !== "all" && q.projectType !== filterType) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          q.clientName.toLowerCase().includes(s) ||
          q.quotationNumber.toLowerCase().includes(s) ||
          q.title.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [quotations, filterStatus, filterType, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Cotizaciones
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{quotations.length} cotizaciones en total</p>
        </div>
        <Link
          href="/cotizaciones/nueva"
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
        >
          <Plus size={16} />
          Nueva cotización
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={<FileText size={18} />} label="Borradores" value={stats.drafts} display="number" color="default" />
        <SummaryCard icon={<Send size={18} />} label="Enviadas" value={stats.sent} display="number" color="blue" />
        <SummaryCard icon={<CheckCircle size={18} />} label="Aceptadas este mes" value={stats.acceptedThisMonth} display="number" color="green" />
        <SummaryCard icon={<DollarSign size={18} />} label="Total cotizado este mes" value={stats.totalThisMonth} display="currency" color="amber" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, número o título..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as QuotationStatus | "all")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
        >
          <option value="all">Todos los estados</option>
          {(Object.keys(QUOTATION_STATUS_LABELS) as QuotationStatus[]).map((s) => (
            <option key={s} value={s}>{QUOTATION_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as QuotationProjectType | "all")}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500 [&>option]:bg-zinc-900"
        >
          <option value="all">Todo tipo</option>
          {(Object.keys(QUOTATION_PROJECT_TYPE_LABELS) as QuotationProjectType[]).map((t) => (
            <option key={t} value={t}>{QUOTATION_PROJECT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-zinc-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="h-4 w-36 rounded bg-zinc-800" />
                <div className="h-5 w-20 rounded bg-zinc-800" />
                <div className="h-4 w-24 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="size-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <FileText size={20} className="text-zinc-500" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No hay cotizaciones</p>
            <p className="text-xs text-zinc-600">
              {search || filterStatus !== "all" || filterType !== "all"
                ? "Prueba cambiando los filtros"
                : "Crea tu primera cotización"}
            </p>
            {!search && filterStatus === "all" && filterType === "all" && (
              <Link
                href="/cotizaciones/nueva"
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                <Plus size={12} /> Nueva cotización
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Número</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Cliente</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Proyecto</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 text-right">Total</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Válida hasta</th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500">Creada</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((q) => {
                  const expired = isExpired(q);
                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      onClick={() => (window.location.href = `/cotizaciones/${q.id}/pdf`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-amber-400">{q.quotationNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-100">{q.clientName}</p>
                        <p className="text-xs text-zinc-500">{q.title}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{QUOTATION_PROJECT_TYPE_LABELS[q.projectType]}</td>
                      <td className="px-4 py-3">
                        <Badge variant={expired ? "red" : STATUS_VARIANT[q.status]}>
                          {expired ? "Vencida" : QUOTATION_STATUS_LABELS[q.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-100">{formatCurrency(q.total)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{formatDate(q.validUntil)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(q.createdAt)}</td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <button
                            className="flex items-center justify-center size-7 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                            onClick={(e) => openMenu(e, q.id)}
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-zinc-800">
              {filtered.map((q) => {
                const expired = isExpired(q);
                return (
                  <Link
                    key={q.id}
                    href={`/cotizaciones/${q.id}/pdf`}
                    className="block px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono text-xs text-amber-400">{q.quotationNumber}</span>
                      <Badge variant={expired ? "red" : STATUS_VARIANT[q.status]}>
                        {expired ? "Vencida" : QUOTATION_STATUS_LABELS[q.status]}
                      </Badge>
                    </div>
                    <p className="font-medium text-zinc-100 text-sm">{q.clientName}</p>
                    <p className="text-xs text-zinc-500 mb-2">{q.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{QUOTATION_PROJECT_TYPE_LABELS[q.projectType]}</span>
                      <span className="font-medium text-zinc-100 text-sm">{formatCurrency(q.total)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-800">
                      <Link
                        href={`/cotizaciones/${q.id}/editar`}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Pencil size={11} /> Editar
                      </Link>
                      <button
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDuplicate(q.id); }}
                      >
                        <Copy size={11} /> Duplicar
                      </button>
                      <Link
                        href={`/cotizaciones/${q.id}/pdf?download=1`}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download size={11} /> Descargar PDF
                      </Link>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Fixed dropdown menu (escapes overflow-hidden) */}
      {openMenuId && menuPos && (() => {
        const q = filtered.find((x) => x.id === openMenuId);
        if (!q) return null;
        return (
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="w-44 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl py-1"
          >
            <Link
              href={`/cotizaciones/${q.id}/editar`}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
              onClick={closeMenu}
            >
              <Pencil size={13} className="text-zinc-400" /> Editar
            </Link>
            <button
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
              onClick={() => handleDuplicate(q.id)}
            >
              <Copy size={13} className="text-zinc-400" /> Duplicar
            </button>
            <Link
              href={`/cotizaciones/${q.id}/pdf?download=1`}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
              onClick={closeMenu}
            >
              <Download size={13} className="text-zinc-400" /> Descargar PDF
            </Link>
          </div>
        );
      })()}
    </div>
  );
}

function SummaryCard({
  icon, label, value, display, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  display: "number" | "currency";
  color: "default" | "blue" | "green" | "amber";
}) {
  const colorMap = {
    default: "text-zinc-400 bg-zinc-800",
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
  };
  const { formatCompact } = useCurrency();
  const displayValue = display === "currency" ? formatCompact(value) : value;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex items-center gap-3">
      <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-zinc-100 truncate">{displayValue}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
