"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Phone, Mail, ExternalLink, Package, Search, X, Upload, FileText, ImageIcon } from "lucide-react";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listSuppliers, getSupplier } from "@/lib/firestore/purchases";
import { listInventoryItems } from "@/lib/firestore/inventory";
import type { Supplier } from "@/types/purchases";
import type { InventoryItem } from "@/types/inventory";
import { SUPPLIER_CATEGORY_LABELS } from "@/types/purchases";
import { expenseSchema, type ExpenseFormValues } from "@/lib/schemas/expenses";
import { createExpense } from "@/lib/firestore/expenses";
import { listInventoryLocations } from "@/lib/firestore/inventory";
import type { InventoryLocation } from "@/types/inventory";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
} from "@/types/expenses";

const selectCls =
  "h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500";

const cellInputCls =
  "h-8 w-full bg-zinc-800 border border-zinc-700 rounded px-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 placeholder-zinc-600";

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function NuevoGastoPage() {
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  // Inventory search popup
  const [searchPopupIndex, setSearchPopupIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const supplierContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [receiptUploadProgress, setReceiptUploadProgress] = useState(0);

  async function handleFileSelect(file: File) {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setReceiptUploadError("Solo se aceptan PDF e imágenes (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceiptUploadError("El archivo no debe superar 10 MB.");
      return;
    }
    setReceiptFile(file);
    setReceiptUploadError(null);
    setReceiptUploadProgress(0);
    setReceiptPreview(URL.createObjectURL(file));
    setReceiptUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `expenses/receipts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const sRef = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(sRef, file);
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => setReceiptUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          (err) => { setReceiptUploadError("Error al subir el archivo."); reject(err); },
          () => resolve(),
        );
      });
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      setValue("receiptUrl", url);
    } catch {
      setReceiptUploadError("Error al subir el archivo. Intenta de nuevo.");
      setReceiptFile(null);
      setReceiptPreview(null);
    } finally {
      setReceiptUploading(false);
    }
  }

  function removeReceiptFile() {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptUploadError(null);
    setReceiptUploadProgress(0);
    setValue("receiptUrl", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    listInventoryLocations().then(setLocations);
    listSuppliers().then(setSuppliers);
    listInventoryItems().then(setInventoryItems);
  }, []);

  // Handle return from supplier creation page
  useEffect(() => {
    const supplierId = searchParams.get("supplierId");
    const supplierNameParam = searchParams.get("supplierName");
    if (supplierId) {
      getSupplier(supplierId).then((s) => {
        if (s) {
          setSelectedSupplier(s);
          setValue("supplierName", s.name);
        } else if (supplierNameParam) {
          setValue("supplierName", supplierNameParam);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: today,
      category: "other",
      paymentMethod: "cash",
      taxRate: 0,
      lineItems: [{ sku: "", inventoryItemId: "", description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  // Auto-compute amount from line items
  const lineItemsWatched = watch("lineItems") ?? [];
  const hasItems = fields.length > 0;
  const computedTotal = lineItemsWatched.reduce((sum, item) => {
    return sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0);
  }, 0);

  const [manualSubtotal, setManualSubtotal] = useState<number>(0);
  const taxRateWatched = Number(watch("taxRate") ?? 0);
  const subtotal = hasItems ? computedTotal : manualSubtotal;
  const taxAmount = subtotal * taxRateWatched / 100;
  const totalFinal = subtotal + taxAmount;

  useEffect(() => {
    setValue("amount", totalFinal || 0, { shouldValidate: false });
  }, [totalFinal, setValue]);

  function pickInventoryItem(index: number, item: InventoryItem) {
    setValue(`lineItems.${index}.sku`, item.sku ?? "");
    setValue(`lineItems.${index}.inventoryItemId`, item.id);
    setValue(`lineItems.${index}.description`, item.name);
    if (!(Number(lineItemsWatched[index]?.unitPrice) > 0)) {
      setValue(`lineItems.${index}.unitPrice`, item.lastPurchaseCost ?? item.averageCost);
    }
    setSearchPopupIndex(null);
    setSearchQuery("");
  }

  function handleSkuBlur(index: number, sku: string) {
    const trimmed = sku.trim().toUpperCase();
    if (!trimmed) {
      setValue(`lineItems.${index}.inventoryItemId`, "");
      return;
    }
    const found = inventoryItems.find(
      (it) => (it.sku ?? "").toUpperCase() === trimmed
    );
    if (found) {
      setValue(`lineItems.${index}.inventoryItemId`, found.id);
      if (!lineItemsWatched[index]?.description) {
        setValue(`lineItems.${index}.description`, found.name);
      }
      if (!(Number(lineItemsWatched[index]?.unitPrice) > 0)) {
        setValue(`lineItems.${index}.unitPrice`, found.lastPurchaseCost ?? found.averageCost);
      }
    } else {
      setValue(`lineItems.${index}.inventoryItemId`, "");
    }
  }

  // Supplier autocomplete
  const supplierName = watch("supplierName") ?? "";
  const filteredSuppliers = supplierName.trim()
    ? suppliers.filter((s) => s.name.toLowerCase().includes(supplierName.toLowerCase()))
    : suppliers;
  const exactMatch = suppliers.some(
    (s) => s.name.toLowerCase() === supplierName.trim().toLowerCase()
  );
  // Clear selected supplier card if user edits the name manually
  function handleSupplierInput(val: string) {
    setValue("supplierName", val);
    setSupplierOpen(true);
    if (selectedSupplier && val !== selectedSupplier.name) setSelectedSupplier(null);
  }
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (supplierContainerRef.current && !supplierContainerRef.current.contains(e.target as Node)) {
        setSupplierOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync location name
  const locationId = watch("locationId");
  useEffect(() => {
    const loc = locations.find((l) => l.id === locationId);
    if (loc) setValue("locationName", loc.name);
  }, [locationId, locations, setValue]);

  async function onSubmit(values: ExpenseFormValues) {
    setServerError(null);
    try {
      const id = await createExpense(values);
      router.push(`/gastos/${id}`);
    } catch {
      setServerError("Error al registrar el gasto. Inténtalo de nuevo.");
    }
  }

  return (
    <div>
      {/* Inventory search popup */}
      {searchPopupIndex !== null && (() => {
        const q = searchQuery.toLowerCase();
        const results = q.length > 0
          ? inventoryItems.filter(
              (it) =>
                it.name.toLowerCase().includes(q) ||
                (it.sku ?? "").toLowerCase().includes(q)
            )
          : inventoryItems;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) { setSearchPopupIndex(null); setSearchQuery(""); } }}
          >
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                <Search size={15} className="text-zinc-500 shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o código (SKU)…"
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => { setSearchPopupIndex(null); setSearchQuery(""); }}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              {/* Results */}
              <div className="overflow-y-auto flex-1">
                {results.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-zinc-600">Sin resultados</p>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={() => pickInventoryItem(searchPopupIndex, item)}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800 border-b border-zinc-800/60 last:border-0 transition-colors flex items-start gap-3"
                    >
                      <Package size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {item.sku && (
                            <span className="text-xs text-zinc-500 font-mono">{item.sku}</span>
                          )}
                          <span className="text-xs text-zinc-600">Costo: L {fmt(item.lastPurchaseCost ?? item.averageCost)}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col -mt-4 md:-mt-6"
      >
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-40 bg-zinc-950 border-b border-zinc-800 py-3 mb-4 flex items-center gap-4 -mx-4 md:-mx-6 px-4 md:px-6">
          <Link href="/gastos" className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-zinc-100">Registrar gasto</h1>
            <p className="text-xs text-zinc-500">Nuevo gasto operacional</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/gastos">
              <Button type="button" variant="outline" size="sm">Cancelar</Button>
            </Link>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Registrar gasto"}
            </Button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* LEFT: Archive panel */}
          <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 lg:sticky lg:top-[70px]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Archivo</p>
                {receiptFile && !receiptUploading && (
                  <button type="button" onClick={removeReceiptFile} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                    Eliminar archivo
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              {!receiptFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
                  className="flex flex-col items-center justify-center gap-4 cursor-pointer px-6 py-16 select-none hover:bg-zinc-800/40 group transition-colors"
                >
                  <div className="size-12 rounded-xl bg-zinc-800 group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                    <Upload size={20} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-zinc-400 font-medium">Selecciona o arrastra</p>
                    <p className="text-xs text-zinc-600 mt-0.5">un documento</p>
                  </div>
                  <span className="text-xs text-zinc-500 border border-zinc-700 rounded-md px-3 py-1 group-hover:border-zinc-600 group-hover:text-zinc-400 transition-colors">PDF, JPG, PNG · máx. 10 MB</span>
                </div>
              ) : (
                <>
                  {receiptPreview && (
                    receiptFile.type === "application/pdf" ? (
                      <iframe
                        src={receiptPreview}
                        className="w-full border-0 block"
                        style={{ height: "420px" }}
                        title="Vista previa"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={receiptPreview}
                        alt="Vista previa"
                        className="w-full object-contain bg-zinc-950 block"
                        style={{ maxHeight: "420px" }}
                      />
                    )
                  )}
                  <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-2">
                    {receiptFile.type === "application/pdf" ? (
                      <FileText size={14} className="text-zinc-500 shrink-0" />
                    ) : (
                      <ImageIcon size={14} className="text-zinc-500 shrink-0" />
                    )}
                    <p className="text-xs text-zinc-400 truncate flex-1">{receiptFile.name}</p>
                    {receiptUploading ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1 rounded-full bg-zinc-700 overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all" style={{ width: `${receiptUploadProgress}%` }} />
                        </div>
                        <span className="text-xs text-zinc-500">{receiptUploadProgress}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600 shrink-0">{(receiptFile.size / 1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </>
              )}
              {receiptUploadError && (
                <p className="text-xs text-red-400 px-4 pb-3">{receiptUploadError}</p>
              )}
            </div>
          </div>

          {/* RIGHT: Form card */}
          <div className="flex-1 min-w-0 rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">

          {/* Proveedor */}
          <div className="px-6 py-5 relative" ref={supplierContainerRef}>
            <label className="block text-xs text-zinc-400 mb-1.5">Proveedor / Pagado a</label>
            <input
              value={supplierName}
              onChange={(e) => handleSupplierInput(e.target.value)}
              onFocus={() => setSupplierOpen(true)}
              placeholder="Ej. ENEE, propietario, arrendador…"
              className="w-full bg-transparent text-lg text-zinc-100 placeholder-zinc-600 border-b border-zinc-700 focus:border-amber-500 focus:outline-none pb-1 transition-colors"
              autoComplete="off"
            />
            {errors.supplierName && (
              <p className="text-xs text-red-400 mt-1">{errors.supplierName.message}</p>
            )}
            {supplierOpen && (filteredSuppliers.length > 0 || (supplierName.trim().length > 0 && !exactMatch)) && (
              <div className="absolute left-6 right-6 z-50 mt-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden" style={{ maxHeight: "240px", overflowY: "auto" }}>
                {filteredSuppliers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={() => { setValue("supplierName", s.name); setSelectedSupplier(s); setSupplierOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.contactName && <span className="text-zinc-500 ml-2 text-xs">{s.contactName}</span>}
                  </button>
                ))}
                {supplierName.trim().length > 0 && !exactMatch && (
                  <Link
                    href={`/compras/proveedores/nuevo?returnTo=/gastos/nuevo&supplierName=${encodeURIComponent(supplierName.trim())}`}
                    className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-zinc-800 border-t border-zinc-800 transition-colors flex items-center gap-2"
                  >
                    <Plus size={12} />
                    Crear &quot;{supplierName.trim()}&quot; como nuevo proveedor
                  </Link>
                )}
              </div>
            )}
            {/* Supplier summary card */}
            {selectedSupplier && (
              <div className="mt-3 rounded-lg border border-zinc-700/60 bg-zinc-800/50 px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-zinc-300">{selectedSupplier.name}</span>
                    <span className="text-xs text-zinc-500 bg-zinc-700/50 rounded px-1.5 py-0.5">
                      {SUPPLIER_CATEGORY_LABELS[selectedSupplier.category]}
                    </span>
                  </div>
                  {selectedSupplier.contactName && (
                    <span className="text-xs text-zinc-500">{selectedSupplier.contactName}</span>
                  )}
                  <div className="flex items-center gap-3 flex-wrap mt-0.5">
                    {selectedSupplier.phone && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Phone size={10} />{selectedSupplier.phone}
                      </span>
                    )}
                    {selectedSupplier.email && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Mail size={10} />{selectedSupplier.email}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/compras/proveedores/${selectedSupplier.id}`}
                  className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors mt-0.5"
                  title="Ver proveedor"
                >
                  <ExternalLink size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Nº factura + fechas + categoría + método + ubicación */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Nº de factura / referencia" error={errors.invoiceNumber?.message}>
              <Input placeholder="FAC-001, RF-2026…" {...register("invoiceNumber")} />
            </Field>
            <Field label="Fecha de emisión *" error={errors.date?.message}>
              <DatePicker
                value={watch("date")}
                onChange={(v) => setValue("date", v, { shouldValidate: true })}
              />
            </Field>
            <Field label="Fecha de vencimiento" error={errors.dueDate?.message}>
              <DatePicker
                value={watch("dueDate") ?? ""}
                onChange={(v) => setValue("dueDate", v, { shouldValidate: true })}
              />
            </Field>
            <Field label="Categoría *" error={errors.category?.message}>
              <select {...register("category")} className={selectCls}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </Field>
            <Field label="Método de pago *" error={errors.paymentMethod?.message}>
              <select {...register("paymentMethod")} className={selectCls}>
                {EXPENSE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{EXPENSE_PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </Field>
            <Field label="Ubicación *" error={errors.locationId?.message}>
              <select {...register("locationId")} className={selectCls}>
                <option value="">Selecciona una ubicación…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Line items table ── */}
          <div className="px-6 py-5">
            <div className="mb-4">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Ítems / Conceptos</p>
            </div>

            {fields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left text-xs text-zinc-500 font-normal pb-2 pr-3 w-36">Código</th>
                      <th className="text-left text-xs text-zinc-500 font-normal pb-2 pr-3">Descripción</th>
                      <th className="text-right text-xs text-zinc-500 font-normal pb-2 px-3 w-28">Unidades</th>
                      <th className="text-right text-xs text-zinc-500 font-normal pb-2 px-3 w-32">Precio unit.</th>
                      <th className="text-right text-xs text-zinc-500 font-normal pb-2 pl-3 w-28">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const qty = Number(lineItemsWatched[index]?.quantity) || 0;
                      const price = Number(lineItemsWatched[index]?.unitPrice) || 0;
                      const rowTotal = qty * price;
                      return (
                        <tr key={field.id} className="border-b border-zinc-800/60 last:border-0">
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setSearchPopupIndex(index); setSearchQuery(""); }}
                                className="text-zinc-500 hover:text-amber-400 transition-colors shrink-0"
                                title="Buscar en inventario"
                              >
                                <Search size={13} />
                              </button>
                              <div className="relative flex-1">
                                <input
                                  {...register(`lineItems.${index}.sku`)}
                                  placeholder="SKU…"
                                  onBlur={(e) => handleSkuBlur(index, e.target.value)}
                                  className={`${cellInputCls} uppercase pr-6`}
                                />
                                {lineItemsWatched[index]?.inventoryItemId && (
                                  <Package size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-400" />
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              {...register(`lineItems.${index}.description`)}
                              placeholder="Descripción del ítem…"
                              className={cellInputCls}
                            />
                            {errors.lineItems?.[index]?.description && (
                              <p className="text-xs text-red-400 mt-0.5">
                                {errors.lineItems[index]?.description?.message}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                              className={`${cellInputCls} text-right`}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                              className={`${cellInputCls} text-right`}
                            />
                          </td>
                          <td className="py-2 pl-3 text-right text-sm text-zinc-200 font-mono tabular-nums whitespace-nowrap">
                            {fmt(rowTotal)}
                          </td>
                          <td className="py-2 pl-2">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-right text-xs text-zinc-500 pr-3">
                        Total
                      </td>
                      <td className="pt-3 text-right text-zinc-100 font-semibold font-mono tabular-nums">
                        {fmt(computedTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : null}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => append({ sku: "", inventoryItemId: "", description: "", quantity: 1, unitPrice: 0 })}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 rounded-md px-2.5 py-1.5 transition-colors"
              >
                <Plus size={12} /> Añadir ítem
              </button>
            </div>
          </div>

          {/* ── Impuesto + Resumen ── */}
          <div className="px-6 py-5 flex flex-col sm:flex-row gap-6 justify-between items-start border-t border-zinc-800">
            {/* Left: inputs */}
            <div className="flex flex-col gap-4 flex-1">
              {!hasItems && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Subtotal *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-sm font-mono">L</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={manualSubtotal || ""}
                      onChange={(e) => setManualSubtotal(Number(e.target.value) || 0)}
                      className="w-full bg-transparent text-xl font-bold text-zinc-100 placeholder-zinc-700 focus:outline-none"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Impuesto (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    {...register("taxRate", { valueAsNumber: true })}
                    className="w-24 h-9 bg-zinc-800 border border-zinc-700 rounded px-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-zinc-500 text-sm">%</span>
                </div>
              </div>
            </div>

            {/* Right: summary */}
            <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/30 px-5 py-4 w-full sm:w-64 flex flex-col gap-2 shrink-0">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span className="font-mono">L {fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-400">
                <span>ISV ({taxRateWatched}%)</span>
                <span className="font-mono">L {fmt(taxAmount)}</span>
              </div>
              <div className="h-px bg-zinc-700 my-1" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-zinc-200">Total</span>
                <span className="text-xl font-bold text-amber-400 font-mono">L {fmt(totalFinal)}</span>
              </div>
            </div>
          </div>

          </div>
        </div>

        {serverError && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mt-2">
            {serverError}
          </p>
        )}
      </form>
    </div>
  );
}
