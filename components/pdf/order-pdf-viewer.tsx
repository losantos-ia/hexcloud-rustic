"use client";

// This component must only be rendered on the client (no SSR).
// Import it with next/dynamic + ssr: false.
import { PDFViewer } from "@react-pdf/renderer";
import { OrderPDFDocument } from "./order-pdf-document";
import type { OrderPDFProps } from "./order-pdf-document";

export function OrderPDFViewer(props: OrderPDFProps) {
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: "none" }}>
      <OrderPDFDocument {...props} />
    </PDFViewer>
  );
}
