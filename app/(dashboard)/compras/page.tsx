import { Truck } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function ComprasPage() {
  return (
    <ModulePlaceholder
      title="Compras"
      description="Proveedores, órdenes de compra y recepción de mercancía"
      icon={Truck}
    />
  );
}
