"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserCurrency, updateUserCurrency } from "@/lib/firestore/users";

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

function readLocalCurrency(): CurrencyCode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    return v && v in CURRENCIES ? v : null;
  } catch {
    return null;
  }
}

function writeLocalCurrency(code: CurrencyCode) {
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
}

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
  const uidRef = useRef<string | null>(null);

  // On mount: load from localStorage immediately (no flicker while auth resolves)
  useEffect(() => {
    const local = readLocalCurrency();
    if (local) setCurrencyState(local);
  }, []);

  // Watch auth state — load Firestore preference when user signs in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        uidRef.current = firebaseUser.uid;
        try {
          const remote = await getUserCurrency(firebaseUser.uid) as CurrencyCode | null;
          if (remote && remote in CURRENCIES) {
            setCurrencyState(remote);
            writeLocalCurrency(remote);
          } else {
            // No remote preference yet — push local value to Firestore
            const local = readLocalCurrency();
            if (local) await updateUserCurrency(firebaseUser.uid, local);
          }
        } catch {
          // Firestore unavailable — keep localStorage value
        }
      } else {
        uidRef.current = null;
        // Signed out — fall back to localStorage
        const local = readLocalCurrency();
        if (local) setCurrencyState(local);
      }
    });
    return unsub;
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    writeLocalCurrency(code);
    if (uidRef.current) {
      updateUserCurrency(uidRef.current, code).catch(() => {});
    }
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

