import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { CompanySettings } from "@/lib/firestore/company";
import type { Quotation, QuotationItem } from "@/types/quotation";
import {
  QUOTATION_STATUS_LABELS,
  QUOTATION_ITEM_CATEGORY_LABELS,
} from "@/types/quotation";

// ─── Styles ────────────────────────────────────────────────────────────────────
const C = {
  black: "#111111",
  dark: "#333333",
  mid: "#666666",
  light: "#999999",
  border: "#dddddd",
  bg: "#f8f8f8",
  accent: "#b45309", // amber-700 — matches brand
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.dark,
    backgroundColor: C.white,
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 44,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logo: { width: 165, height: 95, objectFit: "contain" },
  companyNameFallback: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.black },
  companyInfo: { alignItems: "flex-end", gap: 2 },
  companyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.black },
  companyDetail: { fontSize: 8, color: C.mid },

  // ── Client + meta row ──
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  clientBlock: { gap: 2 },
  clientLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.light, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  clientName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.black },
  clientDetail: { fontSize: 8.5, color: C.mid },

  quoteBlock: { alignItems: "flex-end", gap: 3 },
  quoteNumberRow: { flexDirection: "row", gap: 4 },
  quoteLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black },
  quoteNumber: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.accent },
  quoteMeta: { fontSize: 8, color: C.mid },
  statusBadge: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white, backgroundColor: C.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  statusDraft: { backgroundColor: "#888" },
  statusAccepted: { backgroundColor: "#15803d" },
  statusRejected: { backgroundColor: "#b91c1c" },
  statusSent: { backgroundColor: "#1d4ed8" },

  // ── Title / description ──
  titleBlock: { marginBottom: 16 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.black, marginBottom: 4 },
  docDescription: { fontSize: 8.5, color: C.mid, lineHeight: 1.5 },

  // ── Table ──
  table: { marginBottom: 20 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: C.black,
    paddingBottom: 5,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingVertical: 6,
    alignItems: "flex-start",
  },
  tableRowAlt: { backgroundColor: C.bg },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 36, textAlign: "center" },
  colUnit: { width: 32, textAlign: "center" },
  colPrice: { width: 64, textAlign: "right" },
  colTotal: { width: 64, textAlign: "right" },
  thText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.black, textTransform: "uppercase", letterSpacing: 0.5 },
  itemDesc: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.black },
  itemNotes: { fontSize: 7.5, color: C.mid, marginTop: 2, lineHeight: 1.4 },
  itemCategory: { fontSize: 7, color: C.light, marginTop: 1 },
  tdText: { fontSize: 8.5, color: C.dark },
  tdTotal: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.black },

  // ── Totals ──
  totalsWrapper: { alignItems: "flex-end", marginBottom: 20 },
  totalsBox: { width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totalLabel: { fontSize: 8.5, color: C.mid },
  totalValue: { fontSize: 8.5, color: C.dark },
  totalFinalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: C.black, paddingTop: 5, marginTop: 3 },
  totalFinalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black },
  totalFinalValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black },
  depositRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4, marginTop: 2, borderTopWidth: 0.5, borderTopColor: C.border },
  depositLabel: { fontSize: 8, color: C.mid },
  depositValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.dark },

  // ── Notes ──
  notesBox: { backgroundColor: C.bg, borderRadius: 4, padding: 10, marginBottom: 20 },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: C.dark, lineHeight: 1.5 },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 7, color: C.light },
});

// ─── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function statusStyle(status: Quotation["status"]) {
  if (status === "accepted") return [s.statusBadge, s.statusAccepted];
  if (status === "rejected") return [s.statusBadge, s.statusRejected];
  if (status === "sent") return [s.statusBadge, s.statusSent];
  return [s.statusBadge, s.statusDraft];
}

// ─── Props ──────────────────────────────────────────────────────────────────────
export interface QuotationPDFProps {
  quotation: Quotation;
  items: QuotationItem[];
  company: CompanySettings | null;
  formatCurrency: (n: number) => string;
  currencyCode: string;
}

// ─── Document ───────────────────────────────────────────────────────────────────
export function QuotationPDFDocument({
  quotation,
  items,
  company,
  formatCurrency,
  currencyCode,
}: QuotationPDFProps) {
  return (
    <Document
      title={`${quotation.quotationNumber} — ${quotation.clientName}`}
      author={company?.name ?? "Rustic Alexanders"}
      creator="HEXCLOUD ERP"
    >
      <Page size="A4" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.header} fixed>
          {/* Logo or company name */}
          {company?.logoUrl ? (
            <Image src={company.logoUrl} style={s.logo} />
          ) : (
            <Text style={s.companyNameFallback}>{company?.name ?? "Rustic Alexanders"}</Text>
          )}

          {/* Company info — right */}
          <View style={s.companyInfo}>
            <Text style={s.companyName}>{company?.name ?? "Rustic Alexanders"}</Text>
            {company?.taxId && <Text style={s.companyDetail}>{company.taxId}</Text>}
            {company?.address && <Text style={s.companyDetail}>{company.address}</Text>}
            {(company?.city || company?.country) && (
              <Text style={s.companyDetail}>
                {[company.city, company.country].filter(Boolean).join(", ")}
              </Text>
            )}
            {company?.email && <Text style={s.companyDetail}>{company.email}</Text>}
            {company?.phone && <Text style={s.companyDetail}>{company.phone}</Text>}
          </View>
        </View>

        {/* ── CLIENT + QUOTE META ── */}
        <View style={s.metaRow}>
          {/* Client */}
          <View style={s.clientBlock}>
            <Text style={s.clientLabel}>Cliente</Text>
            <Text style={s.clientName}>{quotation.clientName}</Text>
            {quotation.clientPhone && <Text style={s.clientDetail}>{quotation.clientPhone}</Text>}
          </View>

          {/* Quote meta */}
          <View style={s.quoteBlock}>
            <View style={s.quoteNumberRow}>
              <Text style={s.quoteLabel}>COTIZACIÓN</Text>
              <Text style={s.quoteNumber}>{quotation.quotationNumber}</Text>
            </View>
            <Text style={s.quoteMeta}>Fecha: {fmtDate(quotation.createdAt)}</Text>
            {quotation.validUntil && (
              <Text style={s.quoteMeta}>Vencimiento: {fmtDate(quotation.validUntil)}</Text>
            )}
            {quotation.estimatedDeliveryDays && (
              <Text style={s.quoteMeta}>Entrega: {quotation.estimatedDeliveryDays} días</Text>
            )}
            <Text style={statusStyle(quotation.status)}>
              {QUOTATION_STATUS_LABELS[quotation.status]}
            </Text>
          </View>
        </View>

        {/* ── TITLE / DESCRIPTION ── */}
        <View style={s.titleBlock}>
          <Text style={s.docTitle}>{quotation.title}</Text>
          {quotation.description && (
            <Text style={s.docDescription}>{quotation.description}</Text>
          )}
        </View>

        {/* ── ITEMS TABLE ── */}
        <View style={s.table}>
          {/* Header row */}
          <View style={s.tableHeader}>
            <View style={s.colDesc}><Text style={s.thText}>Descripción</Text></View>
            <View style={s.colQty}><Text style={s.thText}>Cant.</Text></View>
            <View style={s.colUnit}><Text style={s.thText}>Und.</Text></View>
            <View style={s.colPrice}><Text style={s.thText}>P. Unit.</Text></View>
            <View style={s.colTotal}><Text style={s.thText}>Total</Text></View>
          </View>

          {/* Item rows */}
          {items.map((item, i) => (
            <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
              <View style={s.colDesc}>
                <Text style={s.itemDesc}>{item.description}</Text>
                {item.notes && <Text style={s.itemNotes}>{item.notes}</Text>}
                <Text style={s.itemCategory}>{QUOTATION_ITEM_CATEGORY_LABELS[item.category]}</Text>
              </View>
              <View style={s.colQty}><Text style={s.tdText}>{item.quantity}</Text></View>
              <View style={s.colUnit}><Text style={s.tdText}>{item.unit}</Text></View>
              <View style={s.colPrice}><Text style={s.tdText}>{formatCurrency(item.unitPrice)}</Text></View>
              <View style={s.colTotal}><Text style={s.tdTotal}>{formatCurrency(item.total)}</Text></View>
            </View>
          ))}
        </View>

        {/* ── TOTALS ── */}
        <View style={s.totalsWrapper}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{formatCurrency(quotation.subtotal)}</Text>
            </View>
            {quotation.discountAmount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Descuento</Text>
                <Text style={s.totalValue}>-{formatCurrency(quotation.discountAmount)}</Text>
              </View>
            )}
            {quotation.taxAmount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>ISV{quotation.taxPercent ? ` (${quotation.taxPercent}%)` : ""}</Text>
                <Text style={s.totalValue}>{formatCurrency(quotation.taxAmount)}</Text>
              </View>
            )}
            <View style={s.totalFinalRow}>
              <Text style={s.totalFinalLabel}>Total</Text>
              <Text style={s.totalFinalValue}>{formatCurrency(quotation.total)}</Text>
            </View>
            {quotation.depositAmount && quotation.depositAmount > 0 && (
              <View style={s.depositRow}>
                <Text style={s.depositLabel}>Anticipo ({quotation.depositPercentage}%)</Text>
                <Text style={s.depositValue}>{formatCurrency(quotation.depositAmount)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── NOTES ── */}
        {quotation.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notas</Text>
            <Text style={s.notesText}>{quotation.notes}</Text>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{company?.name ?? "Rustic Alexanders"} · HEXCLOUD ERP</Text>
          <Text style={s.footerText}>{currencyCode}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
