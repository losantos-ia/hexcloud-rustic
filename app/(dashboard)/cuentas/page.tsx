"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Building2, Plus, Trash2, Pencil, Landmark, Wallet, CreditCard, Circle, X, Check,
} from "lucide-react";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/lib/firestore/accounts";
import type { Account, AccountType } from "@/types/accounts";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@/types/accounts";

const TYPE_ICON: Record<AccountType, React.ElementType> = {
  bank: Landmark,
  cash: Wallet,
  credit: CreditCard,
  other: Circle,
};

type FormState = {
  name: string;
  type: AccountType;
  bankName: string;
  accountNumber: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  type: "bank",
  bankName: "",
  accountNumber: "",
  notes: "",
};

export default function CuentasPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setAccounts(await listAccounts());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
      bankName: account.bankName ?? "",
      accountNumber: account.accountNumber ?? "",
      notes: account.notes ?? "",
    });
    setFormError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        bankName: form.bankName.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await updateAccount(editing.id, payload);
      } else {
        await createAccount(payload);
      }
      closeModal();
      await load();
    } catch {
      setFormError("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deleteAccount(id);
      setConfirmDeleteId(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Building2 size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Cuentas</h1>
            <p className="text-xs text-zinc-500">Cuentas bancarias y cajas de la empresa</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg px-4 py-2 transition-colors"
        >
          <Plus size={15} /> Nueva cuenta
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-zinc-500 text-sm">Cargando…</div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="size-14 rounded-xl bg-zinc-800 flex items-center justify-center">
            <Building2 size={24} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">No hay cuentas registradas</p>
            <p className="text-xs text-zinc-600 mt-1">Añade las cuentas bancarias y cajas de tu empresa</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg px-4 py-2 transition-colors"
          >
            <Plus size={14} /> Nueva cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {accounts.map((account) => {
            const Icon = TYPE_ICON[account.type];
            return (
              <div
                key={account.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{account.name}</p>
                      <p className="text-xs text-zinc-500">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(account)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    {confirmDeleteId === account.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(account.id)}
                          disabled={deleting}
                          className="p-1.5 text-red-400 hover:text-red-300 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(account.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                {(account.bankName || account.accountNumber) && (
                  <div className="text-xs text-zinc-500 space-y-0.5 pl-12">
                    {account.bankName && <p>{account.bankName}</p>}
                    {account.accountNumber && (
                      <p className="font-mono text-zinc-400">{account.accountNumber}</p>
                    )}
                  </div>
                )}
                {account.notes && (
                  <p className="text-xs text-zinc-600 pl-12 truncate">{account.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">
                {editing ? "Editar cuenta" : "Nueva cuenta"}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Nombre de la cuenta *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Banco Atlántida, Caja principal…"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Tipo *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Bank name */}
              {(form.type === "bank" || form.type === "credit") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400">Banco</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                    placeholder="Ej. Banco Atlántida, BAC…"
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              )}

              {/* Account number */}
              {form.type !== "cash" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400">
                    {form.type === "credit" ? "Últimos 4 dígitos" : "Número de cuenta"}
                  </label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    placeholder={form.type === "credit" ? "••••" : "0000-0000-0000"}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400">Notas</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Opcional"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
              <button
                onClick={closeModal}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
