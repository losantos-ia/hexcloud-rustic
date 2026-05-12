"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Trash2, Receipt, MapPin, CreditCard, CalendarDays,
  Tag, User, Hash, FileText, Upload, Plus, X, Landmark, Wallet, Circle,
} from "lucide-react";
import { getExpenseById, deleteExpense } from "@/lib/firestore/expenses";
import type { Expense } from "@/types/expenses";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_METHOD_LABELS } from "@/types/expenses";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency-context";
import { listPaymentsByExpense, createExpensePayment, deleteExpensePayment } from "@/lib/firestore/expense-payments";
import { listAccounts } from "@/lib/firestore/accounts";
import type { ExpensePayment, Account, AccountType } from "@/types/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/types/accounts";

const ACCOUNT_ICON: Record<AccountType, React.ElementType> = {
  bank: Landmark,
  cash: Wallet,
  credit: CreditCard,
  other: Circle,
};

type BadgeVariant = BadgeProps["variant"];

const CATEGORY_VARIANT: Record<Expense["category"], BadgeVariant> = {
  electricity: "amber",
  water: "blue",
  rent: "purple",
  salaries: "green",
  fuel: "amber",
  internet: "blue",
  advertising: "pink",
  maintenance: "default",
  tools: "default",
  transport: "default",
  other: "default",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-800 last:border-0">
      <div className="text-zinc-500 mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <div className="text-sm text-zinc-200 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function isImage(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes("image%2F") || url.includes("image/");
}

export default function GastoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  // Payments state
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", accountId: "", notes: "" });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  async function loadPayments() {
    const [p, a] = await Promise.all([
      listPaymentsByExpense(id).catch(() => [] as ExpensePayment[]),
      listAccounts().catch(() => [] as Account[]),
    ]);
    setPayments(p);
    setAccounts(a);
  }

  async function handleAddPayment() {
    if (!paymentForm.amount || isNaN(Number(paymentForm.amount)) || Number(paymentForm.amount) <= 0) {
      setPaymentError("Ingresa un monto válido.");
      return;
    }
    if (!paymentForm.date) {
      setPaymentError("Selecciona la fecha del pago.");
      return;
    }
    if (!paymentForm.accountId) {
      setPaymentError("Selecciona la cuenta desde donde se debita.");
      return;
    }
    const account = accounts.find((a) => a.id === paymentForm.accountId);
    if (!account) return;
    setPaymentSaving(true);
    setPaymentError(null);
    try {
      await createExpensePayment({
        expenseId: id,
        amount: Number(paymentForm.amount),
        date: new Date(paymentForm.date),
        accountId: account.id,
        accountName: account.name,
        notes: paymentForm.notes.trim() || undefined,
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", date: "", accountId: "", notes: "" });
      await loadPayments();
    } catch {
      setPaymentError("Error al registrar el pago.");
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    setDeletingPaymentId(paymentId);
    try {
      await deleteExpensePayment(paymentId);
      setConfirmDeletePaymentId(null);
      await loadPayments();
    } finally {
      setDeletingPaymentId(null);
    }
  }

  useEffect(() => {
    getExpenseById(id)
      .then((data) => {
        if (!data) setLoadError("Gasto no encontrado.");
        else setExpense(data);
      })
      .catch(() => setLoadError("Error al cargar el gasto."))
      .finally(() => setLoading(false));
    loadPayments();
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteExpense(id);
      router.push("/compras");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-zinc-500 text-sm">
        Cargando…
      </div>
    );
  }

  if (loadError || !expense) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-500">
        <p className="text-sm">{loadError ?? "Gasto no encontrado."}</p>
        <Link href="/compras" className="text-xs text-amber-400 hover:text-amber-300">
          ← Volver a compras
        </Link>
      </div>
    );
  }

  const hasFile = !!expense.receiptUrl;
  const fileIsImage = hasFile && isImage(expense.receiptUrl!);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top bar ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/compras" className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-100">
                {expense.description || EXPENSE_CATEGORY_LABELS[expense.category]}
              </h1>
              <Badge variant={CATEGORY_VARIANT[expense.category]}>
                {EXPENSE_CATEGORY_LABELS[expense.category]}
              </Badge>
            </div>
            {(expense.invoiceNumber || expense.expenseNumber) && (
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{expense.invoiceNumber || expense.expenseNumber}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/compras/${id}/editar`}
            className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-zinc-100 border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Edit size={14} /> Editar
          </Link>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm text-red-300 bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} /> {deleting ? "Eliminando…" : "¿Confirmar?"}
            </button>
          )}
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* LEFT: File panel */}
        <div className="w-full lg:w-[55%] xl:w-[60%] shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden lg:sticky lg:top-[70px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Archivo</p>
            {hasFile && (
              <a
                href={expense.receiptUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Abrir en nueva pestaña ↗
              </a>
            )}
          </div>
          {hasFile ? (
            fileIsImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={expense.receiptUrl!}
                alt="Comprobante"
                className="w-full object-contain bg-zinc-950 block"
                style={{ minHeight: "400px", maxHeight: "80vh" }}
              />
            ) : (
              <iframe
                src={expense.receiptUrl!}
                title="Comprobante"
                className="w-full border-0 block"
                style={{ height: "80vh", minHeight: "500px" }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
              <div className="size-14 rounded-xl bg-zinc-800 flex items-center justify-center">
                <FileText size={24} className="text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Sin archivo adjunto</p>
                <p className="text-xs text-zinc-600 mt-0.5">Puedes añadir un comprobante editando este gasto</p>
              </div>
              <Link
                href={`/compras/${id}/editar`}
                className="flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-200 rounded-md px-3 py-1.5 transition-colors"
              >
                <Upload size={12} /> Subir archivo
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT: Summary panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Amount */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-3xl font-bold text-amber-400 mt-1 tabular-nums">{formatCurrency(expense.amount)}</p>
            </div>
            <Receipt size={28} className="text-amber-500/30" />
          </div>

          {/* ── Payments panel ── */}
          {(() => {
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const remaining = expense.amount - totalPaid;
            return (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Pagos</p>
                    {payments.length > 0 && (
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Pagado: <span className={remaining <= 0 ? "text-green-400" : "text-amber-400"}>{formatCurrency(totalPaid)}</span>
                        {remaining > 0 && <span className="text-zinc-600"> · Pendiente: {formatCurrency(remaining)}</span>}
                        {remaining <= 0 && <span className="text-green-400"> · Saldado</span>}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPaymentError(null);
                      setPaymentForm({
                        amount: "",
                        date: new Date().toISOString().split("T")[0],
                        accountId: accounts[0]?.id ?? "",
                        notes: "",
                      });
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-md px-2.5 py-1.5 transition-colors"
                  >
                    <Plus size={12} /> Registrar pago
                  </button>
                </div>

                {payments.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-zinc-600">Sin pagos registrados</div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {payments.map((p) => {
                      const AccIcon = ACCOUNT_ICON[accounts.find((a) => a.id === p.accountId)?.type ?? "other"];
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-7 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                              <AccIcon size={13} className="text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-200 tabular-nums">{formatCurrency(p.amount)}</p>
                              <p className="text-xs text-zinc-500 truncate">
                                {p.accountName} · {p.date.toLocaleDateString("es-ES")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {confirmDeletePaymentId === p.id ? (
                              <>
                                <button
                                  onClick={() => handleDeletePayment(p.id)}
                                  disabled={deletingPaymentId === p.id}
                                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                >
                                  {deletingPaymentId === p.id ? "…" : "Confirmar"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeletePaymentId(null)}
                                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800 transition-colors"
                                >
                                  <X size={12} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDeletePaymentId(p.id)}
                                className="text-zinc-600 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* General info */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-1">
            {expense.invoiceNumber && (
              <InfoRow
                icon={<Hash size={15} />}
                label="Nº de factura"
                value={<span className="font-mono">{expense.invoiceNumber}</span>}
              />
            )}
            <InfoRow
              icon={<CalendarDays size={15} />}
              label="Fecha de emisión"
              value={formatDate(expense.date)}
            />
            {expense.dueDate && (
              <InfoRow
                icon={<CalendarDays size={15} />}
                label="Fecha de vencimiento"
                value={formatDate(expense.dueDate)}
              />
            )}
            <InfoRow
              icon={<Tag size={15} />}
              label="Categoría"
              value={
                <Badge variant={CATEGORY_VARIANT[expense.category]}>
                  {EXPENSE_CATEGORY_LABELS[expense.category]}
                </Badge>
              }
            />
            <InfoRow
              icon={<MapPin size={15} />}
              label="Ubicación"
              value={expense.locationName ?? expense.locationId}
            />
            <InfoRow
              icon={<CreditCard size={15} />}
              label="Método de pago"
              value={EXPENSE_PAYMENT_METHOD_LABELS[expense.paymentMethod]}
            />
            {expense.supplierName && (
              <InfoRow
                icon={<User size={15} />}
                label="Proveedor / Pagado a"
                value={expense.supplierName}
              />
            )}
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 mb-2">Notas</p>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{expense.notes}</p>
            </div>
          )}

          {/* Line items — collapsible, at the bottom */}
          {expense.lineItems && expense.lineItems.length > 0 && (() => {
            const LIMIT = 3;
            const items = expense.lineItems!;
            const visible = itemsExpanded ? items : items.slice(0, LIMIT);
            const hasMore = items.length > LIMIT;
            return (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Ítems / Conceptos</p>
                  <span className="text-xs text-zinc-600">{items.length} {items.length === 1 ? "ítem" : "ítems"}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/40">
                      <th className="text-left text-xs text-zinc-500 font-normal px-4 py-2">Descripción</th>
                      <th className="text-right text-xs text-zinc-500 font-normal px-3 py-2 w-16">Ud.</th>
                      <th className="text-right text-xs text-zinc-500 font-normal px-3 py-2 w-28">P. unit.</th>
                      <th className="text-right text-xs text-zinc-500 font-normal px-4 py-2 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {visible.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-zinc-200">{item.description}</td>
                        <td className="px-3 py-2.5 text-right text-zinc-400 tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-zinc-400 font-mono tabular-nums">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-200 font-mono font-semibold tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMore && (
                  <button
                    onClick={() => setItemsExpanded((v) => !v)}
                    className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-2.5 border-t border-zinc-800 transition-colors"
                  >
                    {itemsExpanded ? "Mostrar menos ↑" : `Ver todos los ítems (${items.length}) ↓`}
                  </button>
                )}
              </div>
            );
          })()}

          <p className="text-xs text-zinc-600 px-1">
            Creado: {expense.createdAt?.toLocaleDateString("es-ES") ?? "—"}
            {expense.updatedAt && ` · Actualizado: ${expense.updatedAt.toLocaleDateString("es-ES")}`}
          </p>
        </div>
      </div>

      {/* ── Payment modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Registrar pago</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Monto *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Fecha *</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              {/* Account */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Cuenta *</label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No hay cuentas registradas.{" "}
                    <a href="/cuentas" className="text-amber-400 hover:text-amber-300 underline">Crear una cuenta</a>
                  </p>
                ) : (
                  <select
                    value={paymentForm.accountId}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, accountId: e.target.value }))}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="">Seleccionar cuenta…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({ACCOUNT_TYPE_LABELS[a.type]})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Notas</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              {paymentError && <p className="text-xs text-red-400">{paymentError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPayment}
                disabled={paymentSaving || accounts.length === 0}
                className="text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                {paymentSaving ? "Guardando…" : "Registrar pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

