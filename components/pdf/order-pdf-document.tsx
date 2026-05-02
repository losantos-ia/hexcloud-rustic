import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { CompanySettings } from "@/lib/firestore/company";
import type { Order, OrderItem } from "@/types/order";
import type { Client } from "@/types/client";
import { ORDER_STATUS_LABELS, ORDER_PROJECT_TYPE_LABELS } from "@/types/order";

// ─── Colors ─────────────────────────────────────────────────────────────────────
const C = {
  black: "#111111",
  dark: "#333333",
  mid: "#666666",
  light: "#999999",
  border: "#dddddd",
  bg: "#f8f8f8",
  accent: "#b45309",
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
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logo: { width: 170, alignSelf: "flex-start" },
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

  orderBlock: { alignItems: "flex-end", gap: 3 },
  orderNumberRow: { flexDirection: "row", gap: 4 },
  orderLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.black },
  orderNumber: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.accent },
  orderMeta: { fontSize: 8, color: C.mid },
  statusBadge: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white, backgroundColor: C.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  statusConfirmed: { backgroundColor: "#1d4ed8" },
  statusProduction: { backgroundColor: "#7c3aed" },
  statusReady: { backgroundColor: "#15803d" },
  statusClosed: { backgroundColor: "#888" },
  statusCancelled: { backgroundColor: "#b91c1c" },

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
  colPrice: { width: 72, textAlign: "right" },
  colTotal: { width: 72, textAlign: "right" },
  thText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.black, textTransform: "uppercase", letterSpacing: 0.5 },
  itemDesc: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.black },
  itemNotes: { fontSize: 7.5, color: C.mid, marginTop: 2, lineHeight: 1.4 },
  tdText: { fontSize: 8.5, color: C.dark },
  tdTotal: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.black },

  // ── Totals ──
  totalsWrapper: { alignItems: "flex-end", marginBottom: 20 },
  totalsBox: { width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totalLabel: { fontSize: 8.5, color: C.mid },
  totalValue: { fontSize: 8.5, color: C.dark },
  totalFinalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: C.black, paddingTop: 5, marginTop: 3 },
  totalFinalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black },
  totalFinalValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.black },
  depositRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4, marginTop: 2, borderTopWidth: 0.5, borderTopColor: C.border },
  depositLabel: { fontSize: 8, color: C.mid },
  depositValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.dark },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 4, marginTop: 2 },
  balanceLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.accent },
  balanceValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.accent },

  // ── Delivery box ──
  deliveryBox: { backgroundColor: C.bg, borderRadius: 4, padding: 10, marginBottom: 14 },
  deliveryLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  deliveryText: { fontSize: 8.5, color: C.dark },

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

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function fmtDate(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

function statusBadgeStyle(status: Order["status"]) {
  if (status === "confirmed") return [s.statusBadge, s.statusConfirmed];
  if (status === "sent_to_workshop" || status === "in_production") return [s.statusBadge, s.statusProduction];
  if (status === "ready_for_delivery" || status === "delivered" || status === "installed" || status === "paid") return [s.statusBadge, s.statusReady];
  if (status === "cancelled") return [s.statusBadge, s.statusCancelled];
  return [s.statusBadge, s.statusClosed];
}

// ─── Props ────────────────────────────────────────────────────────────────────────
export interface OrderPDFProps {
  order: Order;
  items: OrderItem[];
  company: CompanySettings | null;
  client?: Client | null;
  formatCurrency: (n: number) => string;
  currencyCode: string;
}

// ─── Document ─────────────────────────────────────────────────────────────────────
export function OrderPDFDocument({
  order,
  items,
  company,
  client,
  formatCurrency,
  currencyCode,
}: OrderPDFProps) {
  const itemsSubtotal = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <Document
      title={`${order.orderNumber} — ${order.clientName}`}
      author={company?.name ?? "Rustic Alexanders"}
      creator="HEXCLOUD ERP"
    >
      <Page size="A4" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.header} fixed>
          {company?.logoUrl ? (
            <Image src={company.logoUrl} style={s.logo} />
          ) : (
            <Text style={s.companyNameFallback}>{company?.name ?? "Rustic Alexanders"}</Text>
          )}
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

        {/* ── CLIENT + ORDER META ── */}
        <View style={s.metaRow}>
          <View style={s.clientBlock}>
            <Text style={s.clientLabel}>Cliente</Text>
            <Text style={s.clientName}>{order.clientName}</Text>
            {(order.clientDocumentId || client?.documentId) && (
              <Text style={s.clientDetail}>RTN: {order.clientDocumentId ?? client?.documentId}</Text>
            )}
            {(order.clientAddress || client?.address) && (
              <Text style={s.clientDetail}>{order.clientAddress ?? client?.address}</Text>
            )}
            {(order.clientCity || order.clientDepartment || client?.city || client?.department) && (
              <Text style={s.clientDetail}>
                {[order.clientCity ?? client?.city, order.clientDepartment ?? client?.department].filter(Boolean).join(", ")}
              </Text>
            )}
            {order.clientPhone && <Text style={s.clientDetail}>{order.clientPhone}</Text>}
          </View>
          <View style={s.orderBlock}>
            <View style={s.orderNumberRow}>
              <Text style={s.orderLabel}>PEDIDO</Text>
              <Text style={s.orderNumber}>{order.orderNumber}</Text>
            </View>
            <Text style={s.orderMeta}>Fecha: {fmtDate(order.createdAt)}</Text>
            {order.promisedDeliveryDate && (
              <Text style={s.orderMeta}>Entrega prometida: {fmtDate(order.promisedDeliveryDate)}</Text>
            )}
            <Text style={s.orderMeta}>Tipo: {ORDER_PROJECT_TYPE_LABELS[order.projectType]}</Text>
            <Text style={statusBadgeStyle(order.status)}>
              {ORDER_STATUS_LABELS[order.status]}
            </Text>
          </View>
        </View>

        {/* ── TITLE / DESCRIPTION ── */}
        <View style={s.titleBlock}>
          <Text style={s.docTitle}>{order.title}</Text>
          {order.description && (
            <Text style={s.docDescription}>{order.description}</Text>
          )}
        </View>

        {/* ── ITEMS TABLE ── */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <View style={s.colDesc}><Text style={s.thText}>Descripción</Text></View>
            <View style={s.colQty}><Text style={s.thText}>Cant.</Text></View>
            <View style={s.colPrice}><Text style={s.thText}>PVP</Text></View>
            <View style={s.colTotal}><Text style={s.thText}>Subtotal</Text></View>
          </View>
          {items.map((item, i) => (
            <View key={item.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
              <View style={s.colDesc}>
                <Text style={s.itemDesc}>{item.description}</Text>
                {item.notes && <Text style={s.itemNotes}>{item.notes}</Text>}
              </View>
              <View style={s.colQty}><Text style={s.tdText}>{item.quantity}</Text></View>
              <View style={s.colPrice}><Text style={s.tdText}>{formatCurrency(item.unitPrice)}</Text></View>
              <View style={s.colTotal}><Text style={s.tdTotal}>{formatCurrency(item.total)}</Text></View>
            </View>
          ))}
        </View>

        {/* ── TOTALS ── */}
        <View style={s.totalsWrapper}>
          <View style={s.totalsBox}>
            {items.length > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Subtotal ítems</Text>
                <Text style={s.totalValue}>{formatCurrency(itemsSubtotal)}</Text>
              </View>
            )}
            <View style={s.totalFinalRow}>
              <Text style={s.totalFinalLabel}>Precio de venta</Text>
              <Text style={s.totalFinalValue}>{formatCurrency(order.finalSalePrice)}</Text>
            </View>
            {order.depositRequired > 0 && (
              <View style={s.depositRow}>
                <Text style={s.depositLabel}>Anticipo requerido</Text>
                <Text style={s.depositValue}>{formatCurrency(order.depositRequired)}</Text>
              </View>
            )}
            {order.depositPaid > 0 && (
              <View style={s.depositRow}>
                <Text style={s.depositLabel}>Anticipo recibido</Text>
                <Text style={s.depositValue}>{formatCurrency(order.depositPaid)}</Text>
              </View>
            )}
            {order.balanceDue > 0 && (
              <View style={s.balanceRow}>
                <Text style={s.balanceLabel}>Saldo pendiente</Text>
                <Text style={s.balanceValue}>{formatCurrency(order.balanceDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── DELIVERY ADDRESS ── */}
        {order.deliveryAddress && (
          <View style={s.deliveryBox}>
            <Text style={s.deliveryLabel}>Dirección de entrega / instalación</Text>
            <Text style={s.deliveryText}>{order.deliveryAddress}</Text>
          </View>
        )}

        {/* ── NOTES ── */}
        {order.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Notas</Text>
            <Text style={s.notesText}>{order.notes}</Text>
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
