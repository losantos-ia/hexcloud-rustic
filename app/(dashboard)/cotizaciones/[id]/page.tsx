"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Edit, FileText, ShoppingCart,
} from "lucide-react";
import { getQuotationById, updateQuotation, listQuotationItems } from "@/lib/firestore/quotations";
import type { Quotation, QuotationItem, QuotationStatus } from "@/types/quotation";
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_PROJECT_TYPE_LABELS,
  QUOTATION_ITEM_CATEGORY_LABELS,
  QUOTATION_SOURCE_LABELS,
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

function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

const READ_ONLY_STATUSES: QuotationStatus[] = ["accepted", "converted_to_order"];

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { formatCurrency } = useCurrency();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    Promise.all([getQuotationById(id), listQuotationItems(id)]).then(([q, i]) => {
      setQuotation(q);
      setItems(i);
    }).finally(() => setLoading(false));
  }, [id]);

  async function changeStatus(newStatus: QuotationStatus, actionKey: string) {
    if (!quotation) return;
    setActionLoading(actionKey);
    try {
      await updateQuotation(id, { status: newStatus });
      setQuotation((prev) => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusChange(newStatus: QuotationStatus) {
    if (!quotation || newStatus === quotation.status) return;
    setStatusChanging(true);
    try {
      await updateQuotation(id, { status: newStatus });
      setQuotation((prev) => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setStatusChanging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-sm text-zinc-400">Cotización no encontrada</p>
        <Link href="/cotizaciones" className="text-xs text-amber-400 hover:underline">Volver a cotizaciones</Link>
      </div>
    );
  }

  const expired = isExpired(quotation);
  const isReadOnly = READ_ONLY_STATUSES.includes(quotation.status);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/cotizaciones"
            className="flex items-center justify-center size-8 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
                {quotation.title}
              </h1>
              <Badge variant={expired ? "red" : STATUS_VARIANT[quotation.status]}>
                {expired ? "Vencida" : QUOTATION_STATUS_LABELS[quotation.status]}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{quotation.quotationNumber}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <Link
              href={`/cotizaciones/${id}/editar`}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <Edit size={13} /> Editar
            </Link>
          )}

          {/* Status selector */}
          <div className="relative flex items-center gap-1.5">
            {statusChanging && <Loader2 size={12} className="animate-spin text-zinc-500" />}
            <select
              value={quotation.status}
              onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
              disabled={statusChanging}
              className="rounded-lg border border-zinc-700 bg-zinc-800 pl-3 pr-7 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed [&>option]:bg-zinc-900 cursor-pointer appearance-none"
            >
              {(Object.keys(QUOTATION_STATUS_LABELS) as QuotationStatus[]).map((s) => (
                <option key={s} value={s}>{QUOTATION_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <Link
            href={`/cotizaciones/${id}/pdf`}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            <FileText size={13} /> Ver PDF
          </Link>
          {quotation.status === "accepted" && (
            <button
              disabled
              title="Próximamente"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 cursor-not-allowed opacity-50"
            >
              <ShoppingCart size={13} /> Convertir en pedido
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Client & project info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-300">Información general</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Cliente" value={quotation.clientName} />
              <InfoRow label="Teléfono" value={quotation.clientPhone} />
              <InfoRow label="Canal" value={QUOTATION_SOURCE_LABELS[quotation.source]} />
              <InfoRow label="Tipo de proyecto" value={QUOTATION_PROJECT_TYPE_LABELS[quotation.projectType]} />
              {quotation.validUntil && (
                <InfoRow
                  label="Válida hasta"
                  value={formatDate(quotation.validUntil)}
                  highlight={expired}
                />
              )}
              {quotation.estimatedDeliveryDays && (
                <InfoRow label="Tiempo de entrega" value={`${quotation.estimatedDeliveryDays} días`} />
              )}
            </div>
            {quotation.description && (
              <div className="rounded-lg bg-zinc-800/50 px-3 py-2.5">
                <p className="text-xs text-zinc-500 mb-1">Descripción</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{quotation.description}</p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300">Ítems</h2>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-zinc-600 px-5 py-6">Sin ítems registrados</p>
            ) : (
              <>
                {/* Desktop */}
                <table className="hidden md:table w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left">
                      <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Descripción</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Cat.</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 text-right">Cant.</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Und.</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 text-right">P. Unit.</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="text-zinc-200">{item.description}</p>
                          {item.notes && <p className="text-xs text-zinc-500 mt-0.5 whitespace-pre-wrap">{item.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400">{QUOTATION_ITEM_CATEGORY_LABELS[item.category]}</td>
                        <td className="px-4 py-3 text-right text-zinc-300">{item.quantity}</td>
                        <td className="px-4 py-3 text-zinc-400">{item.unit}</td>
                        <td className="px-4 py-3 text-right text-zinc-300">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium text-zinc-100">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-zinc-800">
                  {items.map((item) => (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-zinc-200 flex-1">{item.description}</p>
                        <span className="font-medium text-zinc-100 text-sm shrink-0">{formatCurrency(item.total)}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {(quotation.notes || quotation.internalNotes) && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
              {quotation.notes && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Notas para el cliente</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{quotation.notes}</p>
                </div>
              )}
              {quotation.internalNotes && (
                <div className={quotation.notes ? "border-t border-zinc-800 pt-3" : ""}>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Notas internas</p>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{quotation.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — totals + meta */}
        <div className="flex flex-col gap-4">
          {/* Totals box */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">Resumen financiero</h2>
            <TotalRow label="Subtotal" value={formatCurrency(quotation.subtotal)} />
            {quotation.discountAmount > 0 && (
              <TotalRow label="Descuento" value={`-${formatCurrency(quotation.discountAmount)}`} />
            )}
            {quotation.taxAmount > 0 && (
              <TotalRow
                label={`ISV${quotation.taxPercent ? ` (${quotation.taxPercent}%)` : ""}`}
                value={formatCurrency(quotation.taxAmount)}
              />
            )}
            <div className="border-t border-zinc-700 pt-2 mt-1">
              <TotalRow label="Total" value={formatCurrency(quotation.total)} bold />
            </div>
            {quotation.depositAmount && (
              <div className="border-t border-zinc-700 pt-2 mt-1">
                <TotalRow
                  label={`Anticipo ${quotation.depositPercentage ? `(${quotation.depositPercentage}%)` : ""}`}
                  value={formatCurrency(quotation.depositAmount)}
                  accent
                />
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-zinc-300 mb-1">Detalles</h2>
            <MetaRow label="Número" value={quotation.quotationNumber} mono />
            <MetaRow label="Estado" value={QUOTATION_STATUS_LABELS[quotation.status]} />
            <MetaRow label="Ítems" value={`${items.length} ítem${items.length !== 1 ? "s" : ""}`} />
            <MetaRow label="Creada" value={formatDate(quotation.createdAt)} />
            <MetaRow label="Actualizada" value={formatDate(quotation.updatedAt)} />
            {quotation.leadId && <MetaRow label="Lead ID" value={quotation.leadId} mono />}
            {quotation.clientId && <MetaRow label="Cliente ID" value={quotation.clientId} mono />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-sm ${highlight ? "text-red-400 font-medium" : "text-zinc-200"}`}>{value}</p>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={`text-zinc-300 ${mono ? "font-mono text-amber-400" : ""}`}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${bold ? "font-semibold text-zinc-100" : "text-zinc-500"}`}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-zinc-100" : accent ? "font-medium text-amber-400" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}
