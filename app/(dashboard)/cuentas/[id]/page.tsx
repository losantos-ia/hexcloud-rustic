"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Landmark, Wallet, Store, PiggyBank, TrendingUp, Circle,
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, SlidersHorizontal,
  Plus, Minus, Pencil, X, Trash2, Check,
} from "lucide-react";
import {
  getTreasuryAccountById,
  updateTreasuryAccount,
  listMovementsByAccount,
  listTreasuryAccounts,
  createTreasuryMovement,
  createTransferBetweenAccounts,
} from "@/lib/firestore/treasury";
import type {
  TreasuryAccount,
  TreasuryAccountType,
  TreasuryMovement,
  TreasuryMovementType,
} from "@/types/treasury";
import {
  TREASURY_ACCOUNT_TYPE_LABELS,
  TREASURY_ACCOUNT_TYPES,
  TREASURY_MOVEMENT_TYPE_LABELS,
} from "@/types/treasury";
import { useCurrency } from "@/context/currency-context";

// ── Icons ─────────────────────────────────────────────────

const TYPE_ICON: Record<TreasuryAccountType, React.ElementType> = {
  bank: Landmark,
  cash: Wallet,
  store_cash: Store,
  savings: PiggyBank,
  profits: TrendingUp,
  other: Circle,
};

const MOVEMENT_STYLE: Record<TreasuryMovementType, { color: string; bg: string; Icon: React.ElementType; sign: string }> = {
  income:       { color: "text-green-400", bg: "bg-green-500/10",  Icon: ArrowDownLeft,    sign: "+" },
  expense:      { color: "text-red-400",   bg: "bg-red-500/10",    Icon: ArrowUpRight,     sign: "−" },
  transfer_in:  { color: "text-blue-400",  bg: "bg-blue-500/10",   Icon: ArrowDownLeft,    sign: "+" },
  transfer_out: { color: "text-amber-400", bg: "bg-amber-500/10",  Icon: ArrowUpRight,     sign: "−" },
  adjustment:   { color: "text-zinc-400",  bg: "bg-zinc-700/40",   Icon: SlidersHorizontal, sign: "±" },
};

// ── Modal type ────────────────────────────────────────────

type ModalType = "income" | "expense" | "transfer" | "adjustment" | "edit" | null;

// ── Page ──────────────────────────────────────────────────

export default function TreasuryAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const [account, setAccount] = useState<TreasuryAccount | null>(null);
  const [movements, setMovements] = useState<TreasuryMovement[]>([]);
  const [allAccounts, setAllAccounts] = useState<TreasuryAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Movement form
  const [movAmount, setMovAmount] = useState("");
  const [movDate, setMovDate] = useState(today());
  const [movDesc, setMovDesc] = useState("");

  // Transfer form
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(today());
  const [transferNotes, setTransferNotes] = useState("");

  // Adjustment form
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDate, setAdjDate] = useState(today());
  const [adjDesc, setAdjDesc] = useState("");
  const [adjSign, setAdjSign] = useState<"positive" | "negative">("positive");

  // Edit form
  const [editForm, setEditForm] = useState({
    name: "", type: "bank" as TreasuryAccountType,
    bankName: "", accountNumber: "", notes: "",
  });

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [acc, movs, accs] = await Promise.all([
        getTreasuryAccountById(id),
        listMovementsByAccount(id),
        listTreasuryAccounts(),
      ]);
      if (!acc) { setLoadError("Cuenta no encontrada."); return; }
      setAccount(acc);
      setMovements(movs);
      setAllAccounts(accs.filter((a) => a.id !== id));
      setEditForm({
        name: acc.name,
        type: acc.type,
        bankName: acc.bankName ?? "",
        accountNumber: acc.accountNumber ?? "",
        notes: acc.notes ?? "",
      });
    } catch {
      setLoadError("Error al cargar la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function openModal(type: ModalType) {
    setModalError(null);
    setMovAmount(""); setMovDate(today()); setMovDesc("");
    setTransferTo(allAccounts[0]?.id ?? "");
    setTransferAmount(""); setTransferDate(today()); setTransferNotes("");
    setAdjAmount(""); setAdjDate(today()); setAdjDesc(""); setAdjSign("positive");
    setModal(type);
  }

  // ── Handlers ─────────────────────────────────────────────

  async function handleMovement(type: "income" | "expense") {
    const amount = parseFloat(movAmount);
    if (!movAmount || isNaN(amount) || amount <= 0) { setModalError("Ingresa un monto válido."); return; }
    if (!movDesc.trim()) { setModalError("Ingresa una descripción."); return; }
    setSaving(true); setModalError(null);
    try {
      await createTreasuryMovement({
        treasuryAccountId: id,
        type,
        amount,
        date: new Date(`${movDate}T12:00:00`),
        description: movDesc.trim(),
        referenceType: "manual",
      });
      setModal(null);
      await load();
    } catch { setModalError("Error al guardar. Inténtalo de nuevo."); }
    finally { setSaving(false); }
  }

  async function handleTransfer() {
    const amount = parseFloat(transferAmount);
    if (!transferAmount || isNaN(amount) || amount <= 0) { setModalError("Ingresa un monto válido."); return; }
    if (!transferTo) { setModalError("Selecciona la cuenta destino."); return; }
    setSaving(true); setModalError(null);
    try {
      await createTransferBetweenAccounts({
        fromAccountId: id,
        toAccountId: transferTo,
        amount,
        date: new Date(`${transferDate}T12:00:00`),
        notes: transferNotes.trim() || undefined,
      });
      setModal(null);
      await load();
    } catch { setModalError("Error al realizar la transferencia."); }
    finally { setSaving(false); }
  }

  async function handleAdjustment() {
    const rawAmount = parseFloat(adjAmount);
    if (!adjAmount || isNaN(rawAmount) || rawAmount <= 0) { setModalError("Ingresa un monto válido."); return; }
    if (!adjDesc.trim()) { setModalError("Ingresa una descripción."); return; }
    const amount = adjSign === "negative" ? -rawAmount : rawAmount;
    setSaving(true); setModalError(null);
    try {
      await createTreasuryMovement({
        treasuryAccountId: id,
        type: "adjustment",
        amount,
        date: new Date(`${adjDate}T12:00:00`),
        description: adjDesc.trim(),
        referenceType: "manual",
      });
      setModal(null);
      await load();
    } catch { setModalError("Error al guardar el ajuste."); }
    finally { setSaving(false); }
  }

  async function handleEdit() {
    if (!editForm.name.trim()) { setModalError("El nombre es obligatorio."); return; }
    setSaving(true); setModalError(null);
    try {
      await updateTreasuryAccount(id, {
        name: editForm.name.trim(),
        type: editForm.type,
        bankName: editForm.bankName.trim() || undefined,
        accountNumber: editForm.accountNumber.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      });
      setModal(null);
      await load();
    } catch { setModalError("Error al guardar."); }
    finally { setSaving(false); }
  }

  // ── Derived ───────────────────────────────────────────────

  const totalIn  = movements.filter((m) => m.type === "income" || m.type === "transfer_in").reduce((s, m) => s + m.amount, 0);
  const totalOut = movements.filter((m) => m.type === "expense" || m.type === "transfer_out").reduce((s, m) => s + Math.abs(m.amount), 0);

  // ── Render ────────────────────────────────────────────────

  if (loading) return <div className="text-center py-32 text-zinc-500 text-sm">Cargando…</div>;
  if (loadError || !account) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-500">
        <p className="text-sm">{loadError ?? "Cuenta no encontrada."}</p>
        <Link href="/cuentas" className="text-xs text-amber-400 hover:text-amber-300">← Volver a Tesorería</Link>
      </div>
    );
  }

  const Icon = TYPE_ICON[account.type];

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Link href="/cuentas" className="text-zinc-400 hover:text-zinc-200 transition-colors mt-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <Icon size={15} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-zinc-100">{account.name}</h1>
            <span className="text-xs text-zinc-500 bg-zinc-800 rounded-md px-2 py-0.5">
              {TREASURY_ACCOUNT_TYPE_LABELS[account.type]}
            </span>
          </div>
          {account.bankName && <p className="text-xs text-zinc-500 mt-1 ml-10">{account.bankName}{account.accountNumber && ` · ${account.accountNumber}`}</p>}
        </div>
        <button
          onClick={() => { setModalError(null); setModal("edit"); }}
          className="p-2 text-zinc-500 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors shrink-0"
          title="Editar cuenta"
        >
          <Pencil size={15} />
        </button>
      </div>

      {/* ── Balance card ── */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
        <p className="text-xs text-zinc-500 mb-1">Saldo actual</p>
        <p className={`text-4xl font-bold tabular-nums ${account.currentBalance < 0 ? "text-red-400" : "text-amber-400"}`}>
          {formatCurrency(account.currentBalance)}
        </p>
        {account.openingBalance !== account.currentBalance && (
          <p className="text-xs text-zinc-600 mt-1.5">
            Saldo inicial: {formatCurrency(account.openingBalance)}
          </p>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ActionBtn icon={<ArrowDownLeft size={15} />} label="Registrar ingreso" color="green" onClick={() => openModal("income")} />
        <ActionBtn icon={<ArrowUpRight size={15} />} label="Registrar gasto" color="red" onClick={() => openModal("expense")} />
        <ActionBtn icon={<ArrowLeftRight size={15} />} label="Transferir" color="blue" onClick={() => openModal("transfer")} />
        <ActionBtn icon={<SlidersHorizontal size={15} />} label="Ajustar saldo" color="zinc" onClick={() => openModal("adjustment")} />
      </div>

      {/* ── Summary row ── */}
      {movements.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 mb-1">Total entradas</p>
            <p className="text-lg font-bold text-green-400 tabular-nums">+{formatCurrency(totalIn)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500 mb-1">Total salidas</p>
            <p className="text-lg font-bold text-red-400 tabular-nums">−{formatCurrency(totalOut)}</p>
          </div>
        </div>
      )}

      {/* ── Movement history ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Historial de movimientos</p>
        </div>
        {movements.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-zinc-600">
            Sin movimientos registrados. Usa los botones de arriba para empezar.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {movements.map((m) => {
              const style = MOVEMENT_STYLE[m.type];
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`size-7 rounded-md flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                    <style.Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{m.description}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {TREASURY_MOVEMENT_TYPE_LABELS[m.type]} · {m.date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums shrink-0 ${style.color}`}>
                    {style.sign}{formatCurrency(Math.abs(m.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Income */}
      {modal === "income" && (
        <MovementModal
          title="Registrar ingreso"
          color="green"
          amount={movAmount} onAmount={setMovAmount}
          date={movDate} onDate={setMovDate}
          desc={movDesc} onDesc={setMovDesc}
          error={modalError}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={() => handleMovement("income")}
          descPlaceholder="Ej. Pago de cliente, depósito…"
        />
      )}

      {/* Expense */}
      {modal === "expense" && (
        <MovementModal
          title="Registrar gasto"
          color="red"
          amount={movAmount} onAmount={setMovAmount}
          date={movDate} onDate={setMovDate}
          desc={movDesc} onDesc={setMovDesc}
          error={modalError}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={() => handleMovement("expense")}
          descPlaceholder="Ej. Compra materiales, servicio…"
        />
      )}

      {/* Transfer */}
      {modal === "transfer" && (
        <ModalShell title="Transferir fondos" onClose={() => setModal(null)}>
          <div className="p-5 flex flex-col gap-4">
            <MField label="Cuenta destino">
              {allAccounts.length === 0 ? (
                <p className="text-xs text-zinc-500">No hay otras cuentas disponibles.</p>
              ) : (
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className={INPUT_CLS}
                >
                  <option value="">Seleccionar…</option>
                  {allAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </MField>
            <MField label="Monto *">
              <input type="number" min="0" step="0.01" value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00" className={INPUT_CLS + " font-mono"} />
            </MField>
            <MField label="Fecha *">
              <input type="date" value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className={INPUT_CLS} />
            </MField>
            <MField label="Notas">
              <input type="text" value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Opcional" className={INPUT_CLS} />
            </MField>
            {modalError && <p className="text-xs text-red-400">{modalError}</p>}
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={handleTransfer} saving={saving} label="Transferir" />
        </ModalShell>
      )}

      {/* Adjustment */}
      {modal === "adjustment" && (
        <ModalShell title="Ajustar saldo" onClose={() => setModal(null)}>
          <div className="p-5 flex flex-col gap-4">
            <MField label="Tipo de ajuste">
              <div className="flex gap-2">
                {(["positive", "negative"] as const).map((s) => (
                  <button key={s} onClick={() => setAdjSign(s)}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                      adjSign === s
                        ? s === "positive" ? "border-green-500/50 bg-green-500/10 text-green-400" : "border-red-500/50 bg-red-500/10 text-red-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {s === "positive" ? "+ Sumar" : "− Restar"}
                  </button>
                ))}
              </div>
            </MField>
            <MField label="Monto *">
              <input type="number" min="0" step="0.01" value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="0.00" className={INPUT_CLS + " font-mono"} />
            </MField>
            <MField label="Fecha *">
              <input type="date" value={adjDate}
                onChange={(e) => setAdjDate(e.target.value)}
                className={INPUT_CLS} />
            </MField>
            <MField label="Descripción *">
              <input type="text" value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
                placeholder="Motivo del ajuste…" className={INPUT_CLS} />
            </MField>
            {modalError && <p className="text-xs text-red-400">{modalError}</p>}
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={handleAdjustment} saving={saving} label="Aplicar ajuste" />
        </ModalShell>
      )}

      {/* Edit */}
      {modal === "edit" && (
        <ModalShell title="Editar cuenta" onClose={() => setModal(null)}>
          <div className="p-5 flex flex-col gap-4">
            <MField label="Nombre *">
              <input type="text" value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre de la cuenta" className={INPUT_CLS} />
            </MField>
            <MField label="Tipo *">
              <select value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as TreasuryAccountType }))}
                className={INPUT_CLS}
              >
                {TREASURY_ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{TREASURY_ACCOUNT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </MField>
            {editForm.type === "bank" && (
              <>
                <MField label="Banco">
                  <input type="text" value={editForm.bankName}
                    onChange={(e) => setEditForm((f) => ({ ...f, bankName: e.target.value }))}
                    placeholder="FICOHSA, BAC…" className={INPUT_CLS} />
                </MField>
                <MField label="Número de cuenta">
                  <input type="text" value={editForm.accountNumber}
                    onChange={(e) => setEditForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="0000-0000-0000" className={INPUT_CLS + " font-mono"} />
                </MField>
              </>
            )}
            <MField label="Notas">
              <input type="text" value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional" className={INPUT_CLS} />
            </MField>
            {modalError && <p className="text-xs text-red-400">{modalError}</p>}
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={handleEdit} saving={saving} label="Guardar cambios" />
        </ModalShell>
      )}
    </div>
  );
}

// ── Shared constants ──────────────────────────────────────

const INPUT_CLS =
  "bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors w-full";

// ── Shared components ─────────────────────────────────────

function ActionBtn({
  icon, label, color, onClick,
}: { icon: React.ReactNode; label: string; color: "green" | "red" | "blue" | "zinc"; onClick: () => void }) {
  const colors = {
    green: "border-green-500/30 hover:border-green-500/50 text-green-400 hover:bg-green-500/10",
    red:   "border-red-500/30   hover:border-red-500/50   text-red-400   hover:bg-red-500/10",
    blue:  "border-blue-500/30  hover:border-blue-500/50  text-blue-400  hover:bg-blue-500/10",
    zinc:  "border-zinc-700     hover:border-zinc-600      text-zinc-400  hover:bg-zinc-800",
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center text-xs font-medium transition-colors ${colors[color]}`}
    >
      {icon}
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({
  onClose, onSave, saving, label,
}: { onClose: () => void; onSave: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
      <button onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
      >
        {saving ? "Guardando…" : label}
      </button>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function MovementModal({
  title, color, amount, onAmount, date, onDate, desc, onDesc,
  error, saving, onClose, onSave, descPlaceholder,
}: {
  title: string; color: "green" | "red";
  amount: string; onAmount: (v: string) => void;
  date: string; onDate: (v: string) => void;
  desc: string; onDesc: (v: string) => void;
  error: string | null; saving: boolean;
  onClose: () => void; onSave: () => void;
  descPlaceholder?: string;
}) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="p-5 flex flex-col gap-4">
        <MField label="Monto *">
          <input type="number" min="0" step="0.01" value={amount}
            onChange={(e) => onAmount(e.target.value)}
            placeholder="0.00" className={INPUT_CLS + " font-mono"} />
        </MField>
        <MField label="Fecha *">
          <input type="date" value={date}
            onChange={(e) => onDate(e.target.value)}
            className={INPUT_CLS} />
        </MField>
        <MField label="Descripción *">
          <input type="text" value={desc}
            onChange={(e) => onDesc(e.target.value)}
            placeholder={descPlaceholder} className={INPUT_CLS} />
        </MField>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <ModalFooter onClose={onClose} onSave={onSave} saving={saving} label={title} />
    </ModalShell>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}
