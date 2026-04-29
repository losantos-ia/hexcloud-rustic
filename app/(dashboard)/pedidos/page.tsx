import { ShoppingCart } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function PedidosPage() {
  return (
    <ModulePlaceholder
      title="Pedidos"
      description="Órdenes de venta, estado de pedidos y entregas"
      icon={ShoppingCart}
    />
  );
}
