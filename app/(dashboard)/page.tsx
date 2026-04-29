import {
  Users,
  UserCheck,
  FileText,
  ShoppingCart,
  Factory,
  Package,
  Truck,
  Wrench,
  Store,
  DollarSign,
  BarChart2,
  Settings,
} from "lucide-react";

const modules = [
  { label: "CRM", href: "/crm", icon: UserCheck, description: "Pipeline de ventas y seguimiento" },
  { label: "Clientes", href: "/clientes", icon: Users, description: "Gestión de clientes y contactos" },
  { label: "Cotizaciones", href: "/cotizaciones", icon: FileText, description: "Cotizaciones y propuestas" },
  { label: "Pedidos", href: "/pedidos", icon: ShoppingCart, description: "Órdenes de venta" },
  { label: "Producción", href: "/produccion", icon: Factory, description: "Órdenes de fabricación" },
  { label: "Inventario", href: "/inventario", icon: Package, description: "Stock de materiales y productos" },
  { label: "Compras", href: "/compras", icon: Truck, description: "Proveedores y órdenes de compra" },
  { label: "Mantenimientos", href: "/mantenimientos", icon: Wrench, description: "Maquinaria y mantenimiento" },
  { label: "Tiendas", href: "/tiendas", icon: Store, description: "Puntos de venta y sucursales" },
  { label: "Finanzas", href: "/finanzas", icon: DollarSign, description: "Contabilidad y flujo de caja" },
  { label: "Reportes", href: "/reportes", icon: BarChart2, description: "Analítica y reportes" },
  { label: "Configuración", href: "/configuracion", icon: Settings, description: "Parámetros del sistema" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-tight font-[family:var(--font-heading)]">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Bienvenido a HEXCLOUD ERP · Rustic Alexanders
        </p>
      </div>

      {/* KPI placeholder row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["Pedidos activos", "Cotizaciones", "Clientes", "Por producir"].map(
          (kpi) => (
            <div
              key={kpi}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-1"
            >
              <p className="text-xs text-zinc-500">{kpi}</p>
              <p className="text-2xl font-semibold text-white">—</p>
            </div>
          )
        )}
      </div>

      {/* Modules grid */}
      <div>
        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">
          Módulos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map(({ label, href, icon: Icon, description }) => (
            <a
              key={href}
              href={href}
              className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-3 hover:border-amber-500/40 hover:bg-zinc-800/60 transition-all"
            >
              <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                <Icon className="size-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
