"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { getQuotationById, listQuotationItems } from "@/lib/firestore/quotations";
import type { Quotation, QuotationItem } from "@/types/quotation";
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_PROJECT_TYPE_LABELS,
  QUOTATION_SOURCE_LABELS,
  QUOTATION_ITEM_CATEGORY_LABELS,
} from "@/types/quotation";
import { useCurrency } from "@/context/currency-context";

function formatDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default function QuotationPdfPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { formatCurrency, currencyConfig } = useCurrency();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getQuotationById(id), listQuotationItems(id)]).then(([q, i]) => {
      setQuotation(q);
      setItems(i);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-sm text-zinc-400">Cotización no encontrada</p>
        <Link href="/cotizaciones" className="text-xs text-amber-400 hover:underline">Volver</Link>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-zinc-900 border-b border-zinc-800 px-6 py-3">
        <Link
          href={`/cotizaciones/${id}`}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={14} /> Volver a cotización
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
        >
          <Printer size={14} /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* PDF document */}
      <div className="print:pt-0 pt-16 bg-white text-zinc-900 min-h-screen">
        <div className="max-w-3xl mx-auto px-8 py-10 print:px-6 print:py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-zinc-900">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 leading-tight">Rustic Alexanders</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Estructuras de madera rústica</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-zinc-900">{quotation.quotationNumber}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                quotation.status === "accepted" ? "bg-emerald-100 text-emerald-800" :
                quotation.status === "rejected" ? "bg-red-100 text-red-800" :
                quotation.status === "sent" ? "bg-blue-100 text-blue-800" :
                "bg-zinc-100 text-zinc-700"
              }`}>
                {QUOTATION_STATUS_LABELS[quotation.status]}
              </span>
            </div>
          </div>

          {/* Client & project info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Cliente</h2>
              <p className="text-base font-semibold text-zinc-900">{quotation.clientName}</p>
              <p className="text-sm text-zinc-600">{quotation.clientPhone}</p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Detalles</h2>
              <div className="flex flex-col gap-1">
                <PdfRow label="Canal" value={QUOTATION_SOURCE_LABELS[quotation.source]} />
                <PdfRow label="Tipo de proyecto" value={QUOTATION_PROJECT_TYPE_LABELS[quotation.projectType]} />
                {quotation.validUntil && <PdfRow label="Válida hasta" value={formatDate(quotation.validUntil)} />}
                {quotation.estimatedDeliveryDays && (
                  <PdfRow label="Tiempo de entrega" value={`${quotation.estimatedDeliveryDays} días`} />
                )}
              </div>
            </div>
          </div>

          {/* Title & description */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-zinc-900">{quotation.title}</h2>
            {quotation.description && (
              <p className="text-sm text-zinc-600 mt-2 whitespace-pre-wrap leading-relaxed">{quotation.description}</p>
            )}
          </div>

          {/* Items table */}
          <div className="mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-900">
                  <th className="text-left pb-2 font-semibold text-zinc-900 text-xs uppercase tracking-wide">Descripción</th>
                  <th className="text-center pb-2 font-semibold text-zinc-900 text-xs uppercase tracking-wide w-16">Cant.</th>
                  <th className="text-center pb-2 font-semibold text-zinc-900 text-xs uppercase tracking-wide w-14">Und.</th>
                  <th className="text-right pb-2 font-semibold text-zinc-900 text-xs uppercase tracking-wide w-28">P. Unit.</th>
                  <th className="text-right pb-2 font-semibold text-zinc-900 text-xs uppercase tracking-wide w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-200">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-zinc-900">{item.description}</p>
                      {item.notes && (
                        <p className="text-xs text-zinc-500 mt-0.5 whitespace-pre-wrap">{item.notes}</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-0.5">{QUOTATION_ITEM_CATEGORY_LABELS[item.category]}</p>
                    </td>
                    <td className="py-3 text-center text-zinc-700">{item.quantity}</td>
                    <td className="py-3 text-center text-zinc-700">{item.unit}</td>
                    <td className="py-3 text-right text-zinc-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-right font-semibold text-zinc-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="text-zinc-800">{formatCurrency(quotation.subtotal)}</span>
              </div>
              {quotation.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Descuento</span>
                  <span className="text-zinc-800">-{formatCurrency(quotation.discountAmount)}</span>
                </div>
              )}
              {quotation.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">ISV{quotation.taxPercent ? ` (${quotation.taxPercent}%)` : ""}</span>
                  <span className="text-zinc-800">{formatCurrency(quotation.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t-2 border-zinc-900 pt-2 mt-1">
                <span className="text-zinc-900">Total</span>
                <span className="text-zinc-900">{formatCurrency(quotation.total)}</span>
              </div>
              {quotation.depositAmount && quotation.depositAmount > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-zinc-500">Anticipo ({quotation.depositPercentage}%)</span>
                  <span className="font-semibold text-zinc-900">{formatCurrency(quotation.depositAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {quotation.notes && (
            <div className="mb-8 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Notas</h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-zinc-200 text-center">
            <p className="text-xs text-zinc-400">
              Cotización generada por HEXCLOUD ERP · Rustic Alexanders · {currencyConfig.code}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </>
  );
}

function PdfRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-zinc-500 shrink-0">{label}:</span>
      <span className="text-zinc-800">{value}</span>
    </div>
  );
}
