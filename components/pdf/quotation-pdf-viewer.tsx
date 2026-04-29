"use client";

// This component must only be rendered on the client (no SSR).
// Import it with next/dynamic + ssr: false.
import { PDFViewer } from "@react-pdf/renderer";
import { QuotationPDFDocument } from "./quotation-pdf-document";
import type { QuotationPDFProps } from "./quotation-pdf-document";

export function QuotationPDFViewer(props: QuotationPDFProps) {
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: "none" }}>
      <QuotationPDFDocument {...props} />
    </PDFViewer>
  );
}
