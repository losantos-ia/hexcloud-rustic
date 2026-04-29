"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type CurrencyCode = "COP" | "HNL" | "USD";

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  country: string;
  locale: string;
  symbol: string;
  decimals: number;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  COP: { code: "COP", name: "Peso Colombiano", country: "Colombia", locale: "es-CO", symbol: "$", decimals: 0, flag: "🇨🇴" },
  HNL: { code: "HNL", name: "Lempira Hondureño", country: "Honduras", locale: "es-HN", symbol: "L", decimals: 2, flag: "🇭🇳" },
  USD: { code: "USD", name: "Dólar Estadounidense", country: "Estados Unidos", locale: "en-US", symbol: "$", decimals: 2, flag: "🇺🇸" },
};

const STORAGE_KEY = "ra-currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatCurrency: (amount: number) => string;
  formatCompact: (amount: number) => string;
  currencyConfig: CurrencyConfig;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "COP",
  setCurrency: () => {},
  formatCurrency: (n) => n.toString(),
  formatCompact: (n) => n.toString(),
  currencyConfig: CURRENCIES.COP,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("COP");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (stored && stored in CURRENCIES) {
        setCurrencyState(stored);
      }
    } catch {
      // localStorage not available (SSR guard)
    }
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
    setCurrencyState(code);
  }, []);

  const formatCurrency = useCallback(
    (amount: number): string => {
      const config = CURRENCIES[currency];
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.code,
        maximumFractionDigits: config.decimals,
      }).format(amount);
    },
    [currency]
  );

  const formatCompact = useCallback(
    (amount: number): string => {
      const config = CURRENCIES[currency];
      return new Intl.NumberFormat(config.locale, {
        style: "currency",
        currency: config.code,
        maximumFractionDigits: config.decimals,
        notation: "compact",
      }).format(amount);
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, formatCurrency, formatCompact, currencyConfig: CURRENCIES[currency] }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
