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
          <TopBar env="staging" />

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
    </AuthGuard>
  );
}
