import { Package } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function InventarioPage() {
  return (
    <ModulePlaceholder
      title="Inventario"
      description="Stock de materiales, productos terminados y bodegas"
      icon={Package}
    />
  );
}
