import { LucideIcon } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ModulePlaceholder({ title, description, icon: Icon }: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight font-[family:var(--font-heading)]">{title}</h1>
        <p className="text-sm text-zinc-400 mt-1">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-24 text-center">
        <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <Icon className="size-6 text-amber-400" />
        </div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
          Este módulo está en construcción. Las funcionalidades estarán disponibles próximamente.
        </p>
      </div>
    </div>
  );
}
