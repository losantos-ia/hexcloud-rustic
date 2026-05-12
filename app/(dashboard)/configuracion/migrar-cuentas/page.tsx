"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { ArrowRight, CheckCircle2, XCircle, Loader2, Database } from "lucide-react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TreasuryAccountType } from "@/types/treasury";
import Link from "next/link";

// Old type → new type mapping
function mapType(old: string): TreasuryAccountType {
  if (old === "bank") return "bank";
  if (old === "cash") return "cash";
  if (old === "credit") return "bank"; // credit cards → bank
  return "other";
}

interface MigrationResult {
  name: string;
  oldType: string;
  newType: TreasuryAccountType;
  status: "ok" | "error";
  error?: string;
}

export default function MigrarCuentasPage() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<MigrationResult[]>([]);

  async function runMigration() {
    setRunning(true);
    setDone(false);
    setResults([]);

    const snap = await getDocs(
      query(collection(db, "accounts"), orderBy("name", "asc"))
    );

    const rows: MigrationResult[] = [];

    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const newType = mapType(data.type as string);
      try {
        await addDoc(collection(db, "treasuryAccounts"), {
          name: data.name,
          type: newType,
          bankName: data.bankName ?? null,
          accountNumber: data.accountNumber ?? null,
          currency: "HNL",
          openingBalance: 0,
          currentBalance: 0,
          isActive: true,
          notes: data.notes ?? null,
          createdAt: data.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        rows.push({ name: data.name as string, oldType: data.type as string, newType, status: "ok" });
      } catch (err) {
        rows.push({
          name: data.name as string,
          oldType: data.type as string,
          newType,
          status: "error",
          error: String(err),
        });
      }
    }

    setResults(rows);
    setDone(true);
    setRunning(false);
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const errors = results.filter((r) => r.status === "error").length;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Database size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Migrar cuentas a Tesorería</h1>
          <p className="text-xs text-zinc-500">
            Copia las cuentas antiguas al nuevo módulo de Tesorería
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3">
        <p className="text-sm text-zinc-300">
          Este proceso copia todas las cuentas de la colección antigua <code className="text-amber-400 bg-zinc-800 px-1 rounded">accounts</code> a la nueva colección{" "}
          <code className="text-amber-400 bg-zinc-800 px-1 rounded">treasuryAccounts</code>.
        </p>
        <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1">
          <li>El saldo inicial y saldo actual se establecen a <strong className="text-zinc-400">0</strong> — ajústalos manualmente desde Tesorería.</li>
          <li>Las cuentas de tipo <strong className="text-zinc-400">Crédito</strong> se migran como <strong className="text-zinc-400">Cuenta bancaria</strong>.</li>
          <li>Las cuentas antiguas <strong className="text-zinc-400">no se eliminan</strong>.</li>
          <li>Si ya ejecutaste la migración, se crearán duplicados — solo hazla una vez.</li>
        </ul>

        {!done && (
          <button
            onClick={runMigration}
            disabled={running}
            className="mt-2 flex items-center gap-2 self-start text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Migrando…
              </>
            ) : (
              <>
                Ejecutar migración <ArrowRight size={15} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100">Resultados</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-400">{ok} migradas</span>
              {errors > 0 && <span className="text-red-400">{errors} errores</span>}
            </div>
          </div>
          <div className="divide-y divide-zinc-800">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                {r.status === "ok" ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={16} className="text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{r.name}</p>
                  {r.error && <p className="text-xs text-red-400 truncate">{r.error}</p>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                  <span>{r.oldType}</span>
                  <ArrowRight size={11} />
                  <span className="text-zinc-400">{r.newType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="flex items-center gap-3">
          <Link
            href="/cuentas"
            className="text-sm font-medium bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg px-4 py-2 transition-colors"
          >
            Ir a Tesorería →
          </Link>
          <p className="text-xs text-zinc-500">
            Recuerda ajustar los saldos desde cada cuenta.
          </p>
        </div>
      )}
    </div>
  );
}
