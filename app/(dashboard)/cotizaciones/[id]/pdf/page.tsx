"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, ArrowLeft, Loader2, LayoutList } from "lucide-react";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { getQuotationById, listQuotationItems } from "@/lib/firestore/quotations";
import { getCompanySettings, type CompanySettings } from "@/lib/firestore/company";
import type { Quotation, QuotationItem } from "@/types/quotation";
import { useCurrency } from "@/context/currency-context";
import type { QuotationPDFProps } from "@/components/pdf/quotation-pdf-document";

const PDFViewerBlock = nextDynamic(
  () => import("@/components/pdf/quotation-pdf-viewer").then((m) => m.QuotationPDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-sm">Renderizando PDF...</span>
      </div>
    ),
  }
);

export default function QuotationPdfPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const searchParams = useSearchParams();
  const autoDownload = searchParams.get("download") === "1";
  const { formatCurrency, currencyConfig } = useCurrency();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([getQuotationById(id), listQuotationItems(id), getCompanySettings()])
      .then(([q, i, c]) => {
        setQuotation(q);
        setItems(i);
        setCompany(c);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-trigger download when ?download=1 is present and data is ready
  useEffect(() => {
    if (autoDownload && !loading && quotation) {
      handleDownload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload, loading, quotation]);

  const handleDownload = useCallback(async () => {
    if (!quotation) return;
    setDownloading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { QuotationPDFDocument } = await import("@/components/pdf/quotation-pdf-document");
      const { createElement } = await import("react");
      const props: QuotationPDFProps = {
        quotation,
        items,
        company,
        formatCurrency,
        currencyCode: currencyConfig.code,
      };
      const doc = createElement(QuotationPDFDocument, props);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(doc as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quotation.quotationNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [quotation, items, company, formatCurrency, currencyConfig.code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 size={20} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-zinc-950">
        <p className="text-sm text-zinc-400">Cotizacion no encontrada</p>
        <Link href="/cotizaciones" className="text-xs text-amber-400 hover:underline">Volver</Link>
      </div>
    );
  }

  const pdfProps: QuotationPDFProps = {
    quotation,
    items,
    company,
    formatCurrency,
    currencyCode: currencyConfig.code,
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <div className="flex items-center justify-between gap-4 bg-zinc-900 border-b border-zinc-800 px-6 py-3 shrink-0">
        <Link
          href={`/cotizaciones/${id}`}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={14} /> Volver a cotizacion
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{quotation.quotationNumber}</span>
          <Link
            href={`/cotizaciones/${id}`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            <LayoutList size={13} /> Ver detalles
          </Link>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-60 transition-colors"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <PDFViewerBlock {...pdfProps} />
      </div>
    </div>
  );
}