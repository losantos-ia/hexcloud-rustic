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
        <div className="flex h-screen bg-zinc-950">
          <Sidebar />
          <DashboardShell>
            {/* Main content */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
          </DashboardShell>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
