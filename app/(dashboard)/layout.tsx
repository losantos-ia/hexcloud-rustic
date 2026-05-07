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
            <main className="flex-1 px-4 md:px-6 pb-4 md:pb-6 overflow-y-auto">{children}</main>
          </DashboardShell>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
