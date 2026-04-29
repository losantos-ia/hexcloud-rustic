import { Factory } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function ProduccionPage() {
  return (
    <ModulePlaceholder
      title="Producción"
      description="Órdenes de fabricación, procesos y control de calidad"
      icon={Factory}
    />
  );
}
