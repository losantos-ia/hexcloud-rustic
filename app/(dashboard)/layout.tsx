import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-zinc-950">
        <Sidebar />
        {/* Content shifts right to account for sidebar width (64px collapsed / 256px expanded) */}
        <div className="flex flex-1 flex-col pl-64 transition-all duration-300 ease-in-out min-w-0">
          <TopBar env="production" />

          {/* Environment banner — production */}
          <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border-b border-emerald-500/20 py-1.5 px-4">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <p className="text-xs font-medium text-emerald-400">
              Entorno de producción · ra-produccion · Rustic Alexanders
            </p>
          </div>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
