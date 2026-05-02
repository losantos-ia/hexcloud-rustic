import { Sidebar } from "@/components/sidebar";
import { DashboardShell } from "@/components/dashboard-shell";
import { SidebarProvider } from "@/context/sidebar-context";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen bg-zinc-950">
          <Sidebar />
          <DashboardShell>
            {/* Environment banner — staging */}
            <div className="flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4">
              <span className="size-1.5 rounded-full bg-amber-400" />
              <p className="text-xs font-medium text-amber-400">
                Entorno de staging · ra-staging-ea1ba · Rustic Alexanders
              </p>
            </div>

            {/* Main content */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
          </DashboardShell>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
