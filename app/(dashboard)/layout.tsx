import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      {/* Content shifts right to account for sidebar width (64px collapsed / 256px expanded) */}
      <div className="flex flex-1 flex-col pl-64 transition-all duration-300 ease-in-out min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 shrink-0">
          <div className="flex flex-1 items-center justify-between">
            <div />
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                staging
              </span>
              <div className="size-8 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-zinc-950 font-bold text-xs">US</span>
              </div>
            </div>
          </div>
        </header>

        {/* Environment banner — staging only */}
        <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-xs font-medium text-amber-400">
            Entorno de staging · ra-staging-ea1ba · los cambios aquí no afectan producción
          </p>
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
