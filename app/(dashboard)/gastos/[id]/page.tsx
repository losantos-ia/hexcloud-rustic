"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Trash2, Receipt, MapPin, CreditCard, CalendarDays,
  Tag, User, Hash, FileText, Upload,
} from "lucide-react";
import { getExpenseById, deleteExpense } from "@/lib/firestore/expenses";
import type { Expense } from "@/types/expenses";
import { EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_METHOD_LABELS } from "@/types/expenses";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { useCurrency } from "@/context/currency-context";

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

  useEffect(() => {
    getExpenseById(id)
      .then((data) => {
        if (!data) setLoadError("Gasto no encontrado.");
        else setExpense(data);
      })
      .catch(() => setLoadError("Error al cargar el gasto."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteExpense(id);
      router.push("/gastos");
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
        <Link href="/gastos" className="text-xs text-amber-400 hover:text-amber-300">
          ← Volver a gastos
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
          <Link href="/gastos" className="text-zinc-400 hover:text-zinc-200 transition-colors">
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
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{expense.expenseNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/gastos/${id}/editar`}
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
                href={`/gastos/${id}/editar`}
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

          {/* Line items */}
          {expense.lineItems && expense.lineItems.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Ítems / Conceptos</p>
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
                  {expense.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 text-zinc-200">{item.description}</td>
                      <td className="px-3 py-2.5 text-right text-zinc-400 tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-zinc-400 font-mono tabular-nums">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right text-zinc-200 font-mono font-semibold tabular-nums">{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

          <p className="text-xs text-zinc-600 px-1">
            Creado: {expense.createdAt?.toLocaleDateString("es-ES") ?? "—"}
            {expense.updatedAt && ` · Actualizado: ${expense.updatedAt.toLocaleDateString("es-ES")}`}
          </p>
        </div>
      </div>
    </div>
  );
}
