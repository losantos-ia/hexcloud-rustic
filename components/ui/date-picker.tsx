"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface DatePickerProps {
  value?: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "dd/mm/aaaa", className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [viewDate, setViewDate] = useState<{ year: number; month: number }>(() => {
    if (value) {
      const parts = value.split("-");
      return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync inputText when value changes externally
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      setInputText(`${parts[2]}/${parts[1]}/${parts[0]}`);
      setViewDate({ year: parseInt(parts[0]), month: parseInt(parts[1]) - 1 });
    } else {
      setInputText("");
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleInputChange(text: string) {
    // Auto-insert slashes as user types
    let cleaned = text.replace(/[^\d/]/g, "");
    // Auto-add slashes
    if (text.length === 2 && inputText.length === 1) cleaned = cleaned + "/";
    if (text.length === 5 && inputText.length === 4) cleaned = cleaned + "/";
    setInputText(cleaned);

    const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const date = new Date(`${y}-${m}-${d}T00:00:00`);
      if (!isNaN(date.getTime())) {
        onChange(`${y}-${m}-${d}`);
        setViewDate({ year: parseInt(y), month: parseInt(m) - 1 });
      }
    } else if (cleaned === "") {
      onChange("");
    }
  }

  function handleDayClick(day: number) {
    const m = String(viewDate.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const y = String(viewDate.year);
    onChange(`${y}-${m}-${d}`);
    setInputText(`${d}/${m}/${y}`);
    setOpen(false);
  }

  function prevMonth() {
    setViewDate((v) => {
      if (v.month === 0) return { year: v.year - 1, month: 11 };
      return { ...v, month: v.month - 1 };
    });
  }

  function nextMonth() {
    setViewDate((v) => {
      if (v.month === 11) return { year: v.year + 1, month: 0 };
      return { ...v, month: v.month + 1 };
    });
  }

  // Build calendar grid (week starts Monday)
  const firstDayOfWeek = new Date(viewDate.year, viewDate.month, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7; // Convert Sun=0 to Mon=0
  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();

  const selectedParts = value ? value.split("-") : null;
  const selectedDay = selectedParts ? parseInt(selectedParts[2]) : null;
  const selectedMonth = selectedParts ? parseInt(selectedParts[1]) - 1 : null;
  const selectedYear = selectedParts ? parseInt(selectedParts[0]) : null;
  const isSelectedInView = selectedYear === viewDate.year && selectedMonth === viewDate.month;

  const today = new Date();
  const isTodayInView = today.getFullYear() === viewDate.year && today.getMonth() === viewDate.month;

  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={`relative ${className ?? ""}`} ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          maxLength={10}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-3 pr-9 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-2.5 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <CalendarDays size={15} />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4 w-72">
          {/* Month/year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="size-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-zinc-100 capitalize">
              {MONTHS_ES[viewDate.month]} {viewDate.year}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="size-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_ES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isSelected = isSelectedInView && day === selectedDay;
              const isToday = isTodayInView && day === today.getDate();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={[
                    "size-8 mx-auto rounded-md text-sm flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-amber-500 text-black font-semibold"
                      : isToday
                      ? "border border-amber-500/50 text-amber-400 hover:bg-zinc-800"
                      : "text-zinc-300 hover:bg-zinc-800",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setInputText("");
                setOpen(false);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                const m = String(t.getMonth() + 1).padStart(2, "0");
                const d = String(t.getDate()).padStart(2, "0");
                const y = String(t.getFullYear());
                onChange(`${y}-${m}-${d}`);
                setInputText(`${d}/${m}/${y}`);
                setViewDate({ year: t.getFullYear(), month: t.getMonth() });
                setOpen(false);
              }}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
