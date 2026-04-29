"use client";

import { Settings, Check } from "lucide-react";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/context/currency-context";

export default function ConfiguracionPage() {
  const { currency, setCurrency, formatCurrency, currencyConfig } = useCurrency();

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
          <Settings size={16} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "var(--font-heading)" }}>
            Configuración
          </h1>
          <p className="text-xs text-zinc-500">Parámetros del sistema</p>
        </div>
      </div>

      {/* Currency section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Moneda del sistema</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Aplica a todos los módulos del ERP — cotizaciones, pedidos, finanzas y reportes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.values(CURRENCIES) as typeof CURRENCIES[CurrencyCode][]).map((cfg) => {
            const active = currency === cfg.code;
            return (
              <button
                key={cfg.code}
                type="button"
                onClick={() => setCurrency(cfg.code)}
                className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30"
                    : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                {active && (
                  <span className="absolute top-3 right-3 size-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check size={11} className="text-zinc-950" />
                  </span>
                )}
                <span className="text-2xl leading-none">{cfg.flag}</span>
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-amber-400" : "text-zinc-100"}`}>
                    {cfg.name}
                  </p>
                  <p className="text-xs text-zinc-500">{cfg.country} · {cfg.code}</p>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  {new Intl.NumberFormat(cfg.locale, { style: "currency", currency: cfg.code, maximumFractionDigits: cfg.decimals }).format(12500)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Live preview */}
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500">Vista previa</p>
            <p className="text-sm text-zinc-300 mt-0.5">
              Activo: <span className="font-semibold text-zinc-100">{currencyConfig.flag} {currencyConfig.name}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-amber-400">{formatCurrency(1250000)}</p>
            <p className="text-xs text-zinc-500">{formatCurrency(89990)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
