import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-800 text-zinc-300 ring-zinc-700",
        amber:
          "bg-amber-500/10 text-amber-400 ring-amber-500/20",
        green:
          "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
        red:
          "bg-red-500/10 text-red-400 ring-red-500/20",
        blue:
          "bg-blue-500/10 text-blue-400 ring-blue-500/20",
        purple:
          "bg-purple-500/10 text-purple-400 ring-purple-500/20",
        pink:
          "bg-pink-500/10 text-pink-400 ring-pink-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
