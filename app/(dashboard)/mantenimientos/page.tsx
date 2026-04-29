import { Wrench } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function MantenimientosPage() {
  return (
    <ModulePlaceholder
      title="Mantenimientos"
      description="Gestión de maquinaria, mantenimiento preventivo y correctivo"
      icon={Wrench}
    />
  );
}
