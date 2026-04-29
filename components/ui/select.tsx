import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&>option]:bg-zinc-900",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
